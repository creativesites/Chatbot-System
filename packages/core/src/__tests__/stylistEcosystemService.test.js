/**
 * Stylist & Salon Ecosystem Service Tests
 */

const StylistEcosystemService = require("../ecosystem/stylistEcosystemService");

describe("StylistEcosystemService", () => {
  beforeEach(() => {
    StylistEcosystemService.resetPartnersCache();
  });

  test("loads all synced ecosystem partners from live directory", () => {
    const partners = StylistEcosystemService.getAllPartners();
    expect(Array.isArray(partners)).toBe(true);
    expect(partners.length).toBeGreaterThanOrEqual(39);
  });

  test("correctly filters salons vs retailers", () => {
    const salons = StylistEcosystemService.getSalonsAndStylists();
    const retailers = StylistEcosystemService.getRetailers();
    expect(salons.length).toBeGreaterThanOrEqual(27);
    expect(retailers.length).toBeGreaterThanOrEqual(12);
    salons.forEach((s) => expect(s.category).toBe("salon"));
    retailers.forEach((r) => expect(r.category).toBe("retailer"));
  });

  test('searches partners by "City, ST" (Atlanta, GA), city alone, and full state name', () => {
    const atlantaGa = StylistEcosystemService.searchPartners({ query: "Atlanta, GA", category: "salon" });
    expect(atlantaGa.length).toBeGreaterThanOrEqual(3);
    expect(atlantaGa.some((s) => s.name === "MYAVANA Certified Beauty Tech Lab")).toBe(true);
    expect(atlantaGa.some((s) => s.name === "Krush Beauty")).toBe(true);
    expect(atlantaGa.some((s) => s.name === "It's a Hair Thang")).toBe(true);

    const atlantaFull = StylistEcosystemService.searchPartners({ query: "Atlanta, Georgia", category: "salon" });
    expect(atlantaFull.length).toBeGreaterThanOrEqual(3);

    const atlantaOnly = StylistEcosystemService.searchPartners({ query: "Atlanta", category: "salon" });
    expect(atlantaOnly.length).toBeGreaterThanOrEqual(3);
  });

  test("searches partners by ZIP code", async () => {
    const res = await StylistEcosystemService.searchByLocation({
      query: "30308",
      category: "salon",
      allowNetwork: false,
    });
    expect(res.noLocalPartner).toBe(false);
    expect(res.partners.length).toBeGreaterThanOrEqual(3);
    expect(res.partners[0].address.city).toBe("Atlanta");
  });

  test("returns noLocalPartner with nearest partners and distances for a city without nearby partners", async () => {
    const res = await StylistEcosystemService.searchByLocation({
      query: "Seattle, WA",
      category: "salon",
      allowNetwork: false,
    });
    expect(res.noLocalPartner).toBe(true);
    expect(res.partners).toEqual([]);
    expect(res.nearest.length).toBeGreaterThan(0);
    expect(res.nearest[0].distance_miles).toBeGreaterThan(500);
    expect(res.nearest[1].distance_miles).toBeGreaterThanOrEqual(res.nearest[0].distance_miles);
  });

  test("calculates proximity distance accurately using coordinates", () => {
    // Downtown Atlanta coordinates: 33.7490, -84.3880
    const nearby = StylistEcosystemService.findNearest({
      latitude: 33.7490,
      longitude: -84.3880,
      category: "salon",
      maxDistanceMiles: 50,
      limit: 5,
    });

    expect(nearby.length).toBeGreaterThanOrEqual(3);
    expect(nearby[0].name).toBe("MYAVANA Certified Beauty Tech Lab");
    expect(nearby[0].distance_miles).toBeLessThan(2);
    expect(nearby[1].distance_miles).toBeGreaterThanOrEqual(nearby[0].distance_miles);
  });

  test("retrieves partner by ID", () => {
    const partner = StylistEcosystemService.getPartnerById("loc_4n6g2gv5");
    expect(partner).not.toBeNull();
    expect(partner.name).toBe("AHNI Beauty Supply");
    expect(partner.category).toBe("retailer");
  });
});

describe('mapStockistLocation services and profile', () => {
  const S = require('../ecosystem/stylistEcosystemService');
  const base = { id: 'loc_1', name: 'Test Salon', latitude: '33.7', longitude: '-84.3' };

  test('takes services from a Services custom field and keeps the owner as lead', () => {
    const p = S.mapStockistLocation({
      ...base,
      description: 'SALON',
      custom_fields: [
        { name: 'Owner/Founder', value: 'Jane Doe' },
        { name: 'Services', value: 'Silk press, Color | Trims\nLocs' },
      ],
    });
    expect(p.lead_stylist_or_founder).toBe('Jane Doe');
    expect(p.services_offered).toEqual(['Silk press', 'Color', 'Trims', 'Locs']);
    expect(p.about).toBeNull();
  });

  test('keeps profile text as about and never invents default services', () => {
    const p = S.mapStockistLocation({ ...base, description: 'Master Colorist' });
    expect(p.type).toBe('SALON');
    expect(p.about).toBe('Master Colorist');
    expect(p.services_offered).toEqual([]);
  });

  test('a bare RETAILER description sets the type only', () => {
    const p = S.mapStockistLocation({ ...base, description: 'RETAILER' });
    expect(p.category).toBe('retailer');
    expect(p.about).toBeNull();
    expect(p.services_offered).toEqual([]);
  });
});

describe('live Stockist sync failure handling', () => {
  const S = require('../ecosystem/stylistEcosystemService');
  const flush = () => new Promise((r) => setTimeout(r, 20));
  let env;
  beforeEach(() => { env = process.env.NODE_ENV; process.env.NODE_ENV = 'production'; S.resetPartnersCache(); });
  afterEach(() => { process.env.NODE_ENV = env; S.resetPartnersCache(); });

  test('a failed sync does not retrigger itself and backs off', async () => {
    let calls = 0;
    const failing = async () => { calls += 1; return { ok: true, json: async () => ({ error: 'nope' }) }; };
    const realFetch = globalThis.fetch;
    globalThis.fetch = failing;
    try {
      const status = await S.refreshFromLiveDirectory({ force: true, fetchImpl: failing });
      await flush();
      expect(status.lastError).toMatch(/non-list response/);
      const afterFirst = calls;
      expect(afterFirst).toBeLessThanOrEqual(2); // forced call + at most the snapshot's initial load
      for (let i = 0; i < 50; i += 1) S.getAllPartners();
      await flush();
      expect(calls).toBe(afterFirst);
      expect(S.getAllPartners().length).toBeGreaterThan(0); // snapshot still served
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
