import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Connection pool configuration optimized for Neon serverless
const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Neon
    },
    // Neon-optimized settings
    max: 5,                         // Lower max for serverless (Neon recommends 5-10)
    idleTimeoutMillis: 60000,       // Keep connections alive longer (60s)
    connectionTimeoutMillis: 20000, // Longer timeout for cold starts (20s)
    keepAlive: true,                // Enable TCP keepalive
    keepAliveInitialDelayMillis: 10000, // Start keepalive after 10s
};

const pool = new Pool(poolConfig);

// Connection error handling
pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit on connection errors, let pool recover
});

// Test connection on startup
pool.query('SELECT NOW()', (err: Error, res: any) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ Database connected successfully at', res.rows[0].now);
    }
});

export default pool;
