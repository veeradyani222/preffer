/**
 * MCP Transport Layer (Stateless / Vercel-compatible)
 * 
 * Each request creates a fresh MCP server + transport.
 * No in-memory session map — works on serverless cold starts.
 * 
 * Mounts at /mcp on the Express app.
 */

import { Router, Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer, resolveUserFromApiKey } from './server';
import { IncomingMessage, ServerResponse } from 'http';

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
 * Creates a fresh server + transport for every request.
 * This ensures Vercel serverless cold starts never cause
 * "Server not initialized" errors.
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

        // Create a fresh transport + server for this request
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => `mcp-${user.userId}-${Date.now()}`,
        });

        const mcpServer = createMcpServer();

        // Connect server to transport
        await mcpServer.connect(transport);

        // Patch tool call handler to inject userId into extra context
        const toolCallHandler = (mcpServer.server as any)._requestHandlers?.get?.('tools/call');
        if (toolCallHandler) {
            (mcpServer.server as any)._requestHandlers.set('tools/call', async (request: any, extra: any) => {
                if (extra) {
                    extra._userId = user.userId;
                }
                return toolCallHandler(request, extra);
            });
        }

        // Handle the request
        await transport.handleRequest(
            req as unknown as IncomingMessage,
            res as unknown as ServerResponse,
            req.body
        );

        // Clean up after response is sent
        res.on('finish', () => {
            transport.close?.();
            mcpServer.close?.();
        });
    } catch (error: any) {
        console.error('[MCP] Error handling POST:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal MCP server error' });
        }
    }
});

/**
 * GET /mcp — SSE endpoint (stateless: returns instructions)
 */
router.get('/', async (req: Request, res: Response) => {
    res.status(405).json({
        error: 'This MCP server uses Streamable HTTP transport. Send POST requests with JSON-RPC messages.'
    });
});

/**
 * DELETE /mcp — Session termination (no-op in stateless mode)
 */
router.delete('/', async (req: Request, res: Response) => {
    res.status(200).json({ message: 'Session terminated' });
});

export default router;
