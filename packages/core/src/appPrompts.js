/**
 * Self-Serve Mobile App Prompts Configuration Service
 *
 * Reads active in-app button prompts and screen starter chips from Postgres
 * `app_prompts` (managed via Myavana-Chatbot-Dashboard) with a 5-minute
 * in-memory TTL cache and built-in offline defaults so the mobile app always
 * receives a valid payload even if the table is not yet migrated.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_APP_PROMPTS = [
  {
    prompt_key: 'consult_expert_advice',
    title: 'Get Expert Advice',
    prompt_text: 'I have questions about booking a consultation and preparing for it',
    screen: 'home',
    starter_chips: [
      'How do I prepare for my consultation?',
      'What happens during a HairScope scan?',
      'Virtual vs in-person consultation',
    ],
    is_active: true,
  },
  {
    prompt_key: 'request_stylist',
    title: 'Request a Stylist',
    prompt_text: 'I am looking for a certified MYAVANA stylist near me',
    screen: 'home',
    starter_chips: [
      'Find a stylist in Atlanta, GA',
      'Share my location',
      'What services do MYAVANA salons offer?',
    ],
    is_active: true,
  },
  {
    prompt_key: 'new_analysis',
    title: 'New Analysis',
    prompt_text: 'I want to start a new HairAI analysis and learn about my hair profile',
    screen: 'home',
    starter_chips: ['How does HairAI work?', 'What is included in my HairID?'],
    is_active: true,
  },
  {
    prompt_key: 'hair_diary',
    title: 'Hair Diary',
    prompt_text: 'Help me log a wash day or check-in in my hair diary',
    screen: 'timeline',
    starter_chips: [
      "Log today's wash day",
      'Check my moisture progress',
      'Review my recent entries',
    ],
    is_active: true,
  },
];

let cache = { data: null, loadedAt: 0 };

function clearAppPromptsCache() {
  cache = { data: null, loadedAt: 0 };
}

function normalizePromptRow(row) {
  return {
    key: row.prompt_key,
    prompt_key: row.prompt_key,
    title: row.title,
    promptText: row.prompt_text,
    prompt_text: row.prompt_text,
    screen: row.screen || 'home',
    starterChips: Array.isArray(row.starter_chips) ? row.starter_chips : [],
    starter_chips: Array.isArray(row.starter_chips) ? row.starter_chips : [],
    isActive: row.is_active !== false,
    updatedAt: row.updated_at || null,
  };
}

function buildPayload(rows, source) {
  const prompts = rows.map(normalizePromptRow);
  const byKey = {};
  for (const p of prompts) {
    byKey[p.key] = p;
  }
  return {
    source,
    prompts,
    byKey,
    updatedAt: new Date().toISOString(),
  };
}

async function getAppPrompts(client) {
  if (cache.data && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const pg = client || require('./database').pgClient;
  try {
    const res = await pg.query(
      `SELECT prompt_key, title, prompt_text, screen, starter_chips, is_active, updated_at
         FROM app_prompts
        WHERE is_active IS NOT FALSE
        ORDER BY prompt_key ASC`
    );
    const dbRows = Array.isArray(res?.rows) ? res.rows : [];
    // Merge DB rows over defaults so any newly added default keys still exist
    const mergedMap = new Map(DEFAULT_APP_PROMPTS.map((d) => [d.prompt_key, d]));
    for (const row of dbRows) {
      if (row && row.prompt_key) mergedMap.set(row.prompt_key, row);
    }
    const payload = buildPayload(Array.from(mergedMap.values()), dbRows.length > 0 ? 'database' : 'defaults');
    cache = { data: payload, loadedAt: Date.now() };
    return payload;
  } catch (err) {
    if (err.code !== '42P01') {
      console.warn('[appPrompts] Falling back to default prompts:', err.message);
    }
    return buildPayload(DEFAULT_APP_PROMPTS, 'defaults');
  }
}

module.exports = {
  DEFAULT_APP_PROMPTS,
  getAppPrompts,
  clearAppPromptsCache,
};
