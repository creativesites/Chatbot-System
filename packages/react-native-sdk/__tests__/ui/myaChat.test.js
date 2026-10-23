/**
 * Smoke test for the promoted screen body. Mounts MyaChat with the real hook
 * and client (no network) against stubbed react-native.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { MemoryStorageAdapter } = require('../../src/storage/StorageAdapter');
const MyaChat = require('../../src/ui/MyaChat').default;

beforeAll(() => { global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '' })); });

function mount(props = {}) {
  let tree;
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      React.createElement(MyaChat, {
        apiBase: 'https://x.test',
        storage: new MemoryStorageAdapter(),
        userId: 'user_A',
        userName: 'Candace Smith',
        screen: { name: 'Dashboard', title: 'Dashboard' },
        starters: [{ id: 's1', label: 'Walk me through wash day', prompt: 'Walk me through wash day' }],
        ...props,
      })
    );
  });
  return tree;
}
const json = (t) => JSON.stringify(t.toJSON());

describe('MyaChat (promoted screen body)', () => {
  test('renders the welcome with the member name and starters', () => {
    const out = json(mount());
    expect(out).toContain('Candace');
    expect(out).toContain('Walk me through wash day');
  });

  test('shows the add-photo button when photos are enabled', () => {
    expect(json(mount())).toContain('Add a photo');
  });

  test('photosInChat={false} removes photo attach from the composer', () => {
    expect(json(mount({ photosInChat: false }))).not.toMatch(/accessibilityLabel":"Add a photo"/);
  });

  test('host menu items are accepted without crashing', () => {
    const t = mount({ menuItems: [{ key: 'x', icon: 'sunny-outline', title: 'Today’s Hair Weather', onPress: () => {} }] });
    expect(t.toJSON()).not.toBeNull();
  });

  test('missing apiBase throws in dev (no staging fallback)', () => {
    const orig = process.env.MYA_API_BASE;
    delete process.env.MYA_API_BASE;
    expect(() => mount({ apiBase: undefined })).toThrow(/apiBase/);
    if (orig) process.env.MYA_API_BASE = orig;
  });
});
