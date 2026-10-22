/**
 * service_offer fixtures. The contract is PROPOSED (community/inboxes/atlas/
 * 20261021_1500_mya_sdk_server_items.md) and not yet agreed with the backend, so
 * everything in M3 is built and tested against these. Names are the store names
 * from the growth plan and the live store (read 2026-10-22); prices here are fixtures only.
 * URLs use real store handles (e.g. /products/myavana-hair-kit).
 */
const block = (data, extra = {}) => ({ type: 'service_offer', id: `blk_${data.offer_id || 'x'}`, data, ...extra });

const hairAI = block({
  offer_id: 'off_hairai_1',
  service: 'hairai',
  name: 'MYAVANA HairAI™ Instant Analysis + Recommendations',
  price: { display: '$9.00', amount: 9, currency: 'USD', interval: 'once' },
  includes: [
    'Hair type and texture analysis from your photos',
    'Instant, ingredient-based recommendations',
    'Your results saved to your Hair Journey',
  ],
  reason: 'Your profile has no measured porosity yet, so every tip is a good guess. HairAI turns the guess into a measurement.',
  cta: { label: 'Get HairAI™', route: 'native_iap', sku: 'com.myavana.productid.hairai' },
  framing_variant: 'A',
  entitlement_key: 'hairai',
});

const membership = block({
  offer_id: 'off_member_1',
  service: 'membership',
  name: 'MYAVANA Hair Nirvana Membership Club',
  price: { display: '$25.00/month', amount: 25, currency: 'USD', interval: 'month' },
  includes: ['Hair analysis and a care plan', 'A personal coach', 'Quarterly samples'],
  reason: "You've logged 11 weeks running. Membership keeps that momentum going.",
  cta: { label: 'See membership', route: 'native_subscription', sku: 'com.myavana.productid.hairnirvana_mtly' },
  framing_variant: 'B',
  entitlement_key: 'hair_nirvana_monthly',
});

const fullScan = block({
  offer_id: 'off_scan_1',
  service: 'full_hair_scan',
  name: 'MYAVANA FULL HAIR SCAN + CARE EXPERIENCE',
  price: { display: '$99.00' },
  includes: ['A one-hour salon hair and scalp analysis', 'Regimen samples', 'An assigned licensed cosmetologist'],
  reason: 'Breakage that keeps coming back after several fixes is worth a closer look in person.',
  cta: { label: 'View on myavana.com', route: 'web', url: 'https://www.myavana.com/products/myavana-hair-kit' },
  framing_variant: 'A',
});

const consultation = block({
  offer_id: 'off_consult_1',
  service: 'consultation',
  name: 'Hair Consultation',
  price: { display: 'Free' },
  includes: ['A one-to-one conversation with a MYAVANA hair expert', 'No obligation'],
  reason: 'This sounds worth talking through with a person.',
  cta: { label: 'Book your free consultation', route: 'calendly', url: 'https://calendly.com/myavana/hair-consultation?month=2026-11' },
  framing_variant: 'A',
});

const noPrice = block({
  offer_id: 'off_noprice_1',
  service: 'hairai',
  name: 'MYAVANA HairAI™ Instant Analysis + Recommendations',
  price: { amount: 9, currency: 'USD' }, // amount without display: the SDK must NOT format a price from it
  includes: ['A real HairID'],
  reason: 'A measurement beats a guess.',
  cta: { label: 'Get HairAI™', route: 'native_iap' },
});

module.exports = { block, hairAI, membership, fullScan, consultation, noPrice };
