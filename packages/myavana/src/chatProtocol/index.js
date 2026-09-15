/**
 * Chat protocol — re-export of the canonical implementation.
 *
 * This directory used to hold a full *copy* of the protocol (types, ndjson,
 * responseParser). The copy drifted: packages/chat-protocol gained the
 * product / media_card / hairstyle_card / community_post block types, and this
 * copy never did. Because packages/myavana/src/index.js loads the parser from
 * here, every one of those blocks the model emitted was hitting
 * normalizeBlockType's `default:` case, being rewritten to a plain text block,
 * and silently disappearing into the prose.
 *
 * That is why "show me box braids" returned a paragraph instead of an image,
 * and why product recommendations never rendered as cards - the model was
 * emitting them correctly the whole time.
 *
 * Re-exporting instead of re-copying means the drift cannot come back. The
 * Dockerfile copies the whole packages/ tree, so this relative path resolves
 * in the container as well as locally.
 */

module.exports = require('../../../chat-protocol/src');
