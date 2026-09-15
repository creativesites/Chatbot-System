/**
 * Stylist & Salon Ecosystem Service Tests
 */

const path = require("path");
const StylistEcosystemService = require("../ecosystem/stylistEcosystemService");

describe("StylistEcosystemService", () => {
  test("loads all 26 verified ecosystem partners", () => {
    const partners = StylistEcosystemService.getAllPartners();
    expect(Array.isArray(partners)).toBe(true);
    expect(partners.length).toBe(26);
  });

  test("correctly filters salons vs retailers", () => {
    const salons = StylistEcosystemService.getSalonsAndStylists();
    const retailers = StylistEcosystemService.getRetailers();
    expect(salons.length).toBe(11);
    expect(retailers.length).toBe(15);
    salons.forEach((s) => expect(s.category).toBe("salon"));
    retailers.forEach((r) => expect(r.category).toBe("retailer"));
  });

  test("searches partners by city, state, or name", () => {
    const atlantaSalons = StylistEcosystemService.searchPartners({ query: "Atlanta", category: "salon" });
    expect(atlantaSalons.length).toBeGreaterThanOrEqual(3);
    expect(atlantaSalons.some((s) => s.name === "Too Groovy Salon")).toBe(true);
    expect(atlantaSalons.some((s) => s.name === "Krush Beauty")).toBe(true);
  });

  test("calculates proximity distance accurately using coordinates", () => {
    // Downtown Atlanta coordinates: 33.7490, -84.3880
    const nearby = StylistEcosystemService.findNearest({
      latitude: 33.7490,
      longitude: -84.3880,
      category: "salon",
      maxDistanceMiles: 50,
      limit: 5
    });

    expect(nearby.length).toBeGreaterThanOrEqual(3);
    expect(nearby[0].name).toBe("Too Groovy Salon");
    expect(nearby[0].distance_miles).toBeLessThan(5);
    expect(nearby[1].distance_miles).toBeGreaterThanOrEqual(nearby[0].distance_miles);
  });

  test("retrieves partner by ID", () => {
    const partner = StylistEcosystemService.getPartnerById("loc_4n6g2gv5");
    expect(partner).not.toBeNull();
    expect(partner.name).toBe("AHNI Beauty Supply");
    expect(partner.category).toBe("retailer");
  });
});
