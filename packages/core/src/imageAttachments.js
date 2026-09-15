/**
 * Image attachments on a chat turn.
 *
 * The web widget sends photos inline as data: URLs; the mobile SDK may send
 * https links. The AI core fetches every URL it is given in order to inline
 * the pixels for Gemini - so this is also the allowlist for what the server
 * will fetch on a client's behalf. Plain http, file:, javascript: and non-image
 * data: URLs are refused outright.
 */

const MAX_IMAGE_ATTACHMENTS = 4;

const INLINE_IMAGE = /^data:image\/(?:png|jpe?g|webp|gif|heic|heif);base64,/i;
const REMOTE_IMAGE = /^https:\/\/\S+$/i;

/**
 * @param {Array<{url?: string, uri?: string, payload?: {url?: string}, mimeType?: string, type?: string}>} attachments
 * @returns {Array<{url: string, mimeType: string}>} at most MAX_IMAGE_ATTACHMENTS
 */
function extractImageAttachments(attachments) {
    if (!Array.isArray(attachments)) return [];
    const images = [];
    for (const attachment of attachments) {
        if (images.length >= MAX_IMAGE_ATTACHMENTS) break;
        if (!attachment || typeof attachment !== 'object') continue;
        const url = String(attachment.url || attachment.uri || (attachment.payload && attachment.payload.url) || '').trim();
        if (!INLINE_IMAGE.test(url) && !REMOTE_IMAGE.test(url)) continue;
        const declared = attachment.mimeType || attachment.type;
        const inlineType = INLINE_IMAGE.test(url) ? url.slice(5, url.indexOf(';')) : null;
        images.push({ url, mimeType: inlineType || (typeof declared === 'string' && /^image\//.test(declared) ? declared : 'image/jpeg') });
    }
    return images;
}

module.exports = { MAX_IMAGE_ATTACHMENTS, extractImageAttachments };
