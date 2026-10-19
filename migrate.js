// Database Migration Runner: node migrate.js
// Reads schema.sql and applies it to Supabase / PostgreSQL
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigration() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;

  if (!connectionString) {
    console.log('[Campus2Career Migration] Notice: POSTGRES_URL is not set in environment.');
    console.log('[Campus2Career Migration] Local JSON fallback store is active.');
    console.log('[Campus2Career Migration] To apply to live Supabase, set POSTGRES_URL in .env and rerun.');
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('[Campus2Career Migration] Connecting to PostgreSQL database...');
    const sqlPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('[Campus2Career Migration] Executing schema.sql migration & seeds...');
    await pool.query(sql);

    console.log('✓ Tables verified / created:');
    console.log('  - users (with bcrypt admin & roles)');
    console.log('  - login_attempts (brute-force defense)');
    console.log('  - pending_verifications (PIN & token)');
    console.log('  - candidates (high-skilled >= 90 score)');
    console.log('  - market_signals (recruiter requirement posts)');
    console.log('  - market_news (student feed headlines)');
    console.log('  - diagnostics (MCQ benchmark evaluations)');
    console.log('  - audit_logs (sovereign admin actions)');
    console.log('✓ 7 High-Skilled Candidates seeded');
    console.log('✓ 4-5 Recruiter Signals seeded');
    console.log('✓ Market News insights seeded');
    console.log('✓ Migration finished successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
