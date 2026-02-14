"use strict";
/**
 * MCP Transport Layer (Stateless / Vercel-compatible)
 *
 * Follows the official MCP SDK "simpleStatelessStreamableHttp" pattern.
 * Each request creates a fresh server + transport with sessionIdGenerator: undefined.
 * This enables true stateless mode — no initialize handshake required.
 *
 * Mounts at /mcp on the Express app.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const server_1 = require("./server");
const router = (0, express_1.Router)();
/**
 * Extract API key from Authorization header
 */
function extractApiKey(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7).trim();
}
/**
 * POST /mcp — Handle ALL MCP messages (stateless)
 *
 * Uses sessionIdGenerator: undefined for true stateless mode.
 * No session or initialize handshake needed.
 */
router.post('/', async (req, res) => {
    var _a, _b;
    try {
        // Authenticate
        const apiKey = extractApiKey(req);
        if (!apiKey) {
            res.status(401).json({ error: 'Missing Authorization header. Use: Bearer <api_key>' });
            return;
        }
        const user = await (0, server_1.resolveUserFromApiKey)(apiKey);
        if (!user) {
            res.status(401).json({ error: 'Invalid API key' });
            return;
        }
        // Create fresh server + transport per request (stateless)
        const server = (0, server_1.createMcpServer)();
        const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // <-- THIS enables true stateless mode
        });
        await server.connect(transport);
        // Patch tool call handler to inject userId into extra context
        const toolCallHandler = (_b = (_a = server.server._requestHandlers) === null || _a === void 0 ? void 0 : _a.get) === null || _b === void 0 ? void 0 : _b.call(_a, 'tools/call');
        if (toolCallHandler) {
            server.server._requestHandlers.set('tools/call', async (request, extra) => {
                if (extra) {
                    extra._userId = user.userId;
                }
                return toolCallHandler(request, extra);
            });
        }
        // Handle the request
        await transport.handleRequest(req, res, req.body);
        // Clean up when response finishes
        res.on('close', () => {
            transport.close();
            server.close();
        });
    }
    catch (error) {
        console.error('[MCP] Error handling request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error'
                },
                id: null
            });
        }
    }
});
/**
 * GET /mcp — Not used in stateless mode
 */
router.get('/', async (req, res) => {
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
            code: -32000,
            message: 'Method not allowed.'
        },
        id: null
    }));
});
/**
 * DELETE /mcp — Not used in stateless mode
 */
router.delete('/', async (req, res) => {
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
            code: -32000,
            message: 'Method not allowed.'
        },
        id: null
    }));
});
exports.default = router;
