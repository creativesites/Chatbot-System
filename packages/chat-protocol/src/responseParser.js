/**
 * Semantic Model Output & Block Parser
 *
 * Grounded in GuideLens App response-parsing architecture:
 * - Robust JSON extraction from markdown codeblocks or prose preambles
 * - Balanced brace extraction for resilient JSON extraction
 * - Stringified JSON unwrapping
 * - Normalization of canonical component blocks, quick replies, and interactive actions
 */

const { BlockType, ActionType, createBlockId } = require('./types');

/**
 * Strips legacy XML/HTML-style tags if present
 * @param {string} raw
 * @returns {string}
 */
function sanitizeResponseText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<\/?response[^>]*>/gi, '')
    .replace(/\[?\/response>/gi, '');
}

/**
 * Unwraps double-stringified JSON (e.g. "\"{\\\"blocks\\\": ...}\"")
 * @param {string} raw
 * @returns {string|null}
 */
function unwrapStringifiedJson(raw) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return null;

  const looksJsonLike =
    trimmed.includes('\\"blocks\\"') ||
    trimmed.includes('\\"components\\"') ||
    trimmed.includes('\\"type\\"');

  if (!looksJsonLike) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Resiliently extracts balanced JSON from text by tracking brace depth and string escapes.
 * @param {string} text
 * @returns {string|null}
 */
function extractBalancedJson(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  let lastBalanced = -1;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      if (inString) escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        lastBalanced = i;
        break;
      }
    }
  }

  if (lastBalanced !== -1) {
    return text.slice(start, lastBalanced + 1);
  }

  return null;
}

/**
 * Extracts a candidate JSON string from raw model output.
 * @param {string} raw
 * @returns {string|null}
 */
function extractJsonString(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let trimmed = sanitizeResponseText(raw).trim();

  // Check for unwrapping
  const unwrapped = unwrapStringifiedJson(trimmed);
  if (unwrapped) trimmed = unwrapped.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  // Look for markdown code fence
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const candidate = codeBlockMatch[1].trim();
    if (candidate.startsWith('{') && candidate.endsWith('}')) {
      return candidate;
    }
  }

  // Check between first '{' and last '}'
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    if (candidate.includes('"blocks"') || candidate.includes('"type"') || candidate.includes('"components"')) {
      return candidate;
    }
  }

  return extractBalancedJson(trimmed);
}

/**
 * Normalizes component types across kebab-case, snake_case, and aliases.
 * @param {string} rawType
 * @returns {string}
 */
function normalizeBlockType(rawType) {
  if (!rawType || typeof rawType !== 'string') return BlockType.TEXT;
  const t = rawType.trim().toLowerCase().replace(/-/g, '_');

  switch (t) {
    case 'goal':
    case 'goal_card':
      return BlockType.GOAL_CARD;
    case 'goal_progress':
      return BlockType.GOAL_PROGRESS;
    case 'goal_list':
    case 'goals':
      return BlockType.GOAL_LIST;
    case 'routine':
    case 'routine_card':
      return BlockType.ROUTINE_CARD;
    case 'routine_checklist':
      return BlockType.ROUTINE_CHECKLIST;
    case 'today':
    case 'today_checklist':
    case 'checklist':
      return BlockType.TODAY_CHECKLIST;
    case 'journal':
    case 'journal_entry':
      return BlockType.JOURNAL_ENTRY;
    case 'journey_progress':
    case 'progress':
      return BlockType.JOURNEY_PROGRESS;
    case 'hair_profile':
    case 'hair_profile_summary':
    case 'strand_dna':
      return BlockType.HAIR_PROFILE_SUMMARY;
    case 'consultation':
    case 'consultation_card':
    case 'stylist_triage':
      return BlockType.CONSULTATION_CARD;
    case 'service':
    case 'service_card':
      return BlockType.SERVICE_CARD;
    case 'quick_reply':
    case 'quick_replies':
    case 'suggestions':
      return BlockType.QUICK_REPLIES;
    case 'markdown':
      return BlockType.MARKDOWN;
    case 'divider':
      return BlockType.DIVIDER;
    case 'confirmation':
      return BlockType.CONFIRMATION;
    case 'navigation':
      return BlockType.NAVIGATION;
    case 'text':
    default:
      return BlockType.TEXT;
  }
}

/**
 * Normalizes quick replies array or object.
 * @param {any} input
 * @returns {Array<{ label: string, action?: string, payload?: object }>}
 */
function normalizeQuickReplies(input) {
  if (!input) return [];
  const rawList = Array.isArray(input) ? input : (Array.isArray(input.options) ? input.options : []);

  return rawList.map((item) => {
    if (typeof item === 'string') {
      return {
        type: ActionType.QUICK_REPLY,
        label: item,
        payload: { text: item }
      };
    }
    if (item && typeof item === 'object') {
      return {
        type: item.type || ActionType.QUICK_REPLY,
        label: item.label || item.text || String(item),
        payload: item.payload || {}
      };
    }
    return null;
  }).filter(Boolean);
}

