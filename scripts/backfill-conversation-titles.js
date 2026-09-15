#!/usr/bin/env node
/**
 * Backfills conversations.title and conversations.summary for every existing
 * conversation, deriving both from the conversation's own chat_history.
 *
 * Deterministic on purpose - no model calls - so the whole historical backlog
 * can be fixed in one pass without burning Gemini quota, and so it is safe to
 * re-run.
 *
 * Usage:
 *   DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=... DB_PORT=5432 \
 *     node scripts/backfill-conversation-titles.js [--dry-run]
 */

const { Client } = require('pg');
const path = require('path');

// conversationMeta is dependency-free on purpose - importing conversation.js
// here would open pg/redis connections as a module side effect.
const {
    buildTitleFromHistory,
    buildSummaryFromHistory,
} = require(path.join(__dirname, '..', 'packages', 'core', 'src', 'conversationMeta.js'));

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
    const client = new Client({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log(`🔗 Connected${DRY_RUN ? ' (DRY RUN - no writes)' : ''}`);

    await client.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title VARCHAR(255)');

    const { rows } = await client.query(`
        SELECT conversation_id, title, summary, chat_history
        FROM conversations
        ORDER BY COALESCE(updated_at, created_at) DESC
    `);

    console.log(`📚 ${rows.length} conversations to process`);

    let updated = 0;
    let skipped = 0;
    const samples = [];

    for (const row of rows) {
        const history = Array.isArray(row.chat_history) ? row.chat_history : [];
        const title = buildTitleFromHistory(history, row.summary);
        const summary = buildSummaryFromHistory(history, row.summary);

        if (row.title === title && row.summary === summary) {
            skipped++;
            continue;
        }

        if (!DRY_RUN) {
            await client.query(
                'UPDATE conversations SET title = $1, summary = $2 WHERE conversation_id = $3',
                [title, summary, row.conversation_id]
            );
        }

        updated++;
        if (samples.length < 8) {
            samples.push({ id: row.conversation_id.slice(0, 18), title, summary: summary.slice(0, 80) });
        }
    }

    console.log(`\n✅ ${updated} updated, ${skipped} already correct`);
    console.log('\n📋 Sample results:');
    samples.forEach((s) => {
        console.log(`   • "${s.title}"`);
        console.log(`     ${s.summary}`);
    });

    // Report anything still lacking a usable title/summary.
    const { rows: gaps } = await client.query(`
        SELECT COUNT(*) AS missing FROM conversations
        WHERE title IS NULL OR BTRIM(title) = '' OR summary IS NULL OR BTRIM(summary) = ''
    `);
    console.log(`\n🔎 Conversations still missing a title or summary: ${gaps[0].missing}`);

    await client.end();
}

main().catch((err) => {
    console.error('❌ Backfill failed:', err.message);
    process.exit(1);
});
