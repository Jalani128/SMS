import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  MessageSquare,
  Search,
  Send,
  Plus,
  Check,
  CheckCheck,
  Clock,
  RotateCw,
  AlertCircle,
} from 'lucide-react';
import { messagingService } from '../../services/messaging.service';
import { socketService } from '../../services/socket.service';
import { useAuth } from '../../hooks/useAuth';
import {
  ConversationItem,
  MessageItem,
  UserContact,
  TypingEvent,
  PresenceEvent,
} from '../../types/messaging';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || 'user-me';

  // State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Search & input
  const [conversationSearch, setConversationSearch] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // New Chat Modal
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Typing & Presence
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Message list autoscroll
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // =========================================================================
  // Load Conversations & Contacts
  // =========================================================================
  const loadInitialData = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const [convs, conts] = await Promise.all([
        messagingService.getConversations(),
        messagingService.getAuthorizedContacts(),
      ]);
      setConversations(convs);
      setContacts(conts);
      if (convs.length > 0 && !activeConversation) {
        setActiveConversation(convs[0]);
      }
    } catch (err) {
      console.error('Failed to load messaging data:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [activeConversation]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // =========================================================================
  // Socket.IO Real-Time Subscriptions
  // =========================================================================
  useEffect(() => {
    socketService.connect();

    // Listen for new messages
    const unsubMsg = socketService.onNewMessage((newMsg: MessageItem) => {
      // If belongs to currently active conversation
      if (activeConversation && newMsg.conversationId === activeConversation._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        socketService.markAsRead(activeConversation._id);
        setTimeout(scrollToBottom, 50);
      }

      // Update conversation list preview & unread count
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === newMsg.conversationId) {
            const isSelf = (typeof newMsg.senderId === 'object' ? newMsg.senderId._id : newMsg.senderId) === currentUserId;
            const isCurrentChat = activeConversation?._id === c._id;
            return {
              ...c,
              lastMessage: newMsg.content,
              lastMessageAt: newMsg.createdAt,
              unreadCount: isCurrentChat || isSelf ? 0 : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        })
      );
    });

    // Listen for read receipts
    const unsubRead = socketService.onMessageRead((event) => {
      if (activeConversation && event.conversationId === activeConversation._id) {
        setMessages((prev) =>
          prev.map((m) => {
            if (!m.readBy.some((r) => r.userId === event.userId)) {
              return {
                ...m,
                readBy: [...m.readBy, { userId: event.userId, readAt: event.readAt }],
              };
            }
            return m;
          })
        );
      }
    });

    // Listen for typing indicators
    const unsubTyping = socketService.onTypingUpdate((event: TypingEvent) => {
      if (activeConversation && event.conversationId === activeConversation._id && event.userId !== currentUserId) {
        setIsOtherTyping(event.isTyping);
      }
    });

    // Listen for presence updates
    const unsubPresence = socketService.onPresenceUpdate((event: PresenceEvent) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (event.status === 'online') next.add(event.userId);
        else next.delete(event.userId);
        return next;
      });
    });

    return () => {
      unsubMsg();
      unsubRead();
      unsubTyping();
      unsubPresence();
    };
  }, [activeConversation, currentUserId]);

  // =========================================================================
  // Load Messages for Active Conversation
  // =========================================================================
  useEffect(() => {
    if (!activeConversation) return;

    setIsLoadingMessages(true);
    socketService.joinConversation(activeConversation._id);
    socketService.markAsRead(activeConversation._id);

    // Clear unread badge in state
    setConversations((prev) =>
      prev.map((c) => (c._id === activeConversation._id ? { ...c, unreadCount: 0 } : c))
    );

    messagingService
      .getMessages(activeConversation._id)
      .then((history) => {
        setMessages(history);
        setTimeout(scrollToBottom, 50);
      })
      .catch((err) => {
        console.error('Failed to load messages:', err);
      })
      .finally(() => {
        setIsLoadingMessages(false);
      });

    return () => {
      if (activeConversation) {
        socketService.leaveConversation(activeConversation._id);
      }
    };
  }, [activeConversation]);

  // =========================================================================
  // Typing Indicator Dispatcher
  // =========================================================================
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (!activeConversation) return;

    socketService.sendTypingStart(activeConversation._id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (activeConversation) {
        socketService.sendTypingStop(activeConversation._id);
      }
    }, 1500);
  };

  // =========================================================================
  // Send Message
  // =========================================================================
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversation || isSending) return;

    const content = messageInput.trim();
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setIsSending(true);
    setSendError(null);

    // Stop typing indicator immediately
    socketService.sendTypingStop(activeConversation._id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      // Send via Socket.IO real-time engine with REST fallback
      let sentMessage: MessageItem;
      try {
        sentMessage = await socketService.sendMessage({
          conversationId: activeConversation._id,
          content,
          idempotencyKey,
        });
      } catch {
        sentMessage = await messagingService.sendMessage(activeConversation._id, content, idempotencyKey);
      }

      setMessages((prev) => {
        if (prev.some((m) => m._id === sentMessage._id)) return prev;
        return [...prev, sentMessage];
      });

      setMessageInput('');
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      setSendError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Start new conversation from modal
  const handleStartConversation = async (contact: UserContact) => {
    try {
      const conv = await messagingService.createOrGetConversation(contact._id, contact.name);
      setConversations((prev) => {
        if (prev.some((c) => c._id === conv._id)) return prev;
        return [conv, ...prev];
      });
      setActiveConversation(conv);
      setIsNewChatOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to start conversation');
    }
  };

  // Helper to extract other participant in direct conversation
  const getOtherParticipant = (conv: ConversationItem): UserContact | null => {
    const other = conv.participants.find((p) => {
      const uId = typeof p.userId === 'object' && p.userId !== null ? p.userId._id : p.userId;
      return uId !== currentUserId;
    });
    return (other?.userId as UserContact) || null;
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!conversationSearch.trim()) return conversations;
    const q = conversationSearch.toLowerCase();
    return conversations.filter((c) => {
      const other = getOtherParticipant(c);
      const nameMatch = other?.name.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q);
      const msgMatch = c.lastMessage?.toLowerCase().includes(q);
      return nameMatch || msgMatch;
    });
  }, [conversations, conversationSearch, currentUserId]);

  // Filter contacts in new chat modal
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.role.toLowerCase().includes(q)
    );
  }, [contacts, contactSearch]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Real-Time Communications & Messaging"
        description="Encrypted, role-governed direct messaging and real-time announcements across faculty, students, parents, and administrative staff."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadInitialData} className="gap-1.5">
              <RotateCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <Button size="sm" onClick={() => setIsNewChatOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span>New Conversation</span>
            </Button>
          </div>
        }
      />

      {/* Main Split-Pane Messenger Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 rounded-xl border bg-card shadow-sm overflow-hidden h-[calc(100vh-250px)] min-h-[550px]">
        {/* Left Pane: Conversation List */}
        <div className="md:col-span-4 border-r flex flex-col bg-muted/10">
          {/* Search Box */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                className="pl-8 text-xs h-9 bg-background"
              />
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {isLoadingConversations ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <p>No conversations found</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewChatOpen(true)}
                  className="mt-3 text-xs"
                >
                  Start New Chat
                </Button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const isSelected = activeConversation?._id === conv._id;
                const isOnline = other ? onlineUserIds.has(other._id) : false;

                return (
                  <div
                    key={conv._id}
                    onClick={() => setActiveConversation(conv)}
                    className={`p-3 cursor-pointer transition-colors flex items-start gap-3 hover:bg-muted/40 ${
                      isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    {/* Avatar with Presence Indicator */}
                    <div className="relative shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {other?.name ? other.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background ${
                          isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                        }`}
                        title={isOnline ? 'Online' : 'Offline'}
                      />
                    </div>

                    {/* Metadata & Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-xs text-foreground truncate">
                          {other?.name || conv.title || 'Conversation'}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-1">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage || 'No messages yet'}
                        </p>
                        {Boolean(conv.unreadCount && conv.unreadCount > 0) && (
                          <span className="h-4 min-w-[16px] px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Message Thread */}
        <div className="md:col-span-8 flex flex-col h-full bg-background">
          {activeConversation ? (
            <>
              {/* Conversation Header */}
              {(() => {
                const other = getOtherParticipant(activeConversation);
                const isOnline = other ? onlineUserIds.has(other._id) : false;

                return (
                  <div className="p-3.5 border-b flex items-center justify-between bg-card/60 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {other?.name ? other.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background ${
                            isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-foreground">
                            {other?.name || activeConversation.title || 'Direct Chat'}
                          </h3>
                          {other?.role && (
                            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                              {other.role}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {isOnline ? (
                            <span className="text-emerald-600 font-medium">Active now</span>
                          ) : (
                            other?.email || 'Offline'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <span className="text-[10px] bg-muted px-2 py-1 rounded-md">Socket.IO Encrypted</span>
                    </div>
                  </div>
                );
              })()}

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5">
                {isLoadingMessages ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-12 w-2/3 rounded-xl" />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-semibold">No messages in this conversation yet</p>
                    <p className="text-xs mt-1">Send a message below to initiate dialogue.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const senderId =
                      typeof msg.senderId === 'object' && msg.senderId !== null ? msg.senderId._id : msg.senderId;
                    const isSelf = senderId === currentUserId;
                    const isRead = msg.readBy && msg.readBy.length > 1;

                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                            isSelf
                              ? 'bg-primary text-primary-foreground rounded-tr-none'
                              : 'bg-card text-foreground border rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                          <div
                            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                              isSelf ? 'text-primary-foreground/75' : 'text-muted-foreground'
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isSelf && (
                              <span>
                                {isRead ? (
                                  <span title="Read">
                                    <CheckCheck className="h-3 w-3 text-emerald-300" />
                                  </span>
                                ) : (
                                  <span title="Delivered">
                                    <Check className="h-3 w-3 opacity-75" />
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Live Typing Banner */}
                {isOtherTyping && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground italic animate-pulse">
                    <Clock className="h-3.5 w-3.5" />
                    <span>User is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Send Error Toast */}
              {sendError && (
                <div className="bg-destructive/10 border-t border-destructive/20 p-2 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              {/* Message Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 border-t bg-card flex items-center gap-2">
                <Input
                  placeholder="Type a secure message..."
                  value={messageInput}
                  onChange={handleInputChange}
                  disabled={isSending}
                  className="flex-1 text-xs h-10"
                />
                <Button type="submit" size="sm" disabled={!messageInput.trim() || isSending} className="gap-1.5 h-10 px-4">
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSending ? 'Sending...' : 'Send'}</span>
                </Button>
              </form>
            </>
          ) : (
            <EmptyState
              title="Select a conversation"
              description="Choose an existing thread on the left or start a new conversation with an authorized school contact."
              icon={MessageSquare}
              actionLabel="Start New Conversation"
              onAction={() => setIsNewChatOpen(true)}
            />
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      <Dialog
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        title="Start New Conversation"
        description="Select an authorized faculty, administrator, or parent contact according to school policy."
        className="max-w-md"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter contacts by name, email, or role..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y rounded-lg border">
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No authorized contacts found matching criteria.
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact._id}
                  onClick={() => handleStartConversation(contact)}
                  className="p-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{contact.name}</p>
                      <p className="text-[11px] text-muted-foreground">{contact.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {contact.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default MessagesPage;
