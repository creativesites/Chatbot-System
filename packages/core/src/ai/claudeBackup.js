/**
 * Claude (Anthropic Messages API) Backup Provider for Mya
 *
 * Used as a resilient fallback when Gemini models are unavailable, overloaded,
 * or quota-limited. Supports:
 *   - Claude Sonnet 5.5 & Haiku 5.5 for standard conversational backup
 *   - Claude Opus 5.5 for complex tasks (multi-image analysis, chemical/scalp
 *     damage diagnostics, full regimen construction, long detailed queries)
 *   - Full tool-calling loop compatible with AiCore's defineTool/dynamicTool
 *   - Vision image attachments (data: URLs and https URLs)
 *
 * Uses native fetch against https://api.anthropic.com/v1/messages (no extra SDK dependency).
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TIMEOUT_MS = 25000;
const MAX_TOOL_LOOPS = 5;
const MAX_IMAGES = 4;

const CLAUDE_MODELS = {
    get opus() {
        return process.env.CLAUDE_OPUS_MODEL || 'claude-opus-5-5';
    },
    get sonnet() {
        return process.env.CLAUDE_SONNET_MODEL || 'claude-sonnet-5-5';
    },
    get haiku() {
        return process.env.CLAUDE_HAIKU_MODEL || 'claude-haiku-5-5';
    },
};

function isClaudeModel(model) {
    return typeof model === 'string' && /^claude-/i.test(model.trim());
}

/**
 * Determine whether a turn qualifies as a complex task that should route to
 * Claude Opus 5.5 first in the backup chain.
 */
function isComplexTask({ message = '', images = [], chatHistory = [] } = {}) {
    const text = typeof message === 'string' ? message : '';
    const imgCount = Array.isArray(images) ? images.length : 0;

    // Multi-photo visual comparison/diagnostics
    if (imgCount >= 2) return true;

    // Long, detailed user prompts
    if (text.length >= 350) return true;

    // Complex clinical/trichology, damage repair, or full personalized regimen planning
    const complexRe =
        /\b(?:chemical\s+burn|alopecia|traction\s+alopecia|seborrheic|dermatitis|psoriasis|severe\s+(?:damage|breakage|thinning|hair\s+loss)|over[- ]?processed|protein\s+overload|moisture\s+overload|complete\s+(?:regimen|routine|hair\s+care\s+plan)|full\s+(?:regimen|wash\s+day\s+plan|hair\s+analysis)|transition(?:ing)?\s+to\s+natural|compare\s+.*\s+and\s+|step[- ]by[- ]step\s+plan)\b/i;
    if (complexRe.test(text)) return true;

    // Deep multi-turn troubleshooting sessions
    if (Array.isArray(chatHistory) && chatHistory.length >= 16 && text.length >= 160) return true;

    return false;
}

/**
 * Ordered Claude backup model list for a turn.
 * - Complex tasks: Opus 5.5 -> Sonnet 5.5 -> Haiku 5.5
 * - Standard turns: Sonnet 5.5 -> Haiku 5.5
 */
function getClaudeBackupModels(context = {}) {
    if (isComplexTask(context)) {
        return [CLAUDE_MODELS.opus, CLAUDE_MODELS.sonnet, CLAUDE_MODELS.haiku];
    }
    return [CLAUDE_MODELS.sonnet, CLAUDE_MODELS.haiku];
}

/**
 * Convert Gemini-style uppercase JSON schema (OBJECT/STRING/ARRAY/NUMBER/BOOLEAN)
 * into standard lowercase JSON Schema expected by Anthropic's `input_schema`.
 */
function geminiSchemaToAnthropicSchema(schema) {
    if (!schema || typeof schema !== 'object') {
        return { type: 'object', properties: {} };
    }
    const rawType = String(schema.type || 'object').toLowerCase();
    const out = { type: rawType };
    if (schema.description) out.description = schema.description;
    if (Array.isArray(schema.enum)) out.enum = schema.enum;

    if (rawType === 'object') {
        const props = {};
        if (schema.properties && typeof schema.properties === 'object') {
            for (const [k, v] of Object.entries(schema.properties)) {
                props[k] = geminiSchemaToAnthropicSchema(v);
            }
        }
        out.properties = props;
        if (Array.isArray(schema.required) && schema.required.length > 0) {
            out.required = schema.required;
        }
    } else if (rawType === 'array' && schema.items) {
        out.items = geminiSchemaToAnthropicSchema(schema.items);
    }

    return out;
}

/**
 * Convert attached images ({ url, mimeType }) into Anthropic base64 image blocks.
 */
async function buildAnthropicImageBlocks(images = [], fetchImpl = globalThis.fetch) {
    const list = Array.isArray(images) ? images.slice(0, MAX_IMAGES) : [];
    const blocks = [];
    for (const img of list) {
        if (!img || !img.url) continue;
        try {
            const dataUrlMatch = String(img.url).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
            if (dataUrlMatch) {
                blocks.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: dataUrlMatch[1],
                        data: dataUrlMatch[2],
                    },
                });
                continue;
            }
            if (typeof fetchImpl !== 'function') continue;
            const res = await fetchImpl(img.url);
            if (!res || !res.ok) continue;
            const data = Buffer.from(await res.arrayBuffer()).toString('base64');
            const mediaType = (res.headers && res.headers.get && res.headers.get('content-type')) || img.mimeType || 'image/jpeg';
            blocks.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: mediaType.split(';')[0].trim(),
                    data,
                },
            });
        } catch (err) {
            console.warn('⚠️ Claude backup: failed to load image attachment:', err.message);
        }
    }
    return blocks;
}

