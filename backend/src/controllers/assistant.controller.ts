import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import AssistantChatService, { AssistantContextType } from '../services/assistant-chat.service';

class AssistantController {
    static async getContextOptions(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const data = await AssistantChatService.getContextOptions(userId);
            return res.json(data);
        } catch (error) {
            console.error('Get assistant context options error:', error);
            return res.status(500).json({ error: 'Failed to load context options' });
        }
    }

    static async getChats(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const chats = await AssistantChatService.getChats(userId);
            return res.json(chats);
        } catch (error) {
            console.error('Get assistant chats error:', error);
            return res.status(500).json({ error: 'Failed to load chats' });
        }
    }

    static async createChat(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { contextType, portfolioId, title } = req.body as {
                contextType?: AssistantContextType;
                portfolioId?: string;
                title?: string;
            };

            if (!contextType || !['portfolio', 'ai_manager'].includes(contextType)) {
                return res.status(400).json({ error: 'contextType must be portfolio or ai_manager' });
            }

            if (!portfolioId) {
                return res.status(400).json({ error: 'portfolioId is required' });
            }

            const result = await AssistantChatService.createChat(userId, contextType, portfolioId, title);
            return res.status(201).json(result);
        } catch (error: any) {
            console.error('Create assistant chat error:', error);
            if (error?.message?.includes('not found') || error?.message?.includes('does not have')) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to create chat' });
        }
    }

    static async getChatMessages(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const chatId = req.params.chatId as string;
            const chat = await AssistantChatService.getChatById(chatId, userId);
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }

            const messages = await AssistantChatService.getMessages(chatId);
            return res.json({ chat, messages });
        } catch (error) {
            console.error('Get assistant chat messages error:', error);
            return res.status(500).json({ error: 'Failed to load chat messages' });
        }
    }

    static async sendMessage(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const chatId = req.params.chatId as string;
            const { message } = req.body as { message?: string };

            if (!message || !message.trim()) {
                return res.status(400).json({ error: 'message is required' });
            }

            const chat = await AssistantChatService.getChatById(chatId, userId);
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }

            const userMessage = await AssistantChatService.addMessage(chatId, 'user', message.trim());
            const assistantMessage = await AssistantChatService.handleUserMessage(chat, message.trim());

            return res.json({
                chat,
                userMessage,
                assistantMessage
            });
        } catch (error) {
            console.error('Send assistant message error:', error);
            return res.status(500).json({ error: 'Failed to process message' });
        }
    }

    static async approvePendingProposal(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const chatId = req.params.chatId as string;
            const { proposalMessageId } = req.body as { proposalMessageId?: string };

            const chat = await AssistantChatService.getChatById(chatId, userId);
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }

            const assistantMessage = await AssistantChatService.approvePendingProposal(chat, proposalMessageId);
            return res.json({ chat, assistantMessage });
        } catch (error) {
            console.error('Approve pending proposal error:', error);
            return res.status(500).json({ error: 'Failed to approve pending proposal' });
        }
    }

    static async renameChat(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const chatId = req.params.chatId as string;
            const { title } = req.body as { title: string };

            if (!title || !title.trim()) {
                return res.status(400).json({ error: 'Title is required' });
            }

            const chat = await AssistantChatService.renameChat(chatId, userId, title);
            return res.json(chat);
        } catch (error: any) {
            console.error('Rename chat error:', error);
            if (error.message === 'Chat not found or access denied') {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to rename chat' });
        }
    }
}

export default AssistantController;
