const { createThreadRowDeriver, dayLabelFor, filterUserSalutations } = require('../../src/ui/thread/deriveThreadRows');

const NOW = new Date('2026-11-11T12:00:00Z');

// The derivation MyaChat had inline before this module, kept verbatim as the oracle.
function legacyRows(messages, now = NOW) {
  const list = (Array.isArray(messages) ? messages : []).filter(
    (m) =>
      m &&
      ((m.content && String(m.content).trim().length > 0) ||
        (m.blocks && m.blocks.length > 0) ||
        (m.attachments && m.attachments.length > 0) ||
        m.isStreaming ||
        m.isThinking)
  );
  return list
    .map((m, i) => ({
      ...m,
      content: m.role !== 'user' && m.content ? filterUserSalutations(m.content) : m.content,
      blocks: m.blocks ? [...m.blocks] : [],
      isPhotoTurn:
        m.role !== 'user' &&
        i > 0 &&
        list[i - 1].role === 'user' &&
        ((list[i - 1].attachments && list[i - 1].attachments.length > 0) ||
          String(list[i - 1].content || '').includes('[Photo Attached:')),
      _dayLabel: dayLabelFor(m, i > 0 ? list[i - 1] : null, now),
      _showLabel: m.role !== 'user' && (i === 0 || list[i - 1].role === 'user'),
      _key: m.id || `${m.role}-${m.timestamp || ''}-${i}`,
    }))
    .reverse();
}

function thread() {
  return [
    { id: 'u1', role: 'user', content: '[Photo Attached: a.jpg] how is this?', timestamp: '2026-11-10T09:00:00Z' },
    { id: 'a1', role: 'assistant', content: 'Hi Candace, looks hydrated.', timestamp: '2026-11-10T09:00:05Z', blocks: [{ id: 'b1', type: 'goal_card', data: { title: 'Length' } }] },
    { id: 'empty', role: 'assistant', content: '   ', timestamp: '2026-11-10T09:01:00Z' },
    { id: 'u2', role: 'user', content: 'thanks', timestamp: '2026-11-11T08:00:00Z' },
    { role: 'assistant', content: 'Any time.', timestamp: '2026-11-11T08:00:02Z' },
    { id: 'a3', role: 'assistant', content: 'One more thing.', timestamp: '2026-11-11T08:00:03Z' },
  ];
}

describe('deriveThreadRows', () => {
  test('produces the same rows as the previous inline derivation', () => {
    const derive = createThreadRowDeriver({ now: () => NOW });
    expect(derive(thread())).toEqual(legacyRows(thread()));
  });

  test('handles empty and malformed input', () => {
    const derive = createThreadRowDeriver({ now: () => NOW });
    expect(derive(undefined)).toEqual([]);
    expect(derive([null, 3, 'x'])).toEqual([]);
  });

  test('unchanged rows keep their identity while the tail streams', () => {
    const derive = createThreadRowDeriver({ now: () => NOW });
    const base = thread();
    const live = { id: 'a4', role: 'assistant', content: '', isStreaming: true, timestamp: '2026-11-11T08:01:00Z', blocks: [] };
    const first = derive([...base, live]);
    const second = derive([...base, { ...live, content: 'Word' }]);
    // index 0 is the newest (inverted list)
    expect(second[0]).not.toBe(first[0]);
    expect(second[0].content).toBe('Word');
    for (let i = 1; i < first.length; i++) expect(second[i]).toBe(first[i]);
  });

  test('block objects are passed through by reference', () => {
    const derive = createThreadRowDeriver({ now: () => NOW });
    const msgs = thread();
    const rows = derive(msgs);
    const a1 = rows.find((r) => r.id === 'a1');
    expect(a1.blocks[0]).toBe(msgs[1].blocks[0]);
  });

  test('normalize runs once per message object and never on a live message', () => {
    const derive = createThreadRowDeriver({ now: () => NOW });
    const normalize = jest.fn((m) => ({ ...m, content: String(m.content).toUpperCase() }));
    const base = thread();
    const live = { id: 'live', role: 'assistant', content: 'partial', isStreaming: true };
    derive([...base, live], { normalize });
    derive([...base, { ...live, content: 'partial more' }], { normalize });
    derive([...base, { ...live, content: 'partial more words' }], { normalize });
    expect(normalize).toHaveBeenCalledTimes(base.length);
    expect(normalize.mock.calls.some(([m]) => m.isStreaming)).toBe(false);
  });

  test('a normalizer that mints ids still yields a stable key', () => {
    const derive = createThreadRowDeriver({ now: () => NOW });
    let n = 0;
    const normalize = (m) => ({ ...m, id: m.id || `minted-${(n += 1)}` });
    const msgs = [{ role: 'assistant', content: 'no id here', timestamp: '2026-11-11T08:00:00Z' }];
    const k1 = derive(msgs, { normalize })[0]._key;
    const k2 = derive(msgs, { normalize })[0]._key;
    expect(k1).toBe(k2);
  });

  test('a row is rebuilt when a neighbour changes its derived fields', () => {
    const derive = createThreadRowDeriver({ now: () => NOW });
    const a = { id: 'a', role: 'assistant', content: 'reply', timestamp: '2026-11-11T08:00:00Z' };
    const before = derive([a]);
    expect(before[0]._showLabel).toBe(true);
    const after = derive([{ id: 'z', role: 'assistant', content: 'earlier', timestamp: '2026-11-11T07:00:00Z' }, a]);
    expect(after[0]._showLabel).toBe(false);
  });
});
