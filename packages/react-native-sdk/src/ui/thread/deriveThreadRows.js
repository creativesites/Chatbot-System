/**
 * Thread rows for MyaChat's inverted FlatList.
 *
 * MyaChat used to rebuild every row object whenever `messages` changed, which
 * during a stream is every chunk. New row objects meant every memoised
 * MyaMessageRow had to deep-compare its blocks, and anything that normalised
 * messages in that path (history deserialisation) re-ran over the whole thread
 * per token.
 *
 * This keeps the exact same output but makes the work proportional to what
 * changed:
 *   - `normalize` runs at most once per message object (WeakMap cache);
 *   - a row object is reused while its message object and its neighbour-derived
 *     fields (day label, sender label, photo turn, key) are unchanged, so an
 *     unchanged row keeps its identity and React can skip it by reference.
 *
 * Streaming messages are never normalised (they are still being built), which
 * matches the behaviour the render path already had.
 */

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today", "Yesterday" or a short date when the day changes; null otherwise. */
export function dayLabelFor(message, previous, now = new Date()) {
  const t = message && message.timestamp ? new Date(message.timestamp) : null;
  if (!t || Number.isNaN(t.getTime())) return null;
  const p = previous && previous.timestamp ? new Date(previous.timestamp) : null;
  if (p && !Number.isNaN(p.getTime()) && sameDay(t, p)) return null;
  if (sameDay(t, now)) return 'Today';
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(t, y)) return 'Yesterday';
  return t.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Mya greets by name in the welcome, so a reply that opens with "Hi Candace," reads twice. */
export function filterUserSalutations(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/^(?:Hi|Hello|Hey|Greetings|Welcome|Dear)\s+[A-Za-z0-9_.-]+(?:\s+[A-Za-z0-9_.-]+)?[,!:]\s*/i, '')
    .replace(/^(?:Hi|Hello|Hey|Greetings)\s+there[,!:]\s*/i, '')
    .trim();
}

function hasRenderableContent(m) {
  return (
    m &&
    ((m.content && String(m.content).trim().length > 0) ||
      (m.blocks && m.blocks.length > 0) ||
      (m.attachments && m.attachments.length > 0) ||
      m.isStreaming ||
      m.isThinking)
  );
}

function isPhotoTurnFor(m, prev) {
  return (
    m.role !== 'user' &&
    !!prev &&
    prev.role === 'user' &&
    ((prev.attachments && prev.attachments.length > 0) || String(prev.content || '').includes('[Photo Attached:'))
  );
}

/**
 * Create a deriver with its own caches. Keep one per screen (useRef) so the
 * caches live as long as the thread does.
 *
 * @param {{ now?: () => Date }} [opts]
 * @returns {(messages: Array, options?: { normalize?: (m: object) => object }) => Array}
 */
export function createThreadRowDeriver(opts = {}) {
  const clock = opts.now || (() => new Date());
  let normalized = new WeakMap(); // raw message -> normalized message
  let rows = new WeakMap(); // normalized message -> last row built from it
  let lastNormalize = null;

  return function deriveThreadRows(messages, options = {}) {
    const normalize = options.normalize || null;
    if (normalize !== lastNormalize) {
      // A different normaliser can produce different output; start over.
      normalized = new WeakMap();
      rows = new WeakMap();
      lastNormalize = normalize;
    }
    const now = clock();
    const source = Array.isArray(messages) ? messages : [];

    const list = [];
    for (const raw of source) {
      if (!raw || typeof raw !== 'object') continue;
      let m = raw;
      if (normalize && !raw.isStreaming) {
        m = normalized.get(raw);
        if (!m) {
          m = normalize(raw) || raw;
          normalized.set(raw, m);
        }
      }
      if (hasRenderableContent(m)) list.push(m);
    }

    const out = new Array(list.length);
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const prev = i > 0 ? list[i - 1] : null;
      const isPhotoTurn = isPhotoTurnFor(m, prev);
      const dayLabel = dayLabelFor(m, prev, now);
      const showLabel = m.role !== 'user' && (i === 0 || prev.role === 'user');
      const key = m.id || `${m.role}-${m.timestamp || ''}-${i}`;

      const cached = rows.get(m);
      if (
        cached &&
        cached.isPhotoTurn === isPhotoTurn &&
        cached._dayLabel === dayLabel &&
        cached._showLabel === showLabel &&
        cached._key === key
      ) {
        out[i] = cached;
        continue;
      }

      const row = {
        ...m,
        content: m.role !== 'user' && m.content ? filterUserSalutations(m.content) : m.content,
        // Same array when there is one: block objects keep their identity, so a
        // row's memo can compare them by reference.
        blocks: m.blocks || [],
        isPhotoTurn,
        _dayLabel: dayLabel,
        _showLabel: showLabel,
        _key: key,
      };
      rows.set(m, row);
      out[i] = row;
    }
    // Inverted list: newest first.
    return out.reverse();
  };
}
