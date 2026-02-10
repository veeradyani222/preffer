import dotenv from 'dotenv';
dotenv.config();
import pool from './src/config/database';

const createTables = async () => {
    try {
        console.log('Creating database tables...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                google_id VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(100) UNIQUE NOT NULL,
                display_name VARCHAR(255),
                profile_picture TEXT,
                api_key VARCHAR(64) UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Users table created');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
        `);

        console.log('✅ Indexes created');
        console.log('✅ Database schema setup complete!');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        await pool.end();
        process.exit(1);
    }
};

createTables();
