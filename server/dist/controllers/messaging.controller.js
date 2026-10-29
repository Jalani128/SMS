import { Types } from 'mongoose';
import { Conversation, getDirectConversationKey } from '../models/Conversation.model.js';
import { Message } from '../models/Message.model.js';
import { User } from '../models/User.model.js';
import { Notification } from '../models/Notification.model.js';
import { canInitiateConversation, isParticipantInConversation, getAuthorizedContacts, } from '../utils/messaging.util.js';
import { createConversationSchema, sendMessageSchema, editMessageSchema, queryMessagesSchema, } from '../validations/messaging.validation.js';
import { getIO } from '../config/socket.js';
import { logger } from '../utils/logger.js';
const getContext = (req) => {
    const schoolIdStr = (req.schoolId || req.user?.schoolId);
    const userIdStr = req.user?.userId;
    return {
        schoolId: schoolIdStr ? new Types.ObjectId(schoolIdStr) : undefined,
        userId: userIdStr ? new Types.ObjectId(userIdStr) : undefined,
        role: req.user?.role,
        userEmail: req.user?.email,
    };
};
// ============================================================================
// 1. List Conversations for Authenticated User
// ============================================================================
export const listConversations = async (req, res) => {
    try {
        const { schoolId, userId } = getContext(req);
        if (!schoolId || !userId) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }
        const conversations = await Conversation.find({
            schoolId,
            'participants.userId': userId,
            isArchived: false,
        })
            .populate('participants.userId', '_id name email role avatar')
            .populate('createdBy', '_id name email')
            .sort({ lastMessageAt: -1 })
            .lean();
        // Compute unread message count for each conversation
        const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                schoolId,
                conversationId: conv._id,
                senderId: { $ne: userId },
                'readBy.userId': { $ne: userId },
                deletedAt: null,
            });
            return {
                ...conv,
                unreadCount,
            };
        }));
        res.json({
            success: true,
            data: conversationsWithUnread,
        });
    }
    catch (err) {
        logger.error(`[Messaging] listConversations error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to retrieve conversations' });
    }
};
// ============================================================================
// 2. Get Single Conversation by ID
// ============================================================================
export const getConversationById = async (req, res) => {
    try {
        const { schoolId, userId } = getContext(req);
        const id = String(req.params.id);
        if (!schoolId || !userId || !Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Valid conversation ID required' });
            return;
        }
        const conversation = await Conversation.findOne({ _id: id, schoolId })
            .populate('participants.userId', '_id name email role avatar')
            .populate('createdBy', '_id name email');
        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation not found' });
            return;
        }
        if (!isParticipantInConversation(conversation, userId)) {
            res.status(403).json({ success: false, message: 'Access denied to this conversation' });
            return;
        }
        res.json({
            success: true,
            data: conversation,
        });
    }
    catch (err) {
        logger.error(`[Messaging] getConversationById error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to retrieve conversation' });
    }
};
// ============================================================================
// 3. Create or Get Direct Conversation
// ============================================================================
export const createOrGetConversation = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        if (!schoolId || !userId || !role) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }
        const parsed = createConversationSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: parsed.error.issues[0]?.message || 'Invalid conversation payload',
            });
            return;
        }
        const { recipientId, type, title } = parsed.data;
        const recipientObjectId = new Types.ObjectId(recipientId);
        // Fetch recipient user profile
        const recipient = await User.findOne({ _id: recipientObjectId, schoolId, status: 'active' });
        if (!recipient) {
            res.status(404).json({ success: false, message: 'Recipient not found in this school' });
            return;
        }
        // Enforce role-based conversation authorization matrix
        const authCheck = await canInitiateConversation(schoolId, { _id: userId, role }, { _id: recipient._id, role: recipient.role, schoolId: recipient.schoolId });
        if (!authCheck.allowed) {
            res.status(403).json({
                success: false,
                message: authCheck.reason || 'You are not authorized to start a conversation with this user.',
            });
            return;
        }
        // Direct conversation deduplication via directKey
        if (type === 'direct') {
            const directKey = getDirectConversationKey(userId, recipientObjectId);
            let existing = await Conversation.findOne({ schoolId, directKey })
                .populate('participants.userId', '_id name email role avatar')
                .populate('createdBy', '_id name email');
            if (existing) {
                res.json({
                    success: true,
                    message: 'Existing conversation retrieved',
                    data: existing,
                });
                return;
            }
            // Create new direct conversation
            const newConv = await Conversation.create({
                schoolId,
                type: 'direct',
                directKey,
                title: title || undefined,
                createdBy: userId,
                participants: [
                    { userId, role, joinedAt: new Date() },
                    { userId: recipientObjectId, role: recipient.role, joinedAt: new Date() },
                ],
                lastMessage: 'Conversation started',
                lastMessageAt: new Date(),
            });
            const populated = await Conversation.findById(newConv._id)
                .populate('participants.userId', '_id name email role avatar')
                .populate('createdBy', '_id name email');
            // Notify recipient via Socket.IO if available
            try {
                const io = getIO();
                io.to(`user:${recipientObjectId}`).emit('conversation:updated', populated);
            }
            catch {
                // Socket.IO may not be initialized in headless test runner
            }
            res.status(201).json({
                success: true,
                message: 'Conversation created successfully',
                data: populated,
            });
            return;
        }
        // Fallback for group creation
        const newGroup = await Conversation.create({
            schoolId,
            type: type || 'group',
            title: title || 'Group Conversation',
            createdBy: userId,
            participants: [
                { userId, role, joinedAt: new Date() },
                { userId: recipientObjectId, role: recipient.role, joinedAt: new Date() },
            ],
            lastMessage: 'Group conversation created',
            lastMessageAt: new Date(),
        });
        const populatedGroup = await Conversation.findById(newGroup._id)
            .populate('participants.userId', '_id name email role avatar')
            .populate('createdBy', '_id name email');
        res.status(201).json({
            success: true,
            message: 'Group conversation created',
            data: populatedGroup,
        });
    }
    catch (err) {
        logger.error(`[Messaging] createOrGetConversation error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to create conversation' });
    }
};
// ============================================================================
// 4. Retrieve Paginated Messages for Conversation
// ============================================================================
export const listMessages = async (req, res) => {
    try {
        const { schoolId, userId } = getContext(req);
        const conversationId = String(req.params.id);
        if (!schoolId || !userId || !Types.ObjectId.isValid(conversationId)) {
            res.status(400).json({ success: false, message: 'Valid conversation ID required' });
            return;
        }
        const conversation = await Conversation.findOne({ _id: conversationId, schoolId });
        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation not found' });
            return;
        }
        if (!isParticipantInConversation(conversation, userId)) {
            res.status(403).json({ success: false, message: 'Not authorized to view messages in this conversation' });
            return;
        }
        const parsedQuery = queryMessagesSchema.safeParse(req.query);
        const { page, limit, before } = parsedQuery.success
            ? parsedQuery.data
            : { page: 1, limit: 50, before: undefined };
        const filter = {
            schoolId,
            conversationId: new Types.ObjectId(conversationId),
            deletedAt: null,
        };
        if (before) {
            filter.createdAt = { $lt: new Date(before) };
        }
        const total = await Message.countDocuments(filter);
        const messages = await Message.find(filter)
            .populate('senderId', '_id name email role avatar')
            .sort({ createdAt: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        res.json({
            success: true,
            data: messages,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    }
    catch (err) {
        logger.error(`[Messaging] listMessages error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to retrieve messages' });
    }
};
// ============================================================================
// 5. Send Message (REST API Fallback & Persistent Ingestion)
// ============================================================================
export const sendMessage = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        const conversationId = String(req.params.id);
        if (!schoolId || !userId || !Types.ObjectId.isValid(conversationId)) {
            res.status(400).json({ success: false, message: 'Valid conversation ID required' });
            return;
        }
        const conversation = await Conversation.findOne({ _id: conversationId, schoolId });
        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation not found' });
            return;
        }
        if (!isParticipantInConversation(conversation, userId)) {
            res.status(403).json({ success: false, message: 'Not authorized to send messages in this conversation' });
            return;
        }
        const parsed = sendMessageSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: parsed.error.issues[0]?.message || 'Invalid message payload',
            });
            return;
        }
        const { content, messageType, idempotencyKey, attachments } = parsed.data;
        // Idempotency check: prevent duplicate message on retry
        if (idempotencyKey) {
            const existingMessage = await Message.findOne({
                schoolId,
                conversationId,
                idempotencyKey,
            }).populate('senderId', '_id name email role avatar');
            if (existingMessage) {
                res.status(200).json({
                    success: true,
                    message: 'Message already delivered (idempotent)',
                    data: existingMessage,
                });
                return;
            }
        }
        // Persist to MongoDB FIRST before emitting socket events
        const message = await Message.create({
            schoolId,
            conversationId,
            senderId: userId,
            content,
            messageType,
            idempotencyKey,
            attachments: attachments || [],
            readBy: [{ userId, readAt: new Date() }],
        });
        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', '_id name email role avatar')
            .lean();
        // Update conversation lastMessage & lastMessageAt
        await Conversation.updateOne({ _id: conversationId }, {
            $set: {
                lastMessage: content.slice(0, 150),
                lastMessageAt: new Date(),
            },
        });
        // Emit real-time Socket.IO event to conversation room
        try {
            const io = getIO();
            io.to(`conversation:${conversationId}`).emit('message:new', populatedMessage);
            // Also trigger conversation list update for all participants
            conversation.participants.forEach((p) => {
                io.to(`user:${p.userId}`).emit('conversation:updated', {
                    conversationId,
                    lastMessage: content.slice(0, 150),
                    lastMessageAt: new Date(),
                });
            });
        }
        catch {
            // In-memory or offline fallback
        }
        // Non-blocking in-app notification dispatch for other participants
        try {
            const otherParticipants = conversation.participants.filter((p) => p.userId.toString() !== userId.toString());
            for (const p of otherParticipants) {
                await Notification.create({
                    schoolId,
                    recipientId: p.userId,
                    category: 'notice',
                    title: 'New Message Received',
                    content: `You received a new message in conversation "${conversation.title || 'Direct Chat'}"`,
                    priority: 'normal',
                    resourceType: 'conversation',
                    resourceId: conversation._id,
                });
            }
        }
        catch (notifErr) {
            logger.warn('[Messaging] Non-blocking notification dispatch failed:', notifErr);
        }
        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: populatedMessage,
        });
    }
    catch (err) {
        logger.error(`[Messaging] sendMessage error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
};
// ============================================================================
// 6. Mark Conversation as Read
// ============================================================================
export const markConversationAsRead = async (req, res) => {
    try {
        const { schoolId, userId } = getContext(req);
        const conversationId = String(req.params.id);
        if (!schoolId || !userId || !Types.ObjectId.isValid(conversationId)) {
            res.status(400).json({ success: false, message: 'Valid conversation ID required' });
            return;
        }
        const conversation = await Conversation.findOne({ _id: conversationId, schoolId });
        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation not found' });
            return;
        }
        if (!isParticipantInConversation(conversation, userId)) {
            res.status(403).json({ success: false, message: 'Not authorized for this conversation' });
            return;
        }
        const now = new Date();
        // Add read receipt to all unread messages in conversation
        await Message.updateMany({
            schoolId,
            conversationId,
            'readBy.userId': { $ne: userId },
        }, {
            $push: {
                readBy: {
                    userId,
                    readAt: now,
                },
            },
        });
        // Update lastReadAt on conversation participant
        await Conversation.updateOne({ _id: conversationId, 'participants.userId': userId }, { $set: { 'participants.$.lastReadAt': now } });
        // Emit Socket.IO read event
        try {
            const io = getIO();
            io.to(`conversation:${conversationId}`).emit('message:read', {
                conversationId,
                userId: userId.toString(),
                readAt: now.toISOString(),
            });
        }
        catch {
            // Offline fallback
        }
        res.json({
            success: true,
            message: 'Conversation marked as read',
            data: { conversationId, readAt: now },
        });
    }
    catch (err) {
        logger.error(`[Messaging] markConversationAsRead error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to mark conversation as read' });
    }
};
// ============================================================================
// 7. Edit Message
// ============================================================================
export const editMessage = async (req, res) => {
    try {
        const { schoolId, userId } = getContext(req);
        const messageId = String(req.params.id);
        if (!schoolId || !userId || !Types.ObjectId.isValid(messageId)) {
            res.status(400).json({ success: false, message: 'Valid message ID required' });
            return;
        }
        const message = await Message.findOne({ _id: messageId, schoolId, deletedAt: null });
        if (!message) {
            res.status(404).json({ success: false, message: 'Message not found' });
            return;
        }
        // Only original sender can edit
        if (message.senderId.toString() !== userId.toString()) {
            res.status(403).json({ success: false, message: 'You can only edit your own messages' });
            return;
        }
        const parsed = editMessageSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid edit content' });
            return;
        }
        message.content = parsed.data.content;
        message.editedAt = new Date();
        await message.save();
        const populated = await Message.findById(message._id)
            .populate('senderId', '_id name email role avatar')
            .lean();
        try {
            const io = getIO();
            io.to(`conversation:${message.conversationId}`).emit('message:updated', populated);
        }
        catch { }
        res.json({
            success: true,
            message: 'Message edited successfully',
            data: populated,
        });
    }
    catch (err) {
        logger.error(`[Messaging] editMessage error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to edit message' });
    }
};
// ============================================================================
// 8. Delete (Soft-Delete) Message
// ============================================================================
export const deleteMessage = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        const messageId = String(req.params.id);
        if (!schoolId || !userId || !Types.ObjectId.isValid(messageId)) {
            res.status(400).json({ success: false, message: 'Valid message ID required' });
            return;
        }
        const message = await Message.findOne({ _id: messageId, schoolId });
        if (!message) {
            res.status(404).json({ success: false, message: 'Message not found' });
            return;
        }
        // Only sender or admin can delete
        const isSender = message.senderId.toString() === userId.toString();
        const isAdmin = role === 'admin' || role === 'super_admin';
        if (!isSender && !isAdmin) {
            res.status(403).json({ success: false, message: 'You are not authorized to delete this message' });
            return;
        }
        message.deletedAt = new Date();
        message.content = 'This message was deleted';
        await message.save();
        try {
            const io = getIO();
            io.to(`conversation:${message.conversationId}`).emit('message:deleted', {
                messageId: message._id,
                conversationId: message.conversationId,
            });
        }
        catch { }
        res.json({
            success: true,
            message: 'Message deleted successfully',
            data: { messageId: message._id },
        });
    }
    catch (err) {
        logger.error(`[Messaging] deleteMessage error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to delete message' });
    }
};
// ============================================================================
// 9. List Authorized Messaging Contacts
// ============================================================================
export const listMessagingContacts = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        if (!schoolId || !userId || !role) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }
        const contacts = await getAuthorizedContacts(schoolId, { _id: userId, role });
        res.json({
            success: true,
            data: contacts,
        });
    }
    catch (err) {
        logger.error(`[Messaging] listMessagingContacts error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Failed to retrieve contacts' });
    }
};
