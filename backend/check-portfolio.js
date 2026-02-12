// Quick script to check portfolios in database
import pool from './src/config/database.js';

async function checkPortfolios() {
    try {
        console.log('Checking all portfolios with slug veer-and-sons...\n');

        const result = await pool.query(
            `SELECT id, name, slug, status, portfolio_type, user_id 
             FROM portfolios 
             WHERE slug LIKE '%veer%' OR slug LIKE '%sons%'
             ORDER BY created_at DESC`
        );

        console.log(`Found ${result.rows.length} portfolios:`);
        console.table(result.rows);

        console.log('\n\nChecking exact slug match...\n');
        const exact = await pool.query(
            `SELECT * FROM portfolios WHERE slug = 'veer-and-sons'`
        );

        console.log(`Exact match count: ${exact.rows.length}`);
        if (exact.rows.length > 0) {
            console.log('Portfolio data:');
            console.log(JSON.stringify(exact.rows[0], null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPortfolios();
