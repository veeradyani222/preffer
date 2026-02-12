import express from 'express';
import AssistantController from '../controllers/assistant.controller';
import authenticate from '../middleware/authenticate';

const router = express.Router();

router.use(authenticate);

router.get('/context-options', AssistantController.getContextOptions);
router.get('/chats', AssistantController.getChats);
router.post('/chats', AssistantController.createChat);
router.get('/chats/:chatId/messages', AssistantController.getChatMessages);
router.post('/chats/:chatId/messages', AssistantController.sendMessage);
router.post('/chats/:chatId/approve', AssistantController.approvePendingProposal);
router.patch('/chats/:chatId/title', AssistantController.renameChat);

export default router;
