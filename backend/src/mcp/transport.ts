/**
 * MCP Transport Layer
 * 
 * Bridges Express HTTP requests to the MCP server using
 * StreamableHTTPServerTransport. Handles API key authentication.
 * 
 * Mounts at /mcp on the Express app.
 */

import { Router, Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer, resolveUserFromApiKey } from './server';
import { IncomingMessage, ServerResponse } from 'http';

const router = Router();

// Store active transports by session ID
const transports = new Map<string, StreamableHTTPServerTransport>();

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
 * POST /mcp — Handle MCP JSON-RPC messages
 * 
 * This is the main endpoint. On initialize, creates a new transport & server.
 * On subsequent messages, routes to the existing transport by session ID.
 */
router.post('/', async (req: Request, res: Response) => {
    console.log('[MCP] POST /mcp received');

    // Authenticate via API key
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

    // Check for existing session
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
        // Existing session — route to it
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse, req.body);
        return;
    }

    // No session or unknown session — this should be an initialize request
    // Create new transport + server for this session
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => `mcp-${user.userId}-${Date.now()}`,
        onsessioninitialized: (newSessionId) => {
            console.log(`[MCP] Session initialized: ${newSessionId} for user ${user.userId}`);
            transports.set(newSessionId, transport);
        }
    });

    // Create a new MCP server instance for this session
    const mcpServer = createMcpServer();

    // Attach user context to the server so tools can access it
    // We do this by monkey-patching the transport's request handling
    const originalHandle = transport.handleRequest.bind(transport);
    transport.handleRequest = async (httpReq: IncomingMessage, httpRes: ServerResponse, body?: unknown) => {
        // Inject userId into the server context 
        // The MCP SDK passes 'extra' to tool handlers, we'll intercept via the server
        (mcpServer as any)._userId = user.userId;
        return originalHandle(httpReq, httpRes, body);
    };

    // Override the tool handler to inject userId
    // We need to patch the server to pass userId through extra context
    const origTool = (mcpServer.server as any)._requestHandlers?.get?.('tools/call');

    await mcpServer.connect(transport);

    // After connect, patch tool calls to inject userId
    const toolCallHandler = (mcpServer.server as any)._requestHandlers?.get?.('tools/call');
    if (toolCallHandler) {
        (mcpServer.server as any)._requestHandlers.set('tools/call', async (request: any, extra: any) => {
            // Inject userId into extra so tools can access it
            if (extra) {
                extra._userId = user.userId;
            }
            return toolCallHandler(request, extra);
        });
    }

    // Handle cleanup on transport close
    transport.onclose = () => {
        const sid = (transport as any).sessionId;
        if (sid) {
            console.log(`[MCP] Session closed: ${sid}`);
            transports.delete(sid);
        }
        mcpServer.close();
    };

    // Process the initial request
    await transport.handleRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse, req.body);
});

/**
 * GET /mcp — SSE endpoint for server-to-client notifications
 */
router.get('/', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId || !transports.has(sessionId)) {
        res.status(400).json({ error: 'Invalid or missing session ID. Initialize first via POST.' });
        return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse);
});

/**
 * DELETE /mcp — Terminate a session
 */
router.delete('/', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId || !transports.has(sessionId)) {
        res.status(400).json({ error: 'Invalid or missing session ID' });
        return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse);
    transports.delete(sessionId);
    console.log(`[MCP] Session terminated: ${sessionId}`);
});

export default router;
