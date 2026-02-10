/**
 * Verbose Logger Utility
 * Provides detailed console logging for debugging
 */

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Foreground
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Background
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
};

function timestamp(): string {
    return new Date().toISOString().substring(11, 23);
}

function formatData(data: any): string {
    if (data === undefined) return '';
    if (typeof data === 'string') return data;
    try {
        return JSON.stringify(data, null, 2);
    } catch {
        return String(data);
    }
}

export const logger = {
    /**
     * Log API request
     */
    request: (method: string, path: string, body?: any) => {
        console.log(
            `${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.bright}${COLORS.blue}→ ${method}${COLORS.reset} ${path}`
        );
        if (body && Object.keys(body).length > 0) {
            console.log(`${COLORS.dim}  Body: ${formatData(body)}${COLORS.reset}`);
        }
    },

    /**
     * Log API response
     */
    response: (status: number, data?: any) => {
        const color = status >= 400 ? COLORS.red : COLORS.green;
        console.log(
            `${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${color}← ${status}${COLORS.reset}`
        );
        if (data) {
            const preview = formatData(data).substring(0, 500);
            console.log(`${COLORS.dim}  Response: ${preview}${preview.length >= 500 ? '...' : ''}${COLORS.reset}`);
        }
    },

    /**
     * Log AI operation
     */
    ai: (operation: string, details?: any) => {
        console.log(
            `${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.magenta}🤖 AI:${COLORS.reset} ${COLORS.bright}${operation}${COLORS.reset}`
        );
        if (details) {
            console.log(`${COLORS.dim}  ${formatData(details)}${COLORS.reset}`);
        }
    },

    /**
     * Log AI prompt being sent
     */
    aiPrompt: (prompt: string) => {
        console.log(
            `${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.magenta}📝 AI Prompt:${COLORS.reset}`
        );
        // Truncate long prompts
        const preview = prompt.substring(0, 800);
        console.log(`${COLORS.dim}  ${preview}${prompt.length > 800 ? '...' : ''}${COLORS.reset}`);
    },

    /**
     * Log AI response received
     */
    aiResponse: (response: any) => {
        console.log(
            `${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.green}✅ AI Response:${COLORS.reset}`
        );
        const preview = formatData(response).substring(0, 500);
        console.log(`${COLORS.dim}  ${preview}${preview.length >= 500 ? '...' : ''}${COLORS.reset}`);
    },

    /**
     * Log database operation
     */
    db: (operation: string, table: string, details?: any) => {
        console.log(
            `${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.yellow}💾 DB:${COLORS.reset} ${operation} on ${COLORS.bright}${table}${COLORS.reset}`
        );
        if (details) {
            console.log(`${COLORS.dim}  ${formatData(details)}${COLORS.reset}`);
        }
    },

    /**
     * Log section operation
     */
    section: (operation: string, sectionType: string, details?: any) => {
        console.log(
            `${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.blue}📄 Section:${COLORS.reset} ${operation} - ${COLORS.bright}${sectionType}${COLORS.reset}`
        );
        if (details) {
            console.log(`${COLORS.dim}  ${formatData(details)}${COLORS.reset}`);
        }
    },

    /**
     * Log wizard step
     */
    wizard: (step: number | string, action: string, details?: any) => {
        console.log(
            `${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.green}🧙 Wizard Step ${step}:${COLORS.reset} ${action}`
        );
        if (details) {
            console.log(`${COLORS.dim}  ${formatData(details)}${COLORS.reset}`);
        }
    },

    /**
     * Log info message
     */
    info: (message: string, data?: any) => {
        console.log(
            `${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.white}ℹ️  ${message}${COLORS.reset}`
        );
        if (data) {
            console.log(`${COLORS.dim}  ${formatData(data)}${COLORS.reset}`);
        }
    },

    /**
     * Log warning
     */
    warn: (message: string, data?: any) => {
        console.log(
            `${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.yellow}⚠️  ${message}${COLORS.reset}`
        );
        if (data) {
            console.log(`${COLORS.dim}  ${formatData(data)}${COLORS.reset}`);
        }
    },

    /**
     * Log error
     */
    error: (message: string, error?: any) => {
        console.log(
            `${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.red}❌ ERROR: ${message}${COLORS.reset}`
        );
        if (error) {
            console.log(`${COLORS.red}  ${error.message || formatData(error)}${COLORS.reset}`);
            if (error.stack) {
                console.log(`${COLORS.dim}  ${error.stack.split('\n').slice(1, 4).join('\n  ')}${COLORS.reset}`);
            }
        }
    },

    /**
     * Log a divider for clarity
     */
    divider: (label?: string) => {
        const line = '═'.repeat(50);
        if (label) {
            console.log(`\n${COLORS.dim}${line}${COLORS.reset}`);
            console.log(`${COLORS.bright}${label}${COLORS.reset}`);
            console.log(`${COLORS.dim}${line}${COLORS.reset}\n`);
        } else {
            console.log(`${COLORS.dim}${'─'.repeat(60)}${COLORS.reset}`);
        }
    },

    /**
     * Log conversation context
     */
    conversation: (action: string, context: any) => {
        console.log(
            `${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.magenta}💬 Chat:${COLORS.reset} ${action}`
        );
        if (context) {
            console.log(`${COLORS.dim}  ${formatData(context)}${COLORS.reset}`);
        }
    }
};

export default logger;