/**
 * Call Anthropic Messages API with tool execution loop.
 */
async function sendClaudeMessage({
    apiKey = process.env.ANTHROPIC_API_KEY,
    model = CLAUDE_MODELS.sonnet,
    system = '',
    message = '',
    history = [],
    tools = [],
    images = [],
    temperature = 0.9,
    maxTokens = DEFAULT_MAX_TOKENS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
}) {
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    if (typeof fetchImpl !== 'function') {
        throw new Error('No fetch implementation available for Claude backup');
    }

    const toolMap = new Map();
    const anthropicTools = [];
    for (const t of Array.isArray(tools) ? tools : []) {
        if (t && t.name && typeof t.execute === 'function') {
            toolMap.set(t.name, t);
            anthropicTools.push({
                name: t.name,
                description: t.description || '',
                input_schema: geminiSchemaToAnthropicSchema(t.parameters),
            });
        }
    }

    // Build messages array (optionally seeded from history)
    const messages = [];
    if (Array.isArray(history)) {
        for (const h of history) {
            if (!h) continue;
            const role = h.role === 'user' ? 'user' : 'assistant';
            const content =
                typeof h.content === 'string'
                    ? h.content
                    : Array.isArray(h.parts)
                    ? h.parts.map((p) => p?.text || '').filter(Boolean).join('\n')
                    : '';
            if (content.trim()) {
                messages.push({ role, content });
            }
        }
    }

    const imageBlocks = await buildAnthropicImageBlocks(images, fetchImpl);
    const userContent =
        imageBlocks.length > 0
            ? [...imageBlocks, { type: 'text', text: String(message || '') }]
            : String(message || '');
    messages.push({ role: 'user', content: userContent });

    const toolCalls = [];
    const toolBlocks = [];

    for (let loop = 0; loop <= MAX_TOOL_LOOPS; loop++) {
        // Claude 5.x models deprecate and reject `temperature` with HTTP 400.
        const body = {
            model,
            max_tokens: maxTokens,
            messages,
            ...(system ? { system: String(system) } : {}),
            ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {}),
        };

        const signal =
            typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
                ? AbortSignal.timeout(timeoutMs)
                : undefined;

        const res = await fetchImpl(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': ANTHROPIC_VERSION,
            },
            body: JSON.stringify(body),
            signal,
        });

        if (!res || !res.ok) {
            let errText = '';
            try {
                errText = await res.text();
            } catch {}
            throw new Error(`Anthropic API HTTP ${res ? res.status : 'no response'}: ${errText.slice(0, 300)}`);
        }

        const data = await res.json();
        const contentBlocks = Array.isArray(data?.content) ? data.content : [];
        const toolUseBlocks = contentBlocks.filter((b) => b && b.type === 'tool_use');

        if (toolUseBlocks.length > 0 && loop < MAX_TOOL_LOOPS) {
            messages.push({ role: 'assistant', content: contentBlocks });
            const toolResults = [];

            for (const call of toolUseBlocks) {
                const tool = toolMap.get(call.name);
                toolCalls.push({ name: call.name, args: call.input || {} });
                let result;
                if (tool) {
                    try {
                        result = await tool.execute(call.input || {});
                        if (result && Array.isArray(result.blocks)) {
                            toolBlocks.push(...result.blocks);
                        }
                    } catch (err) {
                        result = { error: err.message };
                    }
                } else {
                    result = { error: `Tool ${call.name} not implemented.` };
                }

                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: call.id,
                    content: typeof result === 'string' ? result : JSON.stringify(result ?? {}),
                });
            }

            messages.push({ role: 'user', content: toolResults });
            continue;
        }

        const text = contentBlocks
            .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
            .map((b) => b.text)
            .join('\n')
            .trim();

        let output = text;
        let trimmed = text;
        const fenceMatch = trimmed.match(/^```(?:json|mya-blocks|mya|blocks)?\s*([\s\S]*?)```$/i);
        if (fenceMatch && fenceMatch[1]) {
            trimmed = fenceMatch[1].trim();
        }
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                output = JSON.parse(trimmed);
            } catch {
                output = text;
            }
        }

        return { text, output, toolCalls, toolBlocks, modelUsed: model };
    }

    throw new Error(`Claude tool loop exceeded ${MAX_TOOL_LOOPS} iterations for ${model}`);
}

module.exports = {
    ANTHROPIC_API_URL,
    ANTHROPIC_VERSION,
    CLAUDE_MODELS,
    isClaudeModel,
    isComplexTask,
    getClaudeBackupModels,
    geminiSchemaToAnthropicSchema,
    sendClaudeMessage,
};
