"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: parseInt(process.env.PG_POOL_MAX || '8', 10),
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 20000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
};
const pool = new pg_1.Pool(poolConfig);
// Connection error handling
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit on connection errors, let pool recover
});
// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    }
    else {
        console.log('✅ Database connected successfully at', res.rows[0].now);
    }
});
exports.default = pool;
