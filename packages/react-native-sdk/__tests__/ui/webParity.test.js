/**
 * Ports from the web widget (TASK-008 M2): per-day checklist persistence,
 * day separators, long-press copy, stopped/error copy on messages.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const RN = require('react-native');
const { MemoryStorageAdapter } = require('../../src/storage/StorageAdapter');
const store = require('../../src/ui/checklistStore');
const { dayLabelFor } = require('../../src/ui/MyaChat');
const MyaMessageRow = require('../../src/ui/MyaMessageRow').default;
const { MyaRoutineCard } = require('../../src/ui/rich/cards');

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('checklist persistence (per day)', () => {
  const today = new Date(2026, 9, 21, 10, 0, 0);

  test('ticks round-trip for the same routine and day', async () => {
    const storage = new MemoryStorageAdapter();
    const key = store.checklistKey('Wash day', ['Pre-poo', 'Cleanse']);
    await store.saveChecked(storage, key, new Set(['step-0']), today);
    expect(await store.loadChecked(storage, key, today)).toEqual(['step-0']);
  });

  test('ticks do not carry into another day', async () => {
    const storage = new MemoryStorageAdapter();
    const key = store.checklistKey('Wash day', ['Pre-poo']);
    await store.saveChecked(storage, key, new Set(['step-0']), today);
    const tomorrow = new Date(2026, 9, 22, 8, 0, 0);
    expect(await store.loadChecked(storage, key, tomorrow)).toEqual([]);
  });

  test('entries older than a week are pruned on save', async () => {
    const storage = new MemoryStorageAdapter();
    await store.saveChecked(storage, 'old', new Set(['a']), new Date(2026, 9, 1));
    await store.saveChecked(storage, 'new', new Set(['b']), today);
    const raw = JSON.parse(storage.getItem('mya_checklist_v1'));
    expect(Object.keys(raw).some((k) => k.startsWith('old|'))).toBe(false);
    expect(Object.keys(raw).some((k) => k.startsWith('new|'))).toBe(true);
  });

  test('a regenerated block with the same title and steps maps to the same key', () => {
    expect(store.checklistKey('Wash day', ['A', 'B'])).toBe(store.checklistKey('wash day', ['a', 'b']));
    expect(store.checklistKey('Wash day', ['A', 'B'])).not.toBe(store.checklistKey('Wash day', ['A', 'C']));
  });

  test('the routine card restores saved ticks from storage', async () => {
    const storage = new MemoryStorageAdapter();
    const data = { title: 'Wash day', steps: [{ id: 's1', title: 'Pre-poo' }, { id: 's2', title: 'Cleanse' }] };
    const key = store.checklistKey('Wash day', ['Pre-poo', 'Cleanse']);
    await store.saveChecked(storage, key, new Set(['s1']));
    let tree;
    await TestRenderer.act(async () => {
      tree = TestRenderer.create(
        React.createElement(store.MyaStorageProvider, { value: storage }, React.createElement(MyaRoutineCard, { data }))
      );
      await flush();
    });
    expect(JSON.stringify(tree.toJSON())).toContain('1 of 2 completed');
  });
});

describe('day separators', () => {
  const now = new Date(2026, 9, 21, 12, 0, 0);
  const at = (d, h = 9) => ({ timestamp: new Date(2026, 9, d, h).toISOString() });

  test('first message of the day is labelled; later ones that day are not', () => {
    expect(dayLabelFor(at(21), null, now)).toBe('Today');
    expect(dayLabelFor(at(21, 11), at(21, 9), now)).toBeNull();
  });
  test('yesterday and older dates', () => {
    expect(dayLabelFor(at(20), at(19), now)).toBe('Yesterday');
    expect(dayLabelFor(at(15), null, now)).toMatch(/15/);
  });
  test('messages with no timestamp get no label', () => {
    expect(dayLabelFor({}, null, now)).toBeNull();
  });
});

describe('message row', () => {
  const render = (message) => {
    let tree;
    TestRenderer.act(() => {
      tree = TestRenderer.create(React.createElement(MyaMessageRow, { message, showLabel: true, onRetry: () => {} }));
    });
    return tree;
  };
  const json = (t) => JSON.stringify(t.toJSON());

  test('a stopped reply says so', () => {
    expect(json(render({ id: 'a', role: 'assistant', content: 'partial', stopped: true }))).toContain('Reply stopped');
  });

  test('an interrupted reply shows the copy for its error kind, and keeps its text', () => {
    const out = json(render({ id: 'a', role: 'assistant', content: 'Here is part', error: true, interrupted: true, errorKind: 'offline' }));
    expect(out).toContain('Here is part');
    expect(out).toContain('offline');
  });

  test('long-pressing a bubble opens the share sheet with its text', () => {
    const tree = render({ id: 'u', role: 'user', content: 'hello Mya' });
    const bubble = tree.root.findAll((n) => n.props && typeof n.props.onLongPress === 'function')[0];
    TestRenderer.act(() => bubble.props.onLongPress());
    expect(RN.Share.share).toHaveBeenCalledWith({ message: 'hello Mya' });
  });
});
