"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assistant_chat_service_1 = __importDefault(require("../services/assistant-chat.service"));
class AssistantController {
    static async getContextOptions(req, res) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const data = await assistant_chat_service_1.default.getContextOptions(userId);
            return res.json(data);
        }
        catch (error) {
            console.error('Get assistant context options error:', error);
            return res.status(500).json({ error: 'Failed to load context options' });
        }
    }
    static async getChats(req, res) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const chats = await assistant_chat_service_1.default.getChats(userId);
            return res.json(chats);
        }
        catch (error) {
            console.error('Get assistant chats error:', error);
            return res.status(500).json({ error: 'Failed to load chats' });
        }
    }
    static async createChat(req, res) {
        var _a, _b, _c;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { contextType, portfolioId, title } = req.body;
            if (!contextType || !['portfolio', 'ai_manager'].includes(contextType)) {
                return res.status(400).json({ error: 'contextType must be portfolio or ai_manager' });
            }
            if (!portfolioId) {
                return res.status(400).json({ error: 'portfolioId is required' });
            }
            const result = await assistant_chat_service_1.default.createChat(userId, contextType, portfolioId, title);
            return res.status(201).json(result);
        }
        catch (error) {
            console.error('Create assistant chat error:', error);
            if (((_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.includes('not found')) || ((_c = error === null || error === void 0 ? void 0 : error.message) === null || _c === void 0 ? void 0 : _c.includes('does not have'))) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to create chat' });
        }
    }
    static async getChatMessages(req, res) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const chatId = req.params.chatId;
            const chat = await assistant_chat_service_1.default.getChatById(chatId, userId);
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            const messages = await assistant_chat_service_1.default.getMessages(chatId);
            return res.json({ chat, messages });
        }
        catch (error) {
            console.error('Get assistant chat messages error:', error);
            return res.status(500).json({ error: 'Failed to load chat messages' });
        }
    }
    static async sendMessage(req, res) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const chatId = req.params.chatId;
            const { message } = req.body;
            if (!message || !message.trim()) {
                return res.status(400).json({ error: 'message is required' });
            }
            const chat = await assistant_chat_service_1.default.getChatById(chatId, userId);
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            const userMessage = await assistant_chat_service_1.default.addMessage(chatId, 'user', message.trim());
            const assistantMessage = await assistant_chat_service_1.default.handleUserMessage(chat, message.trim());
            const effectiveChat = await assistant_chat_service_1.default.maybeAutoTitleChat(chat, userId, message.trim());
            return res.json({
                chat: effectiveChat,
                userMessage,
                assistantMessage
            });
        }
        catch (error) {
            console.error('Send assistant message error:', error);
            return res.status(500).json({ error: 'Failed to process message' });
        }
    }
    static async approvePendingProposal(req, res) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const chatId = req.params.chatId;
            const { proposalMessageId } = req.body;
            const chat = await assistant_chat_service_1.default.getChatById(chatId, userId);
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            const assistantMessage = await assistant_chat_service_1.default.approvePendingProposal(chat, proposalMessageId);
            return res.json({ chat, assistantMessage });
        }
        catch (error) {
            console.error('Approve pending proposal error:', error);
            return res.status(500).json({ error: 'Failed to approve pending proposal' });
        }
    }
    static async renameChat(req, res) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const chatId = req.params.chatId;
            const { title } = req.body;
            if (!title || !title.trim()) {
                return res.status(400).json({ error: 'Title is required' });
            }
            const chat = await assistant_chat_service_1.default.renameChat(chatId, userId, title);
            return res.json(chat);
        }
        catch (error) {
            console.error('Rename chat error:', error);
            if (error.message === 'Chat not found or access denied') {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to rename chat' });
        }
    }
}
exports.default = AssistantController;
