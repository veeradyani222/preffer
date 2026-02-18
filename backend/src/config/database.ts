import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const poolConfig: PoolConfig = {
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
