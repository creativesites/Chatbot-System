/**
 * Mya component registry.
 *
 * Keys are the canonical BlockType values the backend already emits
 * (packages/core/src/chatProtocol/types.js). Deliberately not a second
 * vocabulary: the wire already names these families, and inventing parallel
 * names is how the client and server drift apart.
 *
 * Registration is open so the host app can add a component the SDK doesn't
 * ship, without a fork.
 */

const registry = new Map();

/** Canonical block types, mirrored from the server's BlockType enum. */
export const BlockType = {
  TEXT: 'text',
  MARKDOWN: 'markdown',
  DIVIDER: 'divider',
  QUICK_REPLIES: 'quick_replies',
  CONFIRMATION: 'confirmation',
  NAVIGATION: 'navigation',

  GOAL_CARD: 'goal_card',
  GOAL_PROGRESS: 'goal_progress',
  GOAL_LIST: 'goal_list',

  ROUTINE_CARD: 'routine_card',
  ROUTINE_CHECKLIST: 'routine_checklist',
  TODAY_CHECKLIST: 'today_checklist',

  JOURNAL_ENTRY: 'journal_entry',
  JOURNEY_PROGRESS: 'journey_progress',

  HAIR_PROFILE_CARD: 'hair_profile_card',
  HAIR_PROFILE_SUMMARY: 'hair_profile_summary',
  CONSULTATION_CARD: 'consultation_card',
  SERVICE_CARD: 'service_card',

  // Visual Media & Hairstyle Cards (Item D)
  MEDIA_CARD: 'media_card',
  HAIRSTYLE_CARD: 'hairstyle_card',

  PRODUCT: 'product',
  PRODUCT_LIST: 'product_list',
  COMMUNITY_POST: 'community_post',
};

export function registerComponent(type, Component) {
  if (!type || typeof Component !== 'function') return;
  registry.set(String(type).toLowerCase(), Component);
}

export function registerComponents(map) {
  Object.keys(map || {}).forEach((k) => registerComponent(k, map[k]));
}

/**
 * Returns the component for a block type, or null.
 *
 * Null is a normal outcome, not a failure: a newer backend may emit a type this
 * build has never heard of. The caller degrades gracefully rather than throwing.
 */
export function resolveComponent(type) {
  if (!type) return null;
  return registry.get(String(type).toLowerCase()) || null;
}

/** Text-ish blocks are rendered by the message bubble, not as cards. */
export function isInlineTextBlock(type) {
  const t = String(type || '').toLowerCase();
  return t === BlockType.TEXT || t === BlockType.MARKDOWN;
}

export function registeredTypes() {
  return Array.from(registry.keys());
}

/**
 * MYAVANA sells services, not hair products. The server still emits product
 * blocks (partner items from keyword search); showing one would present a
 * partner product as something MYAVANA sells, so these render nothing by
 * design. This is a deliberate hole, not a gap: the contract test allows it
 * only for these types. Remove them from the server and delete this list.
 */
export const SUPPRESSED_TYPES = ['product', 'product_list', 'product_card'];

export function isSuppressedType(type) {
  return SUPPRESSED_TYPES.indexOf(String(type || '').toLowerCase()) !== -1;
}
