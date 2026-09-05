// agentTools.js
// Defines Genkit tools that the AI can call during conversations.
//
// Two categories:
//   Global tools  — stateless DB lookups, registered once at module load.
//   Dynamic tools — user-scoped actions (saveHairGoal, getUserHairProfile)
//                   created per-request so userId is bound in the closure,
//                   not supplied by the model (avoids hallucination risk).
//
// Usage in index.js:
//   const { globalTools, createUserTools } = require('...agentTools');
//   const tools = [...globalTools, ...createUserTools(userId)];
//   session.chat({ ..., tools });

const { z } = require('zod');
const ai = require('./ai');
const { pgClient } = require('./database');

// ---------------------------------------------------------------------------
// Global tools (no user context — safe to register once)
// ---------------------------------------------------------------------------

/**
 * Search Myavana services and partner products by keyword.
 * ILIKE match against name, description, and category columns.
 * Partner products are stored in a separate table once available.
 */
const searchServices = ai.defineTool(
    {
        name: 'searchServices',
        description:
            'Search Myavana services and partner products by keyword, hair concern, or category. ' +
            'Call this when the user asks what services Myavana offers, asks for product or service recommendations, ' +
            'or mentions a specific concern (e.g. "moisture", "curl analysis", "damage repair", "membership"). ' +
            'Returns matching service/product names, descriptions, and any pricing or URL info available.',
        inputSchema: z.object({
            query: z.string().describe(
                'Search keyword — hair concern, service type, or product name ' +
                '(e.g. "moisture treatment", "analysis", "subscription")'
            ),
            limit: z.number().int().min(1).max(10).optional().describe(
                'Max number of results to return (default 5)'
            ),
        }),
        outputSchema: z.array(z.record(z.unknown())),
    },
    async ({ query, limit = 5 }) => {
        const pattern = `%${query}%`;
        try {
            // Search Myavana services
            const servicesResult = await pgClient.query(
                `SELECT * FROM products
                 WHERE product_name ILIKE $1
                    OR description   ILIKE $1
                    OR category      ILIKE $1
                 LIMIT $2`,
                [pattern, limit]
            );

            // Search partner products if table exists
            let partnerRows = [];
            try {
                const partnerResult = await pgClient.query(
                    `SELECT *, 'partner' AS source FROM partner_products
                     WHERE product_name ILIKE $1
                        OR description  ILIKE $1
                        OR brand_name   ILIKE $1
                     LIMIT $2`,
                    [pattern, limit]
                );
                partnerRows = partnerResult.rows;
            } catch {
                // partner_products table doesn't exist yet — skip silently
            }

            const combined = [...servicesResult.rows, ...partnerRows].slice(0, limit);
            return combined.length > 0
                ? combined
                : [{ message: `No services or products found matching "${query}".` }];
        } catch (err) {
            console.error('searchServices tool error:', err.message);
            return [{ error: 'Service search temporarily unavailable.' }];
        }
    }
);

/**
 * Search FAQs by keyword.
 * ILIKE match against both question and answer text so the AI can ground
 * brand-specific factual answers rather than guessing.
 */
const lookupFAQ = ai.defineTool(
    {
        name: 'lookupFAQ',
        description:
            'Look up Myavana FAQ entries by keyword. ' +
            'Call this when the user asks a factual question about Myavana (pricing, policies, how something works, ' +
            'shipping, cancellations, what is included in a service) where you want to ground your answer in ' +
            'official content rather than inference.',
        inputSchema: z.object({
            query: z.string().describe(
                'The topic or question to search for in FAQs (e.g. "cancel subscription", "how does analysis work")'
            ),
            limit: z.number().int().min(1).max(5).optional().describe(
                'Max results to return (default 3)'
            ),
        }),
        outputSchema: z.array(z.object({
            question: z.string().optional(),
            answer:   z.string().optional(),
        }).passthrough()),
    },
    async ({ query, limit = 3 }) => {
        const pattern = `%${query}%`;
        try {
            const result = await pgClient.query(
                `SELECT * FROM faqs
                 WHERE question ILIKE $1 OR answer ILIKE $1
                 LIMIT $2`,
                [pattern, limit]
            );
            return result.rows.length > 0
                ? result.rows
                : [{ question: query, answer: `No FAQ found for "${query}". Answer based on your knowledge.` }];
        } catch (err) {
            console.error('lookupFAQ tool error:', err.message);
            return [{ error: 'FAQ lookup temporarily unavailable.' }];
        }
    }
);

