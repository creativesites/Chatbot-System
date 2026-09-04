// trendManager.js
// Keeps the AI aware of current hair, beauty, and wellness trends.
//
// Trends are AI-generated every 48h and stored in PostgreSQL.
// Redis caches the current set for fast per-request reads.
// Regeneration always runs in the background — it never blocks a response.
//
// Injection into conversation:
//   buildMessageContext() calls getTrendContext(stage, personaType)
//   which returns a short 1-line block like:
//   "[Trending: scalp detoxing as foundation for growth; rice water protein rinses]\n"

const { pgClient, redisClient } = require('./database');
const ai = require('./ai');
const { z } = require('zod');

const REDIS_KEY        = 'hair_trends:current';
const REDIS_LOCK_KEY   = 'hair_trends:generating';
const REDIS_CACHE_TTL  = 60 * 60 * 6;   // 6h Redis cache
const TREND_MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48h before DB trends are stale

// ---------------------------------------------------------------------------
// Trend generation (AI → DB)
// ---------------------------------------------------------------------------

const TREND_SCHEMA = z.object({
    trends: z.array(z.object({
        trend_name:       z.string(),
        description:      z.string(),
        category:         z.enum(['technique', 'ingredient', 'style', 'wellness']),
        relevance_stages: z.array(z.number().int().min(1).max(8)),
        trend_score:      z.number().min(0).max(1),
    })),
});

const GENERATION_PROMPT = `
You are a hair care industry analyst. Generate a list of exactly 10 hair care trends
that are currently popular in 2025–2026 across social media, salons, and natural hair communities.

Focus on trends relevant to textured, curly, and natural hair (4a, 4b, 4c, 3a–3c types).
Include a mix of techniques, ingredients, styles, and wellness practices.

For each trend:
- trend_name: short name (3–6 words)
- description: one sentence explaining what it is and why it works (max 20 words)
- category: one of "technique" | "ingredient" | "style" | "wellness"
- relevance_stages: array of Myavana journey stage numbers most relevant (1=Something New,
  2=Rocking This, 3=Experimenting, 4=Boredom, 5=Desperation, 6=Damage/Protection,
  7=Repair/Decision, 8=Hair Nirvana) — list 2–4 stages per trend
- trend_score: float 0.0–1.0 indicating how hot this trend is right now

Return ONLY a JSON object with a "trends" array. No markdown, no explanations.
`;

/**
 * Checks whether the stored trends are older than TREND_MAX_AGE_MS.
 * Returns true if trends need refreshing.
 */
async function isTrendsStale() {
    try {
        const result = await pgClient.query(
            `SELECT MAX(generated_at) AS latest FROM hair_trends WHERE active = TRUE`
        );
        const latest = result.rows[0]?.latest;
        if (!latest) return true;
        return (Date.now() - new Date(latest).getTime()) > TREND_MAX_AGE_MS;
    } catch {
        return false; // if DB unavailable, don't trigger generation
    }
}

/**
 * AI-generates 10 trends and upserts them into the DB.
 * Acquires a Redis lock to prevent concurrent generation.
 * Safe to call concurrently — only one generation runs at a time.
 */
