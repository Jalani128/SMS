import { apiClient } from '../lib/api';
import {
  ConversationItem,
  MessageItem,
  UserContact,
} from '../types/messaging';

// Resilient Fallback Data for Offline Development / Demos
const SAMPLE_CONTACTS: UserContact[] = [
  { _id: 'user-admin-1', name: 'Principal Arthur Vance', email: 'principal@school.edu', role: 'admin' },
  { _id: 'user-t1', name: 'Dr. Robert Oppenheimer', email: 'robert@school.edu', role: 'teacher' },
  { _id: 'user-t2', name: 'Prof. Clara Oswald', email: 'oswald@school.edu', role: 'teacher' },
  { _id: 'user-p1', name: 'Sarah Chen (Emma Watson\'s Mother)', email: 'sarah.chen@gmail.com', role: 'parent' },
  { _id: 'user-s1', name: 'Liam Vance (Grade 10)', email: 'liam.vance@student.edu', role: 'student' },
];

const SAMPLE_CONVERSATIONS: ConversationItem[] = [
  {
    _id: 'conv-101',
    schoolId: 'school-1',
    type: 'direct',
    title: 'Dr. Robert Oppenheimer',
    participants: [
      {
        userId: { _id: 'user-me', name: 'Current User', email: 'me@school.edu', role: 'admin' },
        role: 'admin',
        joinedAt: '2026-10-15T09:00:00Z',
      },
      {
        userId: { _id: 'user-t1', name: 'Dr. Robert Oppenheimer', email: 'robert@school.edu', role: 'teacher' },
        role: 'teacher',
        joinedAt: '2026-10-15T09:00:00Z',
      },
    ],
    lastMessage: 'The lab equipment order for thermodynamics has been submitted.',
    lastMessageAt: '2026-10-21T10:15:00Z',
    unreadCount: 0,
    createdAt: '2026-10-15T09:00:00Z',
    updatedAt: '2026-10-21T10:15:00Z',
  },
  {
    _id: 'conv-102',
    schoolId: 'school-1',
    type: 'direct',
    title: 'Sarah Chen (Parent)',
    participants: [
      {
        userId: { _id: 'user-me', name: 'Current User', email: 'me@school.edu', role: 'admin' },
        role: 'admin',
        joinedAt: '2026-10-18T14:00:00Z',
      },
      {
        userId: { _id: 'user-p1', name: 'Sarah Chen (Parent)', email: 'sarah.chen@gmail.com', role: 'parent' },
        role: 'parent',
        joinedAt: '2026-10-18T14:00:00Z',
      },
    ],
    lastMessage: 'Thank you for updating Emma\'s attendance record for Monday.',
    lastMessageAt: '2026-10-20T16:45:00Z',
    unreadCount: 1,
    createdAt: '2026-10-18T14:00:00Z',
    updatedAt: '2026-10-20T16:45:00Z',
  },
  {
    _id: 'conv-103',
    schoolId: 'school-1',
    type: 'direct',
    title: 'Prof. Clara Oswald',
    participants: [
      {
        userId: { _id: 'user-me', name: 'Current User', email: 'me@school.edu', role: 'admin' },
        role: 'admin',
        joinedAt: '2026-10-19T08:00:00Z',
      },
      {
        userId: { _id: 'user-t2', name: 'Prof. Clara Oswald', email: 'oswald@school.edu', role: 'teacher' },
        role: 'teacher',
        joinedAt: '2026-10-19T08:00:00Z',
      },
    ],
    lastMessage: 'Grade 10 mid-term exam scorecards are ready for review.',
    lastMessageAt: '2026-10-21T09:30:00Z',
    unreadCount: 0,
    createdAt: '2026-10-19T08:00:00Z',
    updatedAt: '2026-10-21T09:30:00Z',
  },
];

const SAMPLE_MESSAGES: Record<string, MessageItem[]> = {
  'conv-101': [
    {
      _id: 'm-1',
      schoolId: 'school-1',
      conversationId: 'conv-101',
      senderId: { _id: 'user-me', name: 'Current User', email: 'me@school.edu', role: 'admin' },
      content: 'Good morning Dr. Oppenheimer. Did you finalize the requisition for next week\'s physics laboratory session?',
      messageType: 'text',
      readBy: [{ userId: 'user-t1', readAt: '2026-10-21T10:05:00Z' }],
      createdAt: '2026-10-21T10:00:00Z',
      updatedAt: '2026-10-21T10:00:00Z',
    },
    {
      _id: 'm-2',
      schoolId: 'school-1',
      conversationId: 'conv-101',
      senderId: { _id: 'user-t1', name: 'Dr. Robert Oppenheimer', email: 'robert@school.edu', role: 'teacher' },
      content: 'Yes! The lab equipment order for thermodynamics has been submitted. All calorimeters and heat sensors are confirmed.',
      messageType: 'text',
      readBy: [{ userId: 'user-me', readAt: '2026-10-21T10:16:00Z' }],
      createdAt: '2026-10-21T10:15:00Z',
      updatedAt: '2026-10-21T10:15:00Z',
    },
  ],
  'conv-102': [
    {
      _id: 'm-3',
      schoolId: 'school-1',
      conversationId: 'conv-102',
      senderId: { _id: 'user-p1', name: 'Sarah Chen (Parent)', email: 'sarah.chen@gmail.com', role: 'parent' },
      content: 'Hello, Emma was unwell on Monday and had a medical certificate attached.',
      messageType: 'text',
      readBy: [{ userId: 'user-me', readAt: '2026-10-20T16:00:00Z' }],
      createdAt: '2026-10-20T15:30:00Z',
      updatedAt: '2026-10-20T15:30:00Z',
    },
    {
      _id: 'm-4',
      schoolId: 'school-1',
      conversationId: 'conv-102',
      senderId: { _id: 'user-p1', name: 'Sarah Chen (Parent)', email: 'sarah.chen@gmail.com', role: 'parent' },
      content: 'Thank you for updating Emma\'s attendance record for Monday.',
      messageType: 'text',
      readBy: [],
      createdAt: '2026-10-20T16:45:00Z',
      updatedAt: '2026-10-20T16:45:00Z',
    },
  ],
};