// ---------------------------------------------------------------------------
// Dynamic tools (per-request, userId bound in closure)
// ---------------------------------------------------------------------------

/**
 * Factory — call once per request to get user-scoped tools.
 * @param {string} userId
 * @returns {import('genkit').ToolAction[]}
 */
function createUserTools(userId) {
    /**
     * Save a hair goal the user has explicitly stated.
     * Appended to user_preferences.hair_priorities JSONB so it persists across sessions.
     */
    const saveHairGoal = ai.dynamicTool(
        {
            name: 'saveHairGoal',
            description:
                'Save a specific hair goal the user has clearly stated they want to achieve. ' +
                'Call this when the user explicitly says something like "my goal is...", "I want to...", ' +
                '"I\'m trying to...", or "I\'d love to achieve...". ' +
                'Do NOT call this for vague preferences — only concrete, stated goals. ' +
                'Confirm to the user that their goal has been saved.',
            inputSchema: z.object({
                goal: z.string().describe(
                    'The specific hair goal stated by the user, in their own words ' +
                    '(e.g. "grow hair 4 inches by December", "retain moisture without frizz", "transition to natural")'
                ),
            }),
            outputSchema: z.object({ saved: z.boolean(), goal: z.string() }),
        },
        async ({ goal }) => {
            try {
                await pgClient.query(
                    `INSERT INTO user_preferences (user_id, hair_priorities)
                     VALUES ($1, $2::jsonb)
                     ON CONFLICT (user_id) DO UPDATE SET
                       hair_priorities = COALESCE(user_preferences.hair_priorities, '{}') || $2::jsonb`,
                    [
                        userId,
                        JSON.stringify({
                            goals: goal,
                            savedAt: new Date().toISOString(),
                        }),
                    ]
                );
                console.log(`🎯 Hair goal saved for ${userId}: ${goal}`);
                return { saved: true, goal };
            } catch (err) {
                console.error('saveHairGoal tool error:', err.message);
                return { saved: false, goal };
            }
        }
    );

    /**
     * Fetch the user's current hair profile from the DB.
     * Useful mid-conversation when the cached system prompt may be stale (>24h old)
     * and the user's hair type or concerns have been updated since.
     */
    const getUserHairProfile = ai.dynamicTool(
        {
            name: 'getUserHairProfile',
            description:
                'Retrieve the current hair profile on file for this user: hair type, texture, concerns, goals, ' +
                'porosity, and other stored attributes. ' +
                'Call this when you need to personalize a recommendation but are unsure whether your context ' +
                'has the most up-to-date profile, or when the user references a characteristic you don\'t have.',
            inputSchema: z.object({}),
            outputSchema: z.record(z.unknown()),
        },
        async () => {
            try {
                const result = await pgClient.query(
                    `SELECT hair_type, hair_concerns, hair_texture, porosity, elasticity, density,
                            curl_pattern, hair_goals, hair_concerns, damage_level_self_reported,
                            confidence_level_inferred, experimenting_interest
                     FROM users WHERE user_id = $1`,
                    [userId]
                );
                if (result.rows.length === 0) {
                    return { message: 'No hair profile on file yet for this user.' };
                }
                // Strip null fields to keep context concise
                const profile = Object.fromEntries(
                    Object.entries(result.rows[0]).filter(([, v]) => v !== null && v !== undefined)
                );
                return Object.keys(profile).length > 0
                    ? profile
                    : { message: 'Hair profile exists but no attributes recorded yet.' };
            } catch (err) {
                console.error('getUserHairProfile tool error:', err.message);
                return { error: 'Hair profile temporarily unavailable.' };
            }
        }
    );

    /**
     * When the Hair Journey system of record is unreachable, the provider sets
     * `available: false` and returns empty collections. Passing those straight
     * to the model is indistinguishable from "this member has none", and the
     * model then states the absence as fact — telling a member with an active
     * goal that she has no goals recorded.
     *
     * An absence and an outage are different answers. This makes the
     * difference explicit and unmissable in the tool result.
     */
    const unreachable = (what) => ({
        dataUnavailable: true,
        systemOfRecordReachable: false,
        error: `The Hair Journey system of record is unreachable, so ${what} could not be read.`,
        instruction:
            'Do NOT state or imply that the member has no ' + what + '. You do not know that. ' +
            'Tell them you cannot reach their Hair Journey right now and to try again shortly.'
    });

    /**
     * Hair Journey Integration Tools
     */
    const { HairJourneyService } = require('./hairJourney/hairJourneyService');
    const hairJourneyService = new HairJourneyService();

    const getHairGoals = ai.dynamicTool(
        {
            name: 'getHairGoals',
            description:
                'Retrieve the user\'s active hair goals, target metrics (e.g. length in inches), target dates, and percentage progress from the Hair Journey system. ' +
                'Call this when the user asks about their goals, asks how close they are to a milestone, or when reviewing progress.',
            inputSchema: z.object({}),
            outputSchema: z.record(z.unknown()),
        },
        async () => {
            try {
                const { result, blocks } = await hairJourneyService.getGoalsWithBlocks(userId);
                if (result && result.available === false) return unreachable('hair goals');
                return {
                    goals: result.goals || [],
                    overview: result.overview || {},
                    blocks
                };
            } catch (err) {
                console.error('getHairGoals tool error:', err.message);
                return { error: 'Goals temporarily unavailable.' };
            }
        }
    );

    const getTodayJourney = ai.dynamicTool(
        {
            name: 'getTodayJourney',
            description:
                'Retrieve today\'s hair care checklist, routine steps for the day, and current care streak. ' +
                'Call this when the user asks what they should do today, asks about their wash day steps, or asks for today\'s checklist.',
            inputSchema: z.object({}),
            outputSchema: z.record(z.unknown()),
        },
        async () => {
            try {
                const { result, blocks } = await hairJourneyService.getTodayWithBlocks(userId);
                if (result && result.available === false) return unreachable("today's checklist");
                return {
                    date: result.date,
                    checklist: result.checklist || [],
                    streakDays: result.streakDays,
                    blocks
                };
            } catch (err) {
                console.error('getTodayJourney tool error:', err.message);
                return { error: 'Today hub temporarily unavailable.' };
            }
        }
    );

    const getHairRoutines = ai.dynamicTool(
        {
            name: 'getHairRoutines',
            description:
                'Retrieve the user\'s defined hair care routines (e.g. wash day, nightly maintenance, L.O.C. method steps) and product cabinet. ' +
                'Call this when the user asks about their routine schedule or regimen.',
            inputSchema: z.object({}),
            outputSchema: z.record(z.unknown()),
        },
        async () => {
            try {
                const { result, blocks } = await hairJourneyService.getRoutinesWithBlocks(userId);
                if (result && result.available === false) return unreachable('hair routines');
                return {
                    routines: result.routines || [],
                    cabinet: result.cabinet || [],
                    blocks
                };
            } catch (err) {
                console.error('getHairRoutines tool error:', err.message);
                return { error: 'Routines temporarily unavailable.' };
            }
        }
    );

    const completeRoutineStep = ai.dynamicTool(
        {
            name: 'completeRoutineStep',
            description:
                'Mark a specific routine step as completed for today (e.g. deep condition with heat, hydration mist). ' +
                'Call this when the user says they completed, did, or finished a routine step.',
            inputSchema: z.object({
                stepId: z.string().describe('ID or name of the routine step completed'),
            }),
            outputSchema: z.record(z.unknown()),
        },
        async ({ stepId }) => {
            try {
                const res = await hairJourneyService.completeStep(userId, stepId);
                return { success: true, stepId, message: 'Step marked completed.' };
            } catch (err) {
                console.error('completeRoutineStep tool error:', err.message);
                return { success: false, error: err.message };
            }
        }
    );

    const updateHairGoal = ai.dynamicTool(
        {
            name: 'updateHairGoal',
            description:
                'Update a hair goal\'s target metric (e.g. "5 Inches") or target date (e.g. "November 2026"). ' +
                'Call this when the user explicitly requests to change or adjust a goal.',
            inputSchema: z.object({
                goalId: z.string().describe('The ID of the goal to update'),
                targetMetric: z.string().optional().describe('New target metric, e.g. "5 Inches"'),
                targetDate: z.string().optional().describe('New target date, e.g. "November 2026"'),
            }),
            outputSchema: z.record(z.unknown()),
        },
        async ({ goalId, targetMetric, targetDate }) => {
            try {
                const res = await hairJourneyService.updateGoal(userId, goalId, { targetMetric, targetDate });
                return { success: true, goalId, targetMetric, targetDate, message: 'Goal updated successfully.' };
            } catch (err) {
                console.error('updateHairGoal tool error:', err.message);
                return { success: false, error: err.message };
            }
        }
    );

    const createJournalEntry = ai.dynamicTool(
        {
            name: 'createJournalEntry',
            description:
                'Log a hair journey journal entry or progress check-in (e.g. wash day results, moisture level, notes, photo milestone). ' +
                'Call this when the user wants to log, write, or record something in their journal or hair diary, or after snapping a progress photo.',
            inputSchema: z.object({
                title: z.string().describe('Short title for the journal entry, e.g. "Sunday Wash Day" or "Twist Out Check-in"'),
                notes: z.string().describe('Observations or notes about the hair, products used, scalp feel, or results'),
                entryType: z.enum(['wash_day', 'quick_checkin', 'length_check', 'milestone']).optional().describe('Type of entry (default quick_checkin)'),
                moistureLevel: z.number().int().min(1).max(5).optional().describe('Rating from 1 (very dry) to 5 (optimally hydrated)'),
                scalpState: z.string().optional().describe('Scalp condition, e.g. "Calm, clean" or "Slight flaking"'),
            }),
            outputSchema: z.record(z.unknown()),
        },
        async ({ title, notes, entryType = 'quick_checkin', moistureLevel = 4, scalpState = 'Healthy' }) => {
            try {
                const { result, blocks } = await hairJourneyService.createJournalEntryWithBlock(userId, {
                    title,
                    notes,
                    entryType,
                    moistureLevel,
                    scalpState,
                    date: new Date().toISOString().split('T')[0]
                });
                return {
                    success: true,
                    entry: result,
                    blocks,
                    message: 'Journal entry recorded successfully.'
                };
            } catch (err) {
                console.error('createJournalEntry tool error:', err.message);
                return { success: false, error: err.message };
            }
        }
    );

    const getJournalEntries = ai.dynamicTool(
        {
            name: 'getJournalEntries',
            description:
                'Retrieve recent journal entries and logged progress notes from the user\'s hair journey. ' +
                'Call this when the user asks what they logged recently, asks about past wash days, or reviews their hair history.',
            inputSchema: z.object({
                perPage: z.number().int().min(1).max(10).optional().describe('Number of entries to retrieve (default 3)'),
            }),
            outputSchema: z.record(z.unknown()),
        },
        async ({ perPage = 3 } = {}) => {
            try {
                const { result, blocks } = await hairJourneyService.getJournalEntriesWithBlocks(userId, { perPage });
                if (result && result.available === false) return unreachable('journal entries');
                return {
                    items: result.items || [],
                    total: result.total || 0,
                    blocks
                };
            } catch (err) {
                console.error('getJournalEntries tool error:', err.message);
                return { error: 'Journal entries temporarily unavailable.' };
            }
        }
    );

    return [
        saveHairGoal,
        getUserHairProfile,
        getHairGoals,
        getTodayJourney,
        getHairRoutines,
        completeRoutineStep,
        updateHairGoal,
        createJournalEntry,
        getJournalEntries,
    ];
}

// ---------------------------------------------------------------------------

const globalTools = [searchServices, lookupFAQ];

module.exports = { globalTools, createUserTools };
