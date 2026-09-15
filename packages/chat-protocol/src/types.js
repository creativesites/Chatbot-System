/**
 * Canonical Chat Protocol Types & Constants
 *
 * Defines the wire frame types, semantic component blocks, and interactive actions
 * shared across the Mya backend, Web Widget, Chatbot Dashboard, and React Native SDK.
 */

const FrameType = {
  DELTA: 'delta',
  BLOCK: 'block',
  ACTION: 'action',
  DONE: 'done',
  ERROR: 'error'
};

const BlockType = {
  // Conversational Blocks
  TEXT: 'text',
  MARKDOWN: 'markdown',
  DIVIDER: 'divider',
  QUICK_REPLIES: 'quick_replies',
  CONFIRMATION: 'confirmation',
  NAVIGATION: 'navigation',

  // Hair Journey Blocks
  GOAL_CARD: 'goal_card',
  GOAL_PROGRESS: 'goal_progress',
  GOAL_LIST: 'goal_list',
  ROUTINE_CARD: 'routine_card',
  ROUTINE_CHECKLIST: 'routine_checklist',
  TODAY_CHECKLIST: 'today_checklist',
  JOURNAL_ENTRY: 'journal_entry',
  JOURNEY_PROGRESS: 'journey_progress',

  // Myavana Services & Products
  HAIR_PROFILE_CARD: 'hair_profile_card',
  HAIR_PROFILE_SUMMARY: 'hair_profile_summary',
  CONSULTATION_CARD: 'consultation_card',
  SERVICE_CARD: 'service_card',
  PRODUCT: 'product',
  PRODUCT_LIST: 'product_list',

  // Media & Community
  MEDIA_CARD: 'media_card',
  HAIRSTYLE_CARD: 'hairstyle_card',
  COMMUNITY_POST: 'community_post'
};

const ActionType = {
  NAVIGATE: 'navigate',
  COMPLETE_STEP: 'complete_step',
  CREATE_GOAL: 'create_goal',
  UPDATE_GOAL: 'update_goal',
  LOG_ENTRY: 'log_entry',
  UPLOAD_PHOTO: 'upload_photo',
  QUICK_REPLY: 'quick_reply',
  OPEN_URL: 'open_url'
};

/**
 * Creates a unique block identifier.
 * @param {string} prefix
 * @returns {string}
 */
function createBlockId(prefix = 'blk') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

module.exports = {
  FrameType,
  BlockType,
  ActionType,
  createBlockId
};
