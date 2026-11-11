const React = require('react');
const TestRenderer = require('react-test-renderer');
const MyaImage = require('../../src/ui/MyaImage').default;
const { MyaMediaCard } = require('../../src/ui/rich/cards');

const render = (el) => {
  let t;
  TestRenderer.act(() => { t = TestRenderer.create(el); });
  return t;
};
// Host nodes only: the stubbed react-native forwards props, so composites would double-count.
const host = (t, pred) => t.root.findAll((n) => typeof n.type === 'string' && pred(n));
const imgs = (t) => host(t, (n) => typeof n.props.onLoad === 'function');
const text = (t) => JSON.stringify(t.toJSON());

describe('MyaImage', () => {
  test('placeholder while loading, then only the image once it has loaded', () => {
    const t = render(React.createElement(MyaImage, { source: { uri: 'https://x.test/a.jpg' }, accessibilityLabel: 'Hair photo' }));
    expect(host(t, (n) => n.type === 'Icon').length).toBe(1);
    TestRenderer.act(() => imgs(t)[0].props.onLoad());
    expect(host(t, (n) => n.type === 'Icon').length).toBe(0);
    expect(imgs(t).length).toBe(1);
    expect(host(t, (n) => n.props.accessibilityLabel === 'Hair photo').length).toBeGreaterThan(0);
  });

  test('failure shows an honest tile, never an empty frame', () => {
    const t = render(React.createElement(MyaImage, { source: { uri: 'https://x.test/broken.jpg' } }));
    TestRenderer.act(() => imgs(t)[0].props.onError());
    expect(text(t)).toContain('Image unavailable');
    expect(imgs(t).length).toBe(0);
  });

  test('tries the fallback source exactly once before giving up', () => {
    const t = render(React.createElement(MyaImage, {
      source: { uri: 'https://x.test/thumb.jpg' },
      fallbackSource: { uri: 'https://x.test/original.jpg' },
    }));
    TestRenderer.act(() => imgs(t)[0].props.onError());
    expect(imgs(t)[0].props.source.uri).toBe('https://x.test/original.jpg');
    expect(text(t)).not.toContain('Image unavailable');
    TestRenderer.act(() => imgs(t)[0].props.onError());
    expect(text(t)).toContain('Image unavailable');
  });

  test('no source is the failed state', () => {
    expect(text(render(React.createElement(MyaImage, { source: null })))).toContain('Image unavailable');
  });
});

describe('MyaMediaCard keeps its image contract (Argon4: normalize + header + fallback retry)', () => {
  test('thumbnail first with the User-Agent header, original as fallback, then unavailable', () => {
    const t = render(React.createElement(MyaMediaCard, {
      data: { title: 'Type 4C coils', thumbnailUrl: 'https://thumb.wikimedia.org/a/b.jpg', sourceUrl: 'https://upload.wikimedia.org/a/full.jpg' },
    }));
    const first = imgs(t)[0].props.source;
    expect(first.uri).toBe('https://upload.wikimedia.org/a/b.jpg'); // normalizeMediaImageUri
    expect(first.headers['User-Agent']).toMatch(/MYAVANA-Mobile-App/);
    TestRenderer.act(() => imgs(t)[0].props.onError());
    expect(imgs(t)[0].props.source.uri).toBe('https://upload.wikimedia.org/a/full.jpg');
    TestRenderer.act(() => imgs(t)[0].props.onError());
    expect(text(t)).toContain('Reference image unavailable');
    expect(text(t)).toContain('Type 4C coils'); // the card itself survives
  });
});
