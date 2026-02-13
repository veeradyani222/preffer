/**
 * MCP Transport Layer (Stateless / Vercel-compatible)
 * 
 * Follows the official MCP SDK "simpleStatelessStreamableHttp" pattern.
 * Each request creates a fresh server + transport with sessionIdGenerator: undefined.
 * This enables true stateless mode — no initialize handshake required.
 * 
 * Mounts at /mcp on the Express app.
 */

import { Router, Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer, resolveUserFromApiKey } from './server';

const router = Router();

/**
 * Extract API key from Authorization header
 */
function extractApiKey(req: Request): string | null {
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
router.post('/', async (req: Request, res: Response) => {
    try {
        // Authenticate
        const apiKey = extractApiKey(req);
        if (!apiKey) {
            res.status(401).json({ error: 'Missing Authorization header. Use: Bearer <api_key>' });
            return;
        }

        const user = await resolveUserFromApiKey(apiKey);
        if (!user) {
            res.status(401).json({ error: 'Invalid API key' });
            return;
        }

        // Create fresh server + transport per request (stateless)
        const server = createMcpServer();
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // <-- THIS enables true stateless mode
        });

        await server.connect(transport);

        // Patch tool call handler to inject userId into extra context
        const toolCallHandler = (server.server as any)._requestHandlers?.get?.('tools/call');
        if (toolCallHandler) {
            (server.server as any)._requestHandlers.set('tools/call', async (request: any, extra: any) => {
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
    } catch (error: any) {
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
router.get('/', async (req: Request, res: Response) => {
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
router.delete('/', async (req: Request, res: Response) => {
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
            code: -32000,
            message: 'Method not allowed.'
        },
        id: null
    }));
});

export default router;
