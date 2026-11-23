#!/usr/bin/env node
/**
 * Syncs packages/core/data/myavana_stylists_ecosystem.json from the live
 * MYAVANA Ecosystem directory page (https://www.myavana.com/pages/myavana-ecosystem),
 * which embeds the Stockist store locator widget.
 *
 * Usage:
 *   node packages/core/scripts/sync-ecosystem.js
 *   node packages/core/scripts/sync-ecosystem.js --dry-run
 */

const fs = require('fs');
const path = require('path');

const ECOSYSTEM_PAGE_URL = 'https://www.myavana.com/pages/myavana-ecosystem';
const DEFAULT_BOOKING_URL = ECOSYSTEM_PAGE_URL;
const OUTPUT_PATH = path.resolve(__dirname, '../data/myavana_stylists_ecosystem.json');

const SALON_SERVICES = [
  'Hair Strand Assessment',
  'HairScope Diagnostic Consultation',
  'Textured Hair Styling & Maintenance',
  'Healthy Hair Care Regimens',
  'Silk Press & Natural Hair Care',
];

const RETAILER_SERVICES = [
  'Healthy Hair Products Retail',
  'MYAVANA Hair Kits',
  'Textured Hair Supplies',
];

async function extractStockistTag(pageUrl = ECOSYSTEM_PAGE_URL, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(pageUrl, {
    headers: { Accept: 'text/html' },
  });
  if (!res || !res.ok) {
    throw new Error(`Failed to fetch ${pageUrl}: HTTP ${res ? res.status : 'no response'}`);
  }
  const html = await res.text();
  const match =
    html.match(/stockist-widget-tag=["']([a-z0-9_]+)["']/i) ||
    html.match(/stockist\.co\/api\/v1\/([a-z0-9_]+)\/locations/i);
  if (!match || !match[1]) {
    throw new Error(`Could not find Stockist widget tag on ${pageUrl}`);
  }
  return match[1];
}

function mapStockistLocation(loc) {
  const desc = String(loc.description || '').trim().toUpperCase();
  const isRetailer = desc === 'RETAILER';
  const type = isRetailer ? 'RETAILER' : 'SALON';
  const category = isRetailer ? 'retailer' : 'salon';

  const customFields = Array.isArray(loc.custom_fields) ? loc.custom_fields : [];
  const ownerField = customFields.find(
    (f) => f && /owner|founder|stylist/i.test(String(f.name || ''))
  );
  const lead = ownerField && ownerField.value ? String(ownerField.value).trim() : null;

  const rawWebsite = loc.website ? String(loc.website).trim() : null;
  // Salons without their own site/Calendly have Stockist placeholder URL
  // /products/hair-assessment. Route those to the MYAVANA Ecosystem directory
  // instead of sending mobile members out to the web HairAI product page.
  const isHairAssessmentPlaceholder =
    Boolean(rawWebsite) && /myavana\.com\/products\/hair-assessment/i.test(rawWebsite);
  const website = isHairAssessmentPlaceholder ? null : rawWebsite;
  const phone = loc.phone ? String(loc.phone).trim() : null;
  const email = loc.email ? String(loc.email).trim() : null;

  let state = String(loc.state || '').trim();
  let postalCode = String(loc.postal_code || '').trim();
  // Handle Stockist entries where ZIP was typed into the state field (e.g. "NJ 08873")
  if (!postalCode) {
    const stateZip = state.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZip) {
      state = stateZip[1].toUpperCase();
      postalCode = stateZip[2];
    }
  }

  return {
    id: String(loc.id || '').trim(),
    name: String(loc.name || '').trim(),
    type,
    category,
    lead_stylist_or_founder: lead,
    services_offered: isRetailer ? [...RETAILER_SERVICES] : [...SALON_SERVICES],
    address: {
      street: String(loc.address_line_1 || '').trim(),
      suite: loc.address_line_2 ? String(loc.address_line_2).trim() : null,
      city: String(loc.city || '').trim(),
      state,
      postal_code: postalCode,
      country: String(loc.country || '').trim(),
    },
    coordinates: {
      latitude: parseFloat(loc.latitude),
      longitude: parseFloat(loc.longitude),
    },
    contact: {
      phone,
      email,
      website,
    },
    booking_url: website || DEFAULT_BOOKING_URL,
    myavana_certified: true,
    partnership_status: 'ACTIVE_ECOSYSTEM_PARTNER',
  };
}

async function fetchEcosystemPartners(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const pageUrl = options.pageUrl || ECOSYSTEM_PAGE_URL;
  const tag = options.tag || (await extractStockistTag(pageUrl, fetchImpl));
  const apiUrl = `https://stockist.co/api/v1/${tag}/locations/all`;

  const res = await fetchImpl(apiUrl, { headers: { Accept: 'application/json' } });
  if (!res || !res.ok) {
    throw new Error(`Failed to fetch Stockist locations (${apiUrl}): HTTP ${res ? res.status : 'no response'}`);
  }
  const locations = await res.json();
  if (!Array.isArray(locations)) {
    throw new Error(`Unexpected Stockist response from ${apiUrl}: expected array`);
  }

  return locations
    .filter((loc) => loc && loc.id && loc.name)
    .map(mapStockistLocation)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const tagArgIdx = process.argv.indexOf('--tag');
  const explicitTag = tagArgIdx !== -1 ? process.argv[tagArgIdx + 1] : undefined;

  const partners = await fetchEcosystemPartners({ tag: explicitTag });
  const salons = partners.filter((p) => p.category === 'salon').length;
  const retailers = partners.filter((p) => p.category === 'retailer').length;

  if (dryRun) {
    console.log(`[dry-run] Fetched ${partners.length} partners (${salons} salons, ${retailers} retailers).`);
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(partners, null, 2) + '\n', 'utf8');
  console.log(`✅ Synced ${partners.length} partners (${salons} salons, ${retailers} retailers) -> ${OUTPUT_PATH}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ sync-ecosystem failed:', err.message);
    process.exit(1);
  });
}

module.exports = {
  ECOSYSTEM_PAGE_URL,
  extractStockistTag,
  mapStockistLocation,
  fetchEcosystemPartners,
};
