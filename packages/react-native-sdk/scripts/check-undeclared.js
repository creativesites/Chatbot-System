// Lint-lite: report identifiers that are used but never declared or imported.
// Catches the mistake that tests with stubbed modules can miss (a dropped import).
// Usage: node scripts/check-undeclared.js src/ui/*.js ...
const babel = require('@babel/core');
const fs = require('fs');
const KNOWN = new Set(['console','process','Promise','Math','Date','JSON','Object','Array','String','Number','Boolean','Set','Map','WeakSet','WeakMap','Error','TypeError','Symbol','parseInt','parseFloat','isNaN','setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame','fetch','AbortController','TextDecoder','undefined','NaN','Infinity','require','module','exports','__DEV__','globalThis','navigator','XMLHttpRequest','Buffer','Intl','RegExp','encodeURIComponent','decodeURIComponent','URL','arguments','Function','Reflect','Proxy','FormData']);
let bad = 0;
for (const f of process.argv.slice(2)) {
  const ast = babel.parseSync(fs.readFileSync(f, 'utf8'), { filename: f, babelrc: false, configFile: false, presets: [require.resolve('@babel/preset-react'), require.resolve('@babel/preset-env')] });
  const un = new Set();
  babel.traverse(ast, { Program(p) { Object.keys(p.scope.globals).forEach((g) => { if (!KNOWN.has(g)) un.add(g); }); } });
  if (un.size) { bad += 1; console.log(f, '->', [...un].join(', ')); }
}
console.log(bad ? `files with undeclared names: ${bad}` : 'no undeclared identifiers');
process.exit(bad ? 1 : 0);