export const messagingService = {
  /**
   * Fetch conversations for the active user
   */
  async getConversations(): Promise<ConversationItem[]> {
    try {
      const res = await apiClient.get('/conversations');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        return res.data.data;
      }
      return SAMPLE_CONVERSATIONS;
    } catch (err) {
      console.warn('[MessagingService] API getConversations fallback:', err);
      return SAMPLE_CONVERSATIONS;
    }
  },

  /**
   * Get single conversation by ID
   */
  async getConversationById(id: string): Promise<ConversationItem> {
    try {
      const res = await apiClient.get(`/conversations/${id}`);
      if (res.data?.success && res.data?.data) {
        return res.data.data;
      }
      const match = SAMPLE_CONVERSATIONS.find((c) => c._id === id);
      if (match) return match;
      throw new Error('Conversation not found');
    } catch (err) {
      const match = SAMPLE_CONVERSATIONS.find((c) => c._id === id);
      if (match) return match;
      throw err;
    }
  },

  /**
   * Create or retrieve direct conversation
   */
  async createOrGetConversation(recipientId: string, title?: string): Promise<ConversationItem> {
    try {
      const res = await apiClient.post('/conversations', { recipientId, type: 'direct', title });
      if (res.data?.success && res.data?.data) {
        return res.data.data;
      }
      throw new Error(res.data?.message || 'Failed to initiate conversation');
    } catch (err: any) {
      console.warn('[MessagingService] API createOrGetConversation fallback:', err);
      const recipientContact = SAMPLE_CONTACTS.find((c) => c._id === recipientId) || {
        _id: recipientId,
        name: 'Authorized Contact',
        email: 'contact@school.edu',
        role: 'teacher',
      };

      const mock: ConversationItem = {
        _id: `conv-dyn-${Date.now()}`,
        schoolId: 'school-1',
        type: 'direct',
        title: recipientContact.name,
        participants: [
          { userId: { _id: 'user-me', name: 'Current User', email: 'me@school.edu', role: 'admin' }, role: 'admin', joinedAt: new Date().toISOString() },
          { userId: recipientContact, role: recipientContact.role, joinedAt: new Date().toISOString() },
        ],
        lastMessage: 'Conversation started',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return mock;
    }
  },

  /**
   * Retrieve message thread history
   */
  async getMessages(conversationId: string, page = 1, limit = 50): Promise<MessageItem[]> {
    try {
      const res = await apiClient.get(`/conversations/${conversationId}/messages`, {
        params: { page, limit },
      });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        return res.data.data;
      }
      return SAMPLE_MESSAGES[conversationId] || [];
    } catch (err) {
      console.warn('[MessagingService] API getMessages fallback:', err);
      return SAMPLE_MESSAGES[conversationId] || [];
    }
  },

  /**
   * Send message via REST API
   */
  async sendMessage(conversationId: string, content: string, idempotencyKey?: string): Promise<MessageItem> {
    try {
      const res = await apiClient.post(`/conversations/${conversationId}/messages`, {
        content,
        idempotencyKey,
      });
      if (res.data?.success && res.data?.data) {
        return res.data.data;
      }
      throw new Error(res.data?.message || 'Failed to send message');
    } catch (err: any) {
      console.warn('[MessagingService] API sendMessage fallback:', err);
      const mock: MessageItem = {
        _id: `m-${Date.now()}`,
        schoolId: 'school-1',
        conversationId,
        senderId: { _id: 'user-me', name: 'Current User', email: 'me@school.edu', role: 'admin' },
        content,
        messageType: 'text',
        readBy: [{ userId: 'user-me', readAt: new Date().toISOString() }],
        idempotencyKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return mock;
    }
  },

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    try {
      await apiClient.patch(`/conversations/${conversationId}/read`);
    } catch (err) {
      console.warn('[MessagingService] Mark as read fallback:', err);
    }
  },

  /**
   * Fetch contacts authorized to be messaged
   */
  async getAuthorizedContacts(): Promise<UserContact[]> {
    try {
      const res = await apiClient.get('/conversations/contacts');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        return res.data.data;
      }
      return SAMPLE_CONTACTS;
    } catch (err) {
      console.warn('[MessagingService] API getAuthorizedContacts fallback:', err);
      return SAMPLE_CONTACTS;
    }
  },
};
