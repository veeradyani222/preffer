"use strict";
/**
 * Reset Archestra Agents Migration
 *
 * Deletes all existing Archestra agents (created with teams restriction)
 * and clears archestra_agent_id from portfolios so they can be recreated
 * without teams (making them publicly accessible).
 *
 * Run: npx tsx src/scripts/resetArchestraAgents.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const archestra_agent_service_1 = __importDefault(require("../services/archestra-agent.service"));
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
async function resetArchestraAgents() {
    console.log('🔄 Starting Archestra agent reset migration...\n');
    try {
        // Fetch all portfolios with linked Archestra agents
        const result = await pool.query(`SELECT id, slug, ai_manager_name, archestra_agent_id 
             FROM portfolios 
             WHERE archestra_agent_id IS NOT NULL`);
        const portfolios = result.rows;
        console.log(`Found ${portfolios.length} portfolios with Archestra agents\n`);
        if (portfolios.length === 0) {
            console.log('✅ No agents to reset. Done!');
            return;
        }
        let deletedCount = 0;
        let failedCount = 0;
        // Delete each agent from Archestra
        for (const portfolio of portfolios) {
            try {
                console.log(`Deleting agent for portfolio: ${portfolio.slug} (${portfolio.ai_manager_name})`);
                console.log(`  Agent ID: ${portfolio.archestra_agent_id}`);
                await archestra_agent_service_1.default.deleteAgent(portfolio.archestra_agent_id);
                console.log(`  ✅ Agent deleted successfully\n`);
                deletedCount++;
            }
            catch (error) {
                console.error(`  ⚠️  Failed to delete agent: ${error.message}`);
                console.error(`  Continuing anyway...\n`);
                failedCount++;
            }
        }
        // Clear all archestra_agent_id values in database
        console.log('📝 Clearing archestra_agent_id from database...');
        await pool.query(`UPDATE portfolios 
             SET archestra_agent_id = NULL 
             WHERE archestra_agent_id IS NOT NULL`);
        console.log('✅ Database updated\n');
        // Summary
        console.log('════════════════════════════════════════════');
        console.log('Migration Summary:');
        console.log('════════════════════════════════════════════');
        console.log(`Total portfolios:     ${portfolios.length}`);
        console.log(`Agents deleted:       ${deletedCount}`);
        console.log(`Failed deletions:     ${failedCount}`);
        console.log(`Database cleared:     ✅`);
        console.log('════════════════════════════════════════════\n');
        console.log('🎉 Migration complete!');
        console.log('\nNext steps:');
        console.log('1. Restart your backend server');
        console.log('2. Update any AI manager via the frontend wizard');
        console.log('3. New agents will be created WITHOUT teams (publicly accessible)');
    }
    catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        throw error;
    }
    finally {
        await pool.end();
    }
}
// Run migration
resetArchestraAgents().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
