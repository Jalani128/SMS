import { Router } from 'express';
import { authenticate, enforceSchoolContext, requireActiveSchool, } from '../../middlewares/auth.middleware.js';
import { listConversations, getConversationById, createOrGetConversation, listMessages, sendMessage, markConversationAsRead, editMessage, deleteMessage, listMessagingContacts, } from '../../controllers/messaging.controller.js';
const router = Router();
// Apply auth & tenant context to all messaging routes
router.use(authenticate);
router.use(enforceSchoolContext);
router.use(requireActiveSchool);
// Contacts discovery (accessible only to authorized roles within same school)
router.get('/contacts', listMessagingContacts);
router.get('/messaging-contacts', listMessagingContacts);
// Conversations
router.get('/', listConversations);
router.post('/', createOrGetConversation);
router.get('/:id', getConversationById);
// Messages in a conversation
router.get('/:id/messages', listMessages);
router.post('/:id/messages', sendMessage);
router.patch('/:id/read', markConversationAsRead);
// Individual message mutative operations
router.patch('/messages/:id', editMessage);
router.delete('/messages/:id', deleteMessage);
export default router;
