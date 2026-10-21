/**
 * Types & Constants for MYAVANA React Native SDK
 *
 * Direct JavaScript implementation for Node/Jest runtime compatibility.
 */

const FrameType = {
  DELTA: 'delta',
  TEXT_DELTA: 'text_delta',
  BLOCK: 'block',
  ACTION: 'action',
  METADATA: 'metadata',
  TOOL_CALL: 'tool_call',
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

  // Myavana Services Blocks
  HAIR_PROFILE_CARD: 'hair_profile_card',
  HAIR_PROFILE_SUMMARY: 'hair_profile_summary',
  CONSULTATION_CARD: 'consultation_card',
  SERVICE_CARD: 'service_card',
  PRODUCT: 'product',
  PRODUCT_CARD: 'product_card',
  PRODUCT_LIST: 'product_list',
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
 * Generate a unique ID with optional prefix.
 * Zero DOM / crypto fallback.
 */
function createId(prefix = 'mya') {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${ts}_${rand}`;
}

module.exports = {
  FrameType,
  BlockType,
  ActionType,
  createId
};
