/**
 * Backfill script: Create Archestra agents for existing published portfolios
 * that have finalized AI managers but no archestra_agent_id yet.
 *
 * Usage: npx ts-node src/scripts/backfillArchestraAgents.ts
 */

import pool from '../config/database';
import ArchestraAgentService from '../services/archestra-agent.service';

async function backfill() {
    if (!ArchestraAgentService.isA2AEnabled()) {
        console.error('❌ A2A integration not configured. Check your .env for ARCHESTRA_API_KEY, ARCHESTRA_A2A_TOKEN, ARCHESTRA_TEAM_ID.');
        process.exit(1);
    }

    console.log('🔍 Finding published portfolios with finalized AI managers but no Archestra agent...\n');

    const force = process.env.BACKFILL_FORCE === 'true';
    const result = await pool.query(`
        SELECT id, name, slug, profession, description, sections, theme,
               has_ai_manager, ai_manager_name, ai_manager_personality,
               ai_manager_has_portfolio_access, ai_manager_finalized,
               ai_manager_custom_instructions, wizard_data, archestra_agent_id
        FROM portfolios
        WHERE status = 'published'
          AND has_ai_manager = true
          AND ai_manager_finalized = true
          AND ai_manager_name IS NOT NULL
          AND (${force ? 'true' : "(archestra_agent_id IS NULL OR archestra_agent_id = '')"})
    `);

    if (result.rows.length === 0) {
        console.log('✅ No portfolios need backfilling. All done!');
        await pool.end();
        return;
    }

    console.log(`Found ${result.rows.length} portfolio(s) to backfill:\n`);

    let success = 0;
    let failed = 0;
    let fallback = 0;

    for (const row of result.rows) {
        const label = `${row.ai_manager_name} (portfolio: ${row.slug || row.id})`;
        console.log(`  → Creating agent for: ${label}`);

        try {
            const agent = await ArchestraAgentService.createAgentOrFallback({
                name: row.name,
                profession: row.profession,
                description: row.description,
                sections: row.sections || [],
                ai_manager_name: row.ai_manager_name,
                ai_manager_personality: row.ai_manager_personality,
                ai_manager_has_portfolio_access: row.ai_manager_has_portfolio_access,
                ai_manager_custom_instructions: row.ai_manager_custom_instructions,
                wizard_data: row.wizard_data || {},
            }, row.id);

            if (!agent) {
                console.warn('    Agent creation fallback used (continuing without archestra_agent_id)\n');
                fallback++;
                continue;
            }

            await pool.query(
                'UPDATE portfolios SET archestra_agent_id = $1 WHERE id = $2',
                [agent.id, row.id]
            );

            console.log(`    ✅ Agent created: ${agent.id}\n`);
            success++;
        } catch (err: any) {
            console.error(`    ❌ Failed: ${err.message}\n`);
            failed++;
        }
    }

    console.log(`\n🏁 Done! ${success} created, ${fallback} fallback, ${failed} failed.`);
    await pool.end();
}

backfill().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
