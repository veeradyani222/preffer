"use strict";
/**
 * Verbose Logger Utility
 * Provides detailed console logging for debugging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
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
function timestamp() {
    return new Date().toISOString().substring(11, 23);
}
function formatData(data) {
    if (data === undefined)
        return '';
    if (typeof data === 'string')
        return data;
    try {
        return JSON.stringify(data, null, 2);
    }
    catch (_a) {
        return String(data);
    }
}
exports.logger = {
    /**
     * Log API request
     */
    request: (method, path, body) => {
        console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.bright}${COLORS.blue}→ ${method}${COLORS.reset} ${path}`);
        if (body && Object.keys(body).length > 0) {
            console.log(`${COLORS.dim}  Body: ${formatData(body)}${COLORS.reset}`);
        }
    },
    /**
     * Log API response
     */
    response: (status, data) => {
        const color = status >= 400 ? COLORS.red : COLORS.green;
        console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${color}← ${status}${COLORS.reset}`);
        if (data) {
            const preview = formatData(data).substring(0, 500);
            console.log(`${COLORS.dim}  Response: ${preview}${preview.length >= 500 ? '...' : ''}${COLORS.reset}`);
        }
    },
    /**
     * Log AI operation
     */
    ai: (operation, details) => {
        console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.magenta}🤖 AI:${COLORS.reset} ${COLORS.bright}${operation}${COLORS.reset}`);
        if (details) {
            console.log(`${COLORS.dim}  ${formatData(details)}${COLORS.reset}`);
        }
    },
    /**
     * Log AI prompt being sent
     */
    aiPrompt: (prompt) => {
        console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.magenta}📝 AI Prompt:${COLORS.reset}`);
        // Truncate long prompts
        const preview = prompt.substring(0, 800);
        console.log(`${COLORS.dim}  ${preview}${prompt.length > 800 ? '...' : ''}${COLORS.reset}`);
    },
    /**
     * Log AI response received
     */
    aiResponse: (response) => {
        console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.green}✅ AI Response:${COLORS.reset}`);
        const preview = formatData(response).substring(0, 500);
        console.log(`${COLORS.dim}  ${preview}${preview.length >= 500 ? '...' : ''}${COLORS.reset}`);
    },
    /**
     * Log database operation
     */
    db: (operation, table, details) => {
        console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.yellow}💾 DB:${COLORS.reset} ${operation} on ${COLORS.bright}${table}${COLORS.reset}`);
        if (details) {
            console.log(`${COLORS.dim}  ${formatData(details)}${COLORS.reset}`);
        }
    },
    /**
     * Log section operation
     */
    section: (operation, sectionType, details) => {
        console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.blue}📄 Section:${COLORS.reset} ${operation} - ${COLORS.bright}${sectionType}${COLORS.reset}`);
        if (details) {
            console.log(`${COLORS.dim}  ${formatData(details)}${COLORS.reset}`);
        }
    },
    /**
     * Log wizard step
     */
    wizard: (step, action, details) => {
        console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.green}🧙 Wizard Step ${step}:${COLORS.reset} ${action}`);
        if (details) {
            console.log(`${COLORS.dim}  ${formatData(details)}${COLORS.reset}`);
        }
    },
    /**
     * Log info message
     */
    info: (message, data) => {
        console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.white}ℹ️  ${message}${COLORS.reset}`);
        if (data) {
            console.log(`${COLORS.dim}  ${formatData(data)}${COLORS.reset}`);
        }
    },
    /**
     * Log warning
     */
    warn: (message, data) => {
        console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.yellow}⚠️  ${message}${COLORS.reset}`);
        if (data) {
            console.log(`${COLORS.dim}  ${formatData(data)}${COLORS.reset}`);
        }
    },
    /**
     * Log error
     */
    error: (message, error) => {
        console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.red}❌ ERROR: ${message}${COLORS.reset}`);
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
    divider: (label) => {
        const line = '═'.repeat(50);
        if (label) {
            console.log(`\n${COLORS.dim}${line}${COLORS.reset}`);
            console.log(`${COLORS.bright}${label}${COLORS.reset}`);
            console.log(`${COLORS.dim}${line}${COLORS.reset}\n`);
        }
        else {
            console.log(`${COLORS.dim}${'─'.repeat(60)}${COLORS.reset}`);
        }
    },
    /**
     * Log conversation context
     */
    conversation: (action, context) => {
        console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ` +
            `${COLORS.magenta}💬 Chat:${COLORS.reset} ${action}`);
        if (context) {
            console.log(`${COLORS.dim}  ${formatData(context)}${COLORS.reset}`);
        }
    }
};
exports.default = exports.logger;
