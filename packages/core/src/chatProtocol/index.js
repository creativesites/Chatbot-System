/**
 * Chat protocol — re-export of the canonical implementation.
 *
 * This was a full copy of packages/chat-protocol that had drifted out of date
 * (missing the product / media_card / hairstyle_card / community_post block
 * types). hairJourneyService builds blocks against these BlockType constants,
 * so a stale copy here means blocks built with a type this file has never
 * heard of get an `undefined` type and are dropped downstream.
 *
 * Re-exporting instead of re-copying means the drift cannot come back. The
 * Dockerfile copies the whole packages/ tree, so this relative path resolves
 * in the container as well as locally.
 */

module.exports = require('../../../chat-protocol/src');
