/**
 * Ground-truth guards (TASK-008): no product cards, no hard-coded prices, no
 * fabricated values, no "analysis" language in the SDK's UI.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');

const SRC = path.join(__dirname, '../../src');

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.js$/.test(p)) out.push(p);
  }
  return out;
}
const files = walk(SRC);
const read = (f) => fs.readFileSync(f, 'utf8');

describe('SDK source honesty (grep)', () => {
  test('no product card components remain', () => {
    expect(files.filter((f) => /ProductCard/.test(path.basename(f)))).toEqual([]);
    files.forEach((f) => expect(read(f)).not.toMatch(/MyaProductCard/));
  });

  test('no hard-coded prices in the SDK source', () => {
    files.forEach((f) => {
      const code = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      // `$` followed by a digit in a string literal, excluding template-literal interpolation like `${x}`
      expect({ f: path.relative(SRC, f), hits: code.match(/['"`][^'"`\n]*\$\d[^'"`\n]*['"`]/g) || [] }).toEqual({ f: path.relative(SRC, f), hits: [] });
    });
  });

  test('the attach sheet does not promise an in-app hair analysis', () => {
    const chat = read(path.join(SRC, 'ui/MyaChat.js'));
    expect(chat).not.toMatch(/Analyse a hair strand/);
    expect(chat).not.toMatch(/Reads porosity/);
  });

  test('no default hair traits are invented', () => {
    files.forEach((f) => expect(read(f)).not.toMatch(/porosity\s*\|\|\s*['"]/i));
  });
});

describe('HairInsight card never fabricates a measurement', () => {
  require('../../src/ui/rich/register');
  const { MyaHairInsightCard } = require('../../src/ui/rich/cards');

  test('a metric without a value says "Not yet analysed"', () => {
    let tree;
    TestRenderer.act(() => {
      tree = TestRenderer.create(
        React.createElement(MyaHairInsightCard, { data: { summary: 'Your profile', metrics: [{ label: 'Porosity' }, { label: 'Density', value: 70 }] } })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Not yet analysed');
    expect(json).toContain('Porosity');
  });
});
