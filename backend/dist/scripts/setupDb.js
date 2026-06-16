"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
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
async function runSqlFile(client, absolutePath, label) {
    const sql = await fs_1.promises.readFile(absolutePath, 'utf8');
    if (!sql.trim()) {
        console.log(`Skipping empty SQL file: ${label}`);
        return;
    }
    console.log(`Running ${label}...`);
    await client.query(sql);
}
async function runSchema(client) {
    const schemaPath = path_1.default.resolve(__dirname, '../../schema.sql');
    await runSqlFile(client, schemaPath, 'schema.sql');
}
async function runSqlMigrations(client) {
    const migrationsDir = path_1.default.resolve(__dirname, '../../migrations');
    let files = [];
    try {
        files = (await fs_1.promises.readdir(migrationsDir))
            .filter((file) => file.toLowerCase().endsWith('.sql'))
            .sort();
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.code) === 'ENOENT') {
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
        const fullPath = path_1.default.join(migrationsDir, file);
        await runSqlFile(client, fullPath, `migration ${file}`);
    }
}
async function setupDb() {
    try {
        console.log('Connecting to database...');
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            if (RESET_DB) {
                console.log('RESET_DB=true: dropping existing tables before setup.');
                await client.query(resetSql);
            }
            else {
                console.log('RESET_DB is not true: preserving existing data.');
            }
            await runSchema(client);
            await runSqlMigrations(client);
            await client.query('COMMIT');
            console.log('Database setup completed successfully.');
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error setting up database:', error);
            process.exit(1);
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Unknown setup error:', error);
        process.exit(1);
    }
    finally {
        await database_1.default.end();
    }
}
setupDb();
