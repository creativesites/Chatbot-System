/**
 * service_offer fixtures. The contract is PROPOSED (community/inboxes/atlas/
 * 20261021_1500_mya_sdk_server_items.md) and not yet agreed with the backend, so
 * everything in M3 is built and tested against these. Names are the store names
 * from the growth plan (read 2026-10-20); prices here are fixtures only.
 */
const block = (data, extra = {}) => ({ type: 'service_offer', id: `blk_${data.offer_id || 'x'}`, data, ...extra });

const hairAI = block({
  offer_id: 'off_hairai_1',
  service: 'hairai',
  name: 'MYAVANA HairAI™ Instant Analysis + Recommendations',
  price: { display: '$9.00', amount: 9, currency: 'USD', interval: 'once' },
  includes: [
    'A real HairID: porosity, density and curl pattern, measured from your photos',
    'Care recommendations matched to your results',
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
  includes: ['Ongoing guidance as your hair changes', 'Your logs, goals and routines kept together'],
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
  includes: ['An at-home strand scan, analysed in the lab', 'A care plan written for your hair'],
  reason: 'Breakage that keeps coming back after several fixes usually has a cause a full scan can show.',
  cta: { label: 'View on myavana.com', route: 'web', url: 'https://www.myavana.com/products/full-hair-scan' },
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
