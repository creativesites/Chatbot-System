/**
 * Contract: every block type the server can emit renders, or is deliberately
 * suppressed. An unknown type renders a safe generic card, never a blank.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');

const { BlockType } = require('../../../chat-protocol/src/types');
const registry = require('../../src/ui/rich/registry');
require('../../src/ui/rich/register');
const MyaRichBlock = require('../../src/ui/rich/MyaRichBlock').default;

// Types the server emits that are not (yet) in the chat-protocol enum. Each is
// verified below against the server source so this list cannot go stale silently.
const SERVER_EXTRA = ['product_card'];

const SERVER_DIRS = [path.join(__dirname, '../../../core/src'), path.join(__dirname, '../../../myavana/src')];

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (f === '__tests__' || f === 'node_modules') continue;
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

function renderBlock(block) {
  let tree;
  TestRenderer.act(() => {
    tree = TestRenderer.create(React.createElement(MyaRichBlock, { block, onAction: () => {} }));
  });
  return tree;
}

const textOf = (tree) => JSON.stringify(tree.toJSON() || '');

describe('block registry contract', () => {
  const emitted = Array.from(new Set([...Object.values(BlockType), ...SERVER_EXTRA]));

  test.each(emitted)('server block type "%s" is rendered or deliberately suppressed', (type) => {
    const ok = Boolean(registry.resolveComponent(type)) || registry.isSuppressedType(type) || registry.isInlineTextBlock(type);
    expect(ok).toBe(true);
  });

  test('the extra server types are really emitted by the server (list is not stale)', () => {
    const source = SERVER_DIRS.flatMap((d) => walk(d)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
    SERVER_EXTRA.forEach((t) => expect(source).toMatch(new RegExp(`['"]${t}['"]`)));
  });

  test('only product types are suppressed', () => {
    registry.SUPPRESSED_TYPES.forEach((t) => expect(t).toMatch(/product/));
  });

  test('product blocks render nothing: MYAVANA sells services, not products', () => {
    ['product', 'product_list', 'product_card'].forEach((type) => {
      const tree = renderBlock({ type, data: { name: 'Shampoo', price: 12 } });
      expect(tree.toJSON()).toBeNull();
    });
  });

  test('an unknown type with a title renders a generic card with that title', () => {
    const tree = renderBlock({ type: 'brand_new_type', data: { title: 'Something new' } });
    expect(textOf(tree)).toContain('Something new');
  });

  test('an unknown type with nothing legible still renders something, never a blank', () => {
    const tree = renderBlock({ type: 'brand_new_type', data: {} });
    expect(tree.toJSON()).not.toBeNull();
    expect(textOf(tree)).toMatch(/can't show yet/);
  });

  test('service_offer is registered (M3)', () => {
    expect(registry.resolveComponent('service_offer')).toBeTruthy();
  });
});
