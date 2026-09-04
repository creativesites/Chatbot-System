const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../myavana/.env') });

async function run() {
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10) || 5432
  });

  await client.connect();
  console.log('Connected to PostgreSQL database at', process.env.DB_HOST);

  // Ensure schema_migrations table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const migrationsToRun = [
    '001_add_analytics_tables.sql',
    '002_add_advanced_features_tables.sql',
    '008_platform_identity.sql'
  ];

  for (const file of migrationsToRun) {
    const migrationName = path.basename(file, '.sql');
    const checkRes = await client.query('SELECT 1 FROM schema_migrations WHERE migration_name = $1', [migrationName]);
    if (checkRes.rows.length > 0) {
      console.log(`Migration ${migrationName} already marked as applied, running idempotently...`);
    } else {
      console.log(`Applying migration ${migrationName}...`);
    }

    const filePath = path.join(__dirname, '../migrations', file);
    const sql = fs.readFileSync(filePath, 'utf8');

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO schema_migrations (migration_name) VALUES ($1) ON CONFLICT (migration_name) DO NOTHING`,
        [migrationName]
      );
      await client.query('COMMIT');
      console.log(`✅ ${migrationName} successfully applied!`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration ${migrationName} failed:`, err.message);
      throw err;
    }
  }

  await client.end();
  console.log('🏁 All requested migrations applied successfully!');
}

run().catch((err) => {
  console.error('Fatal error during migration execution:', err);
  process.exit(1);
});