/**
 * Normalizes checklist items.
 * @param {any} items
 * @returns {Array<object>}
 */
function normalizeChecklistItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((step, idx) => {
    if (typeof step === 'string') {
      return {
        id: `step_${idx + 1}`,
        title: step,
        completed: false,
        duration: null
      };
    }
    if (step && typeof step === 'object') {
      return {
        id: step.id || `step_${idx + 1}`,
        title: step.title || step.text || step.name || `Step ${idx + 1}`,
        completed: Boolean(step.completed || step.checked),
        duration: step.duration || null
      };
    }
    return null;
  }).filter(Boolean);
}

/**
 * Parses raw model output text into structured ChatBlocks and metadata.
 * @param {string} rawOutput
 * @returns {{ blocks: Array<object>, text: string, quickReplies: Array<object> }}
 */
function parseModelOutput(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'string') {
    return { blocks: [], text: '', quickReplies: [] };
  }

  const jsonStr = extractJsonString(rawOutput);
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      const blocks = [];
      let fullText = '';
      let extractedQuickReplies = [];

      // Case 1: Standard "blocks" array
      if (Array.isArray(parsed.blocks)) {
        for (const rawBlock of parsed.blocks) {
          if (!rawBlock || typeof rawBlock !== 'object') continue;

          // Unwrap if wrapped as { type: "component", component: { type, data } }
          const blockType = normalizeBlockType(
            rawBlock.type === 'component' && rawBlock.component
              ? rawBlock.component.type
              : rawBlock.type
          );

          const blockData = (rawBlock.type === 'component' && rawBlock.component)
            ? (rawBlock.component.data || {})
            : (rawBlock.data || rawBlock);

          const blockId = rawBlock.id || createBlockId(blockType);

          if (blockType === BlockType.TEXT || blockType === BlockType.MARKDOWN) {
            const textContent = String(blockData.content || blockData.text || rawBlock.content || rawBlock.text || '');
            fullText += (fullText ? '\n\n' : '') + textContent;
            blocks.push({
              id: blockId,
              type: blockType,
              data: { text: textContent }
            });
          } else if (blockType === BlockType.QUICK_REPLIES) {
            const replies = normalizeQuickReplies(blockData.options || blockData.replies || rawBlock.options);
            extractedQuickReplies = extractedQuickReplies.concat(replies);
            blocks.push({
              id: blockId,
              type: BlockType.QUICK_REPLIES,
              data: { replies }
            });
          } else if (blockType === BlockType.TODAY_CHECKLIST || blockType === BlockType.ROUTINE_CHECKLIST) {
            const items = normalizeChecklistItems(blockData.steps || blockData.items);
            blocks.push({
              id: blockId,
              type: blockType,
              data: {
                title: blockData.title || (blockType === BlockType.TODAY_CHECKLIST ? "Today's Checklist" : "Routine Steps"),
                frequency: blockData.frequency || 'Daily',
                steps: items
              },
              actions: rawBlock.actions || [
                { type: ActionType.COMPLETE_STEP, label: 'Complete Step' }
              ]
            });
          } else {
            blocks.push({
              id: blockId,
              type: blockType,
              data: blockData,
              actions: rawBlock.actions || []
            });
          }
        }
      }

      // Check for top-level quickReplies or suggestions
      if (Array.isArray(parsed.quickReplies)) {
        const topReplies = normalizeQuickReplies(parsed.quickReplies);
        extractedQuickReplies = extractedQuickReplies.concat(topReplies);
        if (!blocks.some(b => b.type === BlockType.QUICK_REPLIES)) {
          blocks.push({
            id: createBlockId('qr'),
            type: BlockType.QUICK_REPLIES,
            data: { replies: topReplies }
          });
        }
      }

      if (blocks.length > 0) {
        return {
          blocks,
          text: fullText || (parsed.text ? String(parsed.text) : ''),
          quickReplies: extractedQuickReplies
        };
      }
    } catch (parseErr) {
      // Fall through to plain text fallback if JSON parsing fails
    }
  }

  // Plain prose fallback: Treat entire message as single text block
  const cleanText = sanitizeResponseText(rawOutput).trim();
  return {
    blocks: [
      {
        id: createBlockId('text'),
        type: BlockType.TEXT,
        data: { text: cleanText }
      }
    ],
    text: cleanText,
    quickReplies: []
  };
}

module.exports = {
  sanitizeResponseText,
  unwrapStringifiedJson,
  extractBalancedJson,
  extractJsonString,
  normalizeBlockType,
  normalizeQuickReplies,
  normalizeChecklistItems,
  parseModelOutput
};
