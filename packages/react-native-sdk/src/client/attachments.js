/**
 * Attachment contract between the app and the server.
 *
 * The server only accepts `data:image/...;base64,` or `https://` image URLs
 * (packages/core/src/imageAttachments.js) and refuses `file:`. Image-picker
 * assets arrive with a `file://` uri, so unless the picker was asked for
 * base64 the photo never reaches the model. This module turns whatever the
 * host hands us into something the server will read, and says plainly what it
 * could not use. Nothing is ever forwarded that the server would silently drop.
 */

const MAX_ATTACHMENTS = 4;
const MAX_BASE64_CHARS = 8 * 1024 * 1024; // ~6 MB of image after base64 expansion

const INLINE_IMAGE = /^data:image\/(?:png|jpe?g|webp|gif|heic|heif);base64,/i;
const REMOTE_IMAGE = /^https:\/\/\S+$/i;

function nameOf(a, i) {
  return a.fileName || a.name || `photo_${i + 1}.jpg`;
}

function normalizeAttachments(list) {
  const ready = [];
  const rejected = [];
  const items = Array.isArray(list) ? list : [];

  items.forEach((a, i) => {
    const name = a && typeof a === 'object' ? nameOf(a, i) : `photo_${i + 1}`;
    if (!a || typeof a !== 'object') {
      rejected.push({ name, reason: 'not_readable' });
      return;
    }
    if (ready.length >= MAX_ATTACHMENTS) {
      rejected.push({ name, reason: 'too_many' });
      return;
    }

    const mime = a.mimeType || a.type || 'image/jpeg';
    let url = a.dataUrl || '';
    if (!url && typeof a.base64 === 'string' && a.base64) {
      url = /^image\//i.test(mime) ? `data:${mime};base64,${a.base64}` : `data:image/jpeg;base64,${a.base64}`;
    }
    if (!url) url = String(a.url || a.uri || '').trim();

    if (INLINE_IMAGE.test(url)) {
      if (url.length > MAX_BASE64_CHARS) {
        rejected.push({ name, reason: 'too_large' });
        return;
      }
      const inlineType = url.slice(5, url.indexOf(';'));
      ready.push({ url, mimeType: inlineType, name });
    } else if (REMOTE_IMAGE.test(url)) {
      ready.push({ url, mimeType: /^image\//i.test(mime) ? mime : 'image/jpeg', name });
    } else {
      // file://, content://, ph://, plain http, javascript:, non-image data: ...
      rejected.push({ name, reason: 'not_readable' });
    }
  });

  return { ready, rejected };
}

module.exports = { MAX_ATTACHMENTS, normalizeAttachments };
