#!/usr/bin/env node
// Refreshes packages/core/data/myavana_stylists_ecosystem.json from the live
// MYAVANA Ecosystem map (Stockist), the same source the server syncs from every
// 30 minutes. The snapshot is only the fallback the server uses until its first
// live sync succeeds, but keeping it current means a Stockist outage never
// serves stale partner details. Run before each deploy (deploy-staging.sh does).
//
//   npm run ecosystem:snapshot            write the snapshot
//   npm run ecosystem:snapshot -- --check exit 1 if the snapshot is out of date

const fs = require('fs');
const path = require('path');
const {
  STOCKIST_MAP_TAG,
  mapStockistLocation,
} = require('../packages/core/src/ecosystem/stylistEcosystemService');

const SNAPSHOT = path.resolve(__dirname, '../packages/core/data/myavana_stylists_ecosystem.json');

async function main() {
  const checkOnly = process.argv.includes('--check');
  const url = `https://stockist.co/api/v1/${STOCKIST_MAP_TAG}/locations/all`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Stockist HTTP ${res.status}`);
  const locations = await res.json();
  if (!Array.isArray(locations) || locations.length === 0) {
    throw new Error('Stockist returned no locations; keeping the existing snapshot');
  }

  const partners = locations
    .filter((loc) => loc && loc.id && loc.name)
    .map(mapStockistLocation)
    .sort((a, b) => a.name.localeCompare(b.name));
  const next = JSON.stringify(partners, null, 2) + '\n';
  const current = fs.existsSync(SNAPSHOT) ? fs.readFileSync(SNAPSHOT, 'utf8') : '';

  const names = (list) => new Set(list.map((p) => p.name));
  const before = current ? names(JSON.parse(current)) : new Set();
  const after = names(partners);
  const added = [...after].filter((n) => !before.has(n));
  const removed = [...before].filter((n) => !after.has(n));

  if (current === next) {
    console.log(`Ecosystem snapshot is current (${partners.length} partners).`);
    return;
  }
  console.log(`Ecosystem snapshot ${checkOnly ? 'is out of date' : 'updated'}: ${partners.length} partners` +
    (added.length ? `; added: ${added.join(', ')}` : '') +
    (removed.length ? `; removed: ${removed.join(', ')}` : '') +
    (!added.length && !removed.length ? '; partner details changed' : ''));
  if (checkOnly) process.exit(1);
  fs.writeFileSync(SNAPSHOT, next);
}

main().catch((err) => {
  console.error(`Ecosystem snapshot not refreshed: ${err.message}`);
  process.exit(2);
});
