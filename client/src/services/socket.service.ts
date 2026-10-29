import { io, Socket } from 'socket.io-client';
import { MessageItem, TypingEvent, PresenceEvent } from '../types/messaging';

class SocketService {
  private socket: Socket | null = null;

  /**
   * Initializes and connects the Socket.IO client instance
   */
  public connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket && !this.socket.connected) {
      this.socket.connect();
      return this.socket;
    }

    const token = localStorage.getItem('edumanage_token') || 'demo-token';
    const schoolId = localStorage.getItem('edumanage_school_id') || 'school_demo_greenwood_001';

    // Socket server endpoint
    const socketUrl = import.meta.env.VITE_WS_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

    this.socket = io(socketUrl, {
      auth: { token, schoolId },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected to real-time engine:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[SocketService] Connection warning:', err.message);
    });

    return this.socket;
  }

  /**
   * Get active socket or initialize
   */
  public getSocket(): Socket {
    return this.socket || this.connect();
  }

  /**
   * Join a conversation room
   */
  public joinConversation(conversationId: string): void {
    const s = this.getSocket();
    s.emit('conversation:join', { conversationId });
  }

  /**
   * Leave a conversation room
   */
  public leaveConversation(conversationId: string): void {
    const s = this.getSocket();
    s.emit('conversation:leave', { conversationId });
  }

  /**
   * Send a real-time message
   */
  public sendMessage(payload: {
    conversationId: string;
    content: string;
    idempotencyKey?: string;
  }): Promise<MessageItem> {
    const s = this.getSocket();
    return new Promise((resolve, reject) => {
      s.emit('message:send', payload, (response: { success: boolean; message?: MessageItem; error?: string }) => {
        if (response?.success && response.message) {
          resolve(response.message);
        } else {
          reject(new Error(response?.error || 'Failed to send real-time message'));
        }
      });
    });
  }

  /**
   * Send read receipt
   */
  public markAsRead(conversationId: string): void {
    const s = this.getSocket();
    s.emit('message:read', { conversationId });
  }

  /**
   * Send typing indicators
   */
  public sendTypingStart(conversationId: string): void {
    const s = this.getSocket();
    s.emit('typing:start', { conversationId });
  }

  public sendTypingStop(conversationId: string): void {
    const s = this.getSocket();
    s.emit('typing:stop', { conversationId });
  }

  /**
   * Event Listeners with Cleanup Functions
   */
  public onNewMessage(callback: (msg: MessageItem) => void): () => void {
    const s = this.getSocket();
    s.on('message:new', callback);
    return () => s.off('message:new', callback);
  }

  public onMessageRead(callback: (event: { conversationId: string; userId: string; readAt: string }) => void): () => void {
    const s = this.getSocket();
    s.on('message:read', callback);
    return () => s.off('message:read', callback);
  }

  public onConversationUpdated(callback: (conv: any) => void): () => void {
    const s = this.getSocket();
    s.on('conversation:updated', callback);
    return () => s.off('conversation:updated', callback);
  }

  public onTypingUpdate(callback: (event: TypingEvent) => void): () => void {
    const s = this.getSocket();
    s.on('typing:update', callback);
    return () => s.off('typing:update', callback);
  }

  public onPresenceUpdate(callback: (event: PresenceEvent) => void): () => void {
    const s = this.getSocket();
    s.on('presence:update', callback);
    return () => s.off('presence:update', callback);
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
