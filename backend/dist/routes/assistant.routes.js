"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const assistant_controller_1 = __importDefault(require("../controllers/assistant.controller"));
const authenticate_1 = __importDefault(require("../middleware/authenticate"));
const router = express_1.default.Router();
router.use(authenticate_1.default);
router.get('/context-options', assistant_controller_1.default.getContextOptions);
router.get('/chats', assistant_controller_1.default.getChats);
router.post('/chats', assistant_controller_1.default.createChat);
router.get('/chats/:chatId/messages', assistant_controller_1.default.getChatMessages);
router.post('/chats/:chatId/messages', assistant_controller_1.default.sendMessage);
router.post('/chats/:chatId/approve', assistant_controller_1.default.approvePendingProposal);
router.patch('/chats/:chatId/title', assistant_controller_1.default.renameChat);
exports.default = router;
