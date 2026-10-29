export interface UserContact {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface ConversationParticipant {
  userId: UserContact;
  role?: string;
  joinedAt: string;
  lastReadAt?: string;
}

export interface ConversationItem {
  _id: string;
  schoolId: string;
  type: 'direct' | 'group' | 'class_channel';
  title?: string;
  directKey?: string;
  participants: ConversationParticipant[];
  createdBy?: UserContact;
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageItem {
  _id: string;
  schoolId: string;
  conversationId: string;
  senderId: UserContact;
  content: string;
  messageType: 'text' | 'system';
  attachments?: Array<{
    name: string;
    url: string;
    fileType: string;
    sizeBytes: number;
    storageKey?: string;
  }>;
  readBy: Array<{
    userId: string;
    readAt: string;
  }>;
  idempotencyKey?: string;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresenceEvent {
  userId: string;
  status: 'online' | 'offline';
  timestamp: string;
}