async function generateTrends() {
    // Distributed lock — skip if another instance is already generating
    try {
        if (redisClient) {
            const locked = await redisClient.set(REDIS_LOCK_KEY, '1', { NX: true, EX: 300 });
            if (!locked) {
                console.log('🌊 Trend generation already in progress (locked), skipping');
                return;
            }
        }
    } catch { /* Redis unavailable — proceed without lock */ }

    try {
        console.log('🌊 Generating fresh hair trends via AI...');

        const result = await ai.generate({
            model: 'gemini-2.5-flash',
            output: { format: 'json', schema: TREND_SCHEMA },
            config: { temperature: 0.7 },
            prompt: GENERATION_PROMPT,
        });

        const { trends } = result.output;
        if (!trends || !trends.length) {
            console.warn('🌊 Trend generation returned empty — skipping DB write');
            return;
        }

        // Expire existing AI-generated trends, insert new batch
        await pgClient.query(
            `UPDATE hair_trends SET active = FALSE WHERE source = 'ai-generated'`
        );

        for (const t of trends) {
            await pgClient.query(
                `INSERT INTO hair_trends
                   (trend_name, description, category, relevance_stages, trend_score, source, active, generated_at, expires_at)
                 VALUES ($1, $2, $3, $4, $5, 'ai-generated', TRUE, NOW(), NOW() + INTERVAL '48 hours')`,
                [t.trend_name, t.description, t.category, t.relevance_stages, t.trend_score]
            );
        }

        // Bust Redis cache so next read fetches fresh data
        if (redisClient) {
            await redisClient.del(REDIS_KEY).catch(() => {});
        }

        console.log(`🌊 ${trends.length} hair trends generated and saved`);
    } catch (err) {
        console.error('🌊 Trend generation failed:', err.message);
    } finally {
        if (redisClient) {
            await redisClient.del(REDIS_LOCK_KEY).catch(() => {});
        }
    }
}

// ---------------------------------------------------------------------------
// Trend retrieval
// ---------------------------------------------------------------------------

/**
 * Fetches active trends from Redis (fast) → DB (fallback).
 * Filters to trends relevant to the given stage; if none match, returns top by score.
 *
 * @param {number|null} stage     - Journey stage 1–8, or null
 * @param {number}      limit     - Max trends to return
 * @returns {Promise<Array>}
 */
async function getRelevantTrends(stage = null, limit = 3) {
    // Try Redis first
    try {
        if (redisClient) {
            const cached = await redisClient.get(REDIS_KEY);
            if (cached) {
                const all = JSON.parse(cached);
                return selectTrends(all, stage, limit);
            }
        }
    } catch { /* Redis miss — fall through to DB */ }

    // DB fetch
    try {
        const result = await pgClient.query(
            `SELECT trend_name, description, category, relevance_stages, trend_score
             FROM hair_trends
             WHERE active = TRUE AND expires_at > NOW()
             ORDER BY trend_score DESC
             LIMIT 20`
        );

        const trends = result.rows;

        // Populate Redis for subsequent requests
        if (trends.length > 0 && redisClient) {
            await redisClient.set(REDIS_KEY, JSON.stringify(trends), { EX: REDIS_CACHE_TTL }).catch(() => {});
        }

        return selectTrends(trends, stage, limit);
    } catch (err) {
        console.error('trendManager: DB read failed:', err.message);
        return [];
    }
}

/**
 * Selects the most relevant trends for the given stage.
 * Stage-matched trends come first; remaining slots filled from top-scored.
 */
function selectTrends(allTrends, stage, limit) {
    if (!allTrends.length) return [];

    if (stage) {
        const stageMatch = allTrends.filter(t =>
            Array.isArray(t.relevance_stages) && t.relevance_stages.includes(stage)
        );
        const others = allTrends.filter(t =>
            !Array.isArray(t.relevance_stages) || !t.relevance_stages.includes(stage)
        );
        return [...stageMatch, ...others].slice(0, limit);
    }

    return allTrends.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Context block builder
// ---------------------------------------------------------------------------

/**
 * Builds the trend context string to inject into per-message context.
 * Also triggers background refresh if trends are stale.
 *
 * @param {number|null} stage       - Inferred journey stage
 * @param {string|null} personaType - From personaClassifier
 * @returns {Promise<string>}
 */
async function getTrendContext(stage = null, personaType = null) {
    // Kick off background refresh if stale — never awaited, never blocks
    isTrendsStale().then(stale => {
        if (stale) {
            generateTrends().catch(err =>
                console.error('trendManager: background refresh failed:', err.message)
            );
        }
    }).catch(() => {});

    const trends = await getRelevantTrends(stage, 2);
    if (!trends.length) return '';

    const names = trends.map(t => t.trend_name.toLowerCase()).join('; ');
    return `[Trending in hair care: ${names}]\n`;
}

// ---------------------------------------------------------------------------

module.exports = {
    getTrendContext,
    getRelevantTrends,
    generateTrends,
    isTrendsStale,
    selectTrends, // exported for tests
};
