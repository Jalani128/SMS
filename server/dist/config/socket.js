import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from './env.js';
import { Conversation } from '../models/Conversation.model.js';
import { Message } from '../models/Message.model.js';
import { Notification } from '../models/Notification.model.js';
import { isParticipantInConversation } from '../utils/messaging.util.js';
import { logger } from '../utils/logger.js';
let ioInstance = null;
// Track active sessions per user: Map<userId, Set<socketId>>
const userSockets = new Map();
// Track message rate limits per socket: Map<socketId, number[]>
const socketMessageHistory = new Map();
/**
 * Checks if a specific user currently has at least one connected socket session
 */
export const isUserOnline = (userId) => {
    const set = userSockets.get(userId.toString());
    return set !== undefined && set.size > 0;
};
/**
 * Retrieves the count of active sessions for a user
 */
export const getUserActiveSessionCount = (userId) => {
    const set = userSockets.get(userId.toString());
    return set ? set.size : 0;
};
export const initSocketIO = (httpServer) => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin)
                    return callback(null, true);
                if (env.ALLOWED_ORIGINS.indexOf(origin) !== -1 || env.NODE_ENV === 'development') {
                    return callback(null, true);
                }
                return callback(new Error(`Origin ${origin} not allowed by CORS`));
            },
            credentials: true,
            methods: ['GET', 'POST'],
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });
    // =========================================================================
    // Socket.IO Handshake Authentication Middleware
    // =========================================================================
    io.use((socket, next) => {
        try {
            const authHeader = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization ||
                socket.handshake.query?.token;
            if (!authHeader || typeof authHeader !== 'string') {
                logger.warn(`[Socket.IO] Connection rejected: Missing token from ${socket.id}`);
                return next(new Error('Authentication error: Missing token'));
            }
            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7).trim()
                : authHeader.trim();
            const decoded = jwt.verify(token, env.JWT_SECRET);
            if (!decoded || !decoded.userId || !decoded.schoolId) {
                logger.warn(`[Socket.IO] Connection rejected: Invalid token payload from ${socket.id}`);
                return next(new Error('Authentication error: Invalid token'));
            }
            socket.user = {
                userId: decoded.userId,
                role: decoded.role || 'student',
                schoolId: decoded.schoolId,
                email: decoded.email,
            };
            next();
        }
        catch (err) {
            logger.warn(`[Socket.IO] Token verification failed: ${err.message}`);
            return next(new Error('Authentication error: Invalid or expired token'));
        }
    });
    // =========================================================================
    // Connection & Event Dispatcher
    // =========================================================================
    io.on('connection', (socket) => {
        const user = socket.user;
        if (!user) {
            socket.disconnect(true);
            return;
        }
        const { userId, schoolId, role } = user;
        logger.info(`[Socket.IO] Client connected: ${socket.id} (User: ${userId}, School: ${schoolId}, Role: ${role})`);
        // Track active connection sessions per user
        let userSocketSet = userSockets.get(userId);
        if (!userSocketSet) {
            userSocketSet = new Set();
            userSockets.set(userId, userSocketSet);
        }
        userSocketSet.add(socket.id);
        // Join tenant room and private user room
        socket.join(`school:${schoolId}`);
        socket.join(`user:${userId}`);
        // Broadcast online presence if first session
        if (userSocketSet.size === 1) {
            io.to(`school:${schoolId}`).emit('presence:update', {
                userId,
                status: 'online',
                timestamp: new Date().toISOString(),
            });
        }
        // -----------------------------------------------------------------------
        // Event: conversation:join
        // -----------------------------------------------------------------------
        socket.on('conversation:join', async (data, callback) => {
            try {
                const { conversationId } = data || {};
                if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
                    if (typeof callback === 'function')
                        callback({ success: false, error: 'Invalid conversationId' });
                    return;
                }
                const conversation = await Conversation.findOne({
                    _id: conversationId,
                    schoolId,
                    isArchived: false,
                });
                if (!conversation) {
                    if (typeof callback === 'function')
                        callback({ success: false, error: 'Conversation not found' });
                    return;
                }
                // Verify membership
                if (!isParticipantInConversation(conversation, userId)) {
                    logger.warn(`[Socket.IO] Unauthorized join attempt by ${userId} to conversation ${conversationId}`);
                    if (typeof callback === 'function')
                        callback({ success: false, error: 'Access denied' });
                    return;
                }
                socket.join(`conversation:${conversationId}`);
                logger.debug(`[Socket.IO] ${socket.id} (user: ${userId}) joined room conversation:${conversationId}`);
                if (typeof callback === 'function') {
                    callback({ success: true, conversationId });
                }
            }
            catch (err) {
                logger.error(`[Socket.IO] conversation:join error: ${err.message}`);
                if (typeof callback === 'function')
                    callback({ success: false, error: 'Failed to join' });
            }
        });
        // -----------------------------------------------------------------------
        // Event: conversation:leave
        // -----------------------------------------------------------------------
        socket.on('conversation:leave', (data) => {
            if (data?.conversationId) {
                socket.leave(`conversation:${data.conversationId}`);
            }
        });
        // -----------------------------------------------------------------------
        // Event: message:send
        // -----------------------------------------------------------------------
        socket.on('message:send', async (data, callback) => {
            try {
                // Socket-level rate throttling: max 10 messages per 5 seconds window
                const now = Date.now();
                const windowMs = 5000;
                const maxMessages = 10;
                const history = socketMessageHistory.get(socket.id) || [];
                const recentTimestamps = history.filter((t) => now - t < windowMs);
                if (recentTimestamps.length >= maxMessages) {
                    logger.warn(`[Socket.IO] Rate limit exceeded by socket ${socket.id} (user: ${userId})`);
                    socket.emit('message:error', { error: 'Rate limit exceeded. Please wait a moment before sending more messages.' });
                    if (typeof callback === 'function')
                        callback({ success: false, error: 'Rate limit exceeded' });
                    return;
                }
                recentTimestamps.push(now);
                socketMessageHistory.set(socket.id, recentTimestamps);
                const { conversationId, content, messageType = 'text', idempotencyKey, attachments } = data || {};
                if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
                    socket.emit('message:error', { error: 'Invalid conversationId' });
                    if (typeof callback === 'function')
                        callback({ success: false, error: 'Invalid conversationId' });
                    return;
                }
                if (!content || typeof content !== 'string' || !content.trim()) {
                    socket.emit('message:error', { error: 'Message content cannot be empty' });
                    if (typeof callback === 'function')
                        callback({ success: false, error: 'Empty content' });
                    return;
                }
                if (content.length > 5000) {
                    socket.emit('message:error', { error: 'Message exceeds 5000 character limit' });
                    if (typeof callback === 'function')
                        callback({ success: false, error: 'Content too long' });
                    return;
                }
                const conversation = await Conversation.findOne({
                    _id: conversationId,
                    schoolId,
                    isArchived: false,
                });
                if (!conversation || !isParticipantInConversation(conversation, userId)) {
                    socket.emit('message:error', { error: 'Not authorized for this conversation' });
                    if (typeof callback === 'function')
                        callback({ success: false, error: 'Forbidden' });
                    return;
                }
                // Idempotency check: prevent duplicate insertion on retry
                if (idempotencyKey) {
                    const existing = await Message.findOne({
                        schoolId,
                        conversationId,
                        idempotencyKey,
                    }).populate('senderId', '_id name email role avatar');
                    if (existing) {
                        if (typeof callback === 'function')
                            callback({ success: true, message: existing });
                        return;
                    }
                }
                // Persist message in MongoDB FIRST
                const message = await Message.create({
                    schoolId,
                    conversationId,
                    senderId: new Types.ObjectId(userId),
                    content: content.trim(),
                    messageType,
                    idempotencyKey,
                    attachments: attachments || [],
                    readBy: [{ userId: new Types.ObjectId(userId), readAt: new Date() }],
                });
                const populatedMessage = await Message.findById(message._id)
                    .populate('senderId', '_id name email role avatar')
                    .lean();
                // Update conversation lastMessage & lastMessageAt
                await Conversation.updateOne({ _id: conversationId }, {
                    $set: {
                        lastMessage: content.trim().slice(0, 150),
                        lastMessageAt: new Date(),
                    },
                });
                // Broadcast to conversation room
                io.to(`conversation:${conversationId}`).emit('message:new', populatedMessage);
                // Broadcast conversation list update to participants
                conversation.participants.forEach((p) => {
                    io.to(`user:${p.userId}`).emit('conversation:updated', {
                        conversationId,
                        lastMessage: content.trim().slice(0, 150),
                        lastMessageAt: new Date(),
                    });
                });
                // Acknowledge sender
                socket.emit('message:sent', populatedMessage);
                if (typeof callback === 'function') {
                    callback({ success: true, message: populatedMessage });
                }
                // Dispatch non-blocking in-app notification to offline participants
                try {
                    const otherParticipants = conversation.participants.filter((p) => p.userId.toString() !== userId);
                    for (const p of otherParticipants) {
                        if (!isUserOnline(p.userId)) {
                            await Notification.create({
                                schoolId,
                                recipientId: p.userId,
                                category: 'notice',
                                title: 'New Message',
                                content: `New message in ${conversation.title || 'chat'}: "${content.trim().slice(0, 50)}..."`,
                                priority: 'normal',
                                resourceType: 'conversation',
                                resourceId: conversation._id,
                            });
                        }
                    }
                }
                catch (notifErr) {
                    logger.warn('[Socket.IO] Notification dispatch failed:', notifErr);
                }
            }
            catch (err) {
                logger.error(`[Socket.IO] message:send error: ${err.message}`);
                socket.emit('message:error', { error: 'Failed to send message' });
                if (typeof callback === 'function')
                    callback({ success: false, error: err.message });
            }
        });
        // -----------------------------------------------------------------------
        // Event: message:read
        // -----------------------------------------------------------------------
        socket.on('message:read', async (data) => {
            try {
                const { conversationId } = data || {};
                if (!conversationId || !Types.ObjectId.isValid(conversationId))
                    return;
                const conversation = await Conversation.findOne({ _id: conversationId, schoolId });
                if (!conversation || !isParticipantInConversation(conversation, userId))
                    return;
                const now = new Date();
                const userObjId = new Types.ObjectId(userId);
                await Message.updateMany({
                    schoolId,
                    conversationId,
                    'readBy.userId': { $ne: userObjId },
                }, {
                    $push: {
                        readBy: {
                            userId: userObjId,
                            readAt: now,
                        },
                    },
                });
                await Conversation.updateOne({ _id: conversationId, 'participants.userId': userObjId }, { $set: { 'participants.$.lastReadAt': now } });
                io.to(`conversation:${conversationId}`).emit('message:read', {
                    conversationId,
                    userId,
                    readAt: now.toISOString(),
                });
            }
            catch (err) {
                logger.error(`[Socket.IO] message:read error: ${err.message}`);
            }
        });
        // -----------------------------------------------------------------------
        // Event: typing:start & typing:stop
        // -----------------------------------------------------------------------
        socket.on('typing:start', (data) => {
            if (data?.conversationId) {
                socket.to(`conversation:${data.conversationId}`).emit('typing:update', {
                    conversationId: data.conversationId,
                    userId,
                    isTyping: true,
                });
            }
        });
        socket.on('typing:stop', (data) => {
            if (data?.conversationId) {
                socket.to(`conversation:${data.conversationId}`).emit('typing:update', {
                    conversationId: data.conversationId,
                    userId,
                    isTyping: false,
                });
            }
        });
        // -----------------------------------------------------------------------
        // Disconnect Handler
        // -----------------------------------------------------------------------
        socket.on('disconnect', (reason) => {
            logger.info(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
            socketMessageHistory.delete(socket.id);
            const set = userSockets.get(userId);
            if (set) {
                set.delete(socket.id);
                if (set.size === 0) {
                    userSockets.delete(userId);
                    // Last session closed: emit offline status
                    io.to(`school:${schoolId}`).emit('presence:update', {
                        userId,
                        status: 'offline',
                        timestamp: new Date().toISOString(),
                    });
                }
            }
        });
    });
    ioInstance = io;
    logger.info('[Socket.IO] Real-time engine fully configured with auth & presence.');
    return io;
};
export const getIO = () => {
    if (!ioInstance) {
        throw new Error('Socket.IO has not been initialized. Call initSocketIO first.');
    }
    return ioInstance;
};
