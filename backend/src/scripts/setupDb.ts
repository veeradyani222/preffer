import pool from '../config/database';
import { promises as fs } from 'fs';
import path from 'path';

const RESET_DB = process.env.RESET_DB === 'true';

const resetSql = `
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS assistant_chat_messages CASCADE;
DROP TABLE IF EXISTS assistant_chats CASCADE;
DROP TABLE IF EXISTS portfolios CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
`;

async function runSqlFile(client: any, absolutePath: string, label: string) {
    const sql = await fs.readFile(absolutePath, 'utf8');
    if (!sql.trim()) {
        console.log(`Skipping empty SQL file: ${label}`);
        return;
    }
    console.log(`Running ${label}...`);
    await client.query(sql);
}

async function runSchema(client: any) {
    const schemaPath = path.resolve(__dirname, '../../schema.sql');
    await runSqlFile(client, schemaPath, 'schema.sql');
}

async function runSqlMigrations(client: any) {
    const migrationsDir = path.resolve(__dirname, '../../migrations');

    let files: string[] = [];
    try {
        files = (await fs.readdir(migrationsDir))
            .filter((file) => file.toLowerCase().endsWith('.sql'))
            .sort();
    } catch (error: any) {
        if (error?.code === 'ENOENT') {
            console.log('No migrations folder found, skipping SQL migrations.');
            return;
        }
        throw error;
    }

    if (files.length === 0) {
        console.log('No SQL migration files found.');
        return;
    }

    console.log(`Running ${files.length} SQL migration file(s)...`);
    for (const file of files) {
        const fullPath = path.join(migrationsDir, file);
        await runSqlFile(client, fullPath, `migration ${file}`);
    }
}

async function setupDb() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            if (RESET_DB) {
                console.log('RESET_DB=true: dropping existing tables before setup.');
                await client.query(resetSql);
            } else {
                console.log('RESET_DB is not true: preserving existing data.');
            }

            await runSchema(client);
            await runSqlMigrations(client);

            await client.query('COMMIT');
            console.log('Database setup completed successfully.');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error setting up database:', error);
            process.exit(1);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Unknown setup error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setupDb();
