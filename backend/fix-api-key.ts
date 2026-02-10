import dotenv from 'dotenv';
dotenv.config();
import pool from './src/config/database';

const fixApiKeyColumn = async () => {
    try {
        console.log('Updating api_key column size...');

        // The API key format is pk_live_ (8 chars) + 64 hex chars = 72 chars total
        // Setting to 128 to have room for future changes
        await pool.query(`
            ALTER TABLE users ALTER COLUMN api_key TYPE VARCHAR(128);
        `);

        console.log('✅ api_key column updated to VARCHAR(128)');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating column:', error);
        await pool.end();
        process.exit(1);
    }
};

fixApiKeyColumn();
