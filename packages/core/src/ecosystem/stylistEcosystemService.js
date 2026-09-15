/**
 * Myavana Stylist & Salon Ecosystem Service
 *
 * Provides location lookup, geographic proximity search, and stylist recommendations
 * for Mya from the official MYAVANA Hair & Beauty Ecosystem network.
 */

const path = require("path");
const fs = require("fs");

let partnersCache = null;

function loadPartners() {
  if (partnersCache) return partnersCache;
  try {
    const filePath = path.resolve(__dirname, "../../data/myavana_stylists_ecosystem.json");
    if (fs.existsSync(filePath)) {
      partnersCache = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return partnersCache;
    }
  } catch (err) {
    console.warn("[StylistEcosystemService] Failed to load ecosystem partners:", err.message);
  }
  partnersCache = [];
  return partnersCache;
}

function calculateHaversineDistanceMiles(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const StylistEcosystemService = {
  /**
   * Return all partners (salons, stylists, and retailers).
   */
  getAllPartners() {
    return loadPartners();
  },

  /**
   * Return only certified salons and stylists.
   */
  getSalonsAndStylists() {
    return loadPartners().filter((p) => p.category === "salon");
  },

  /**
   * Return only authorized beauty supply retailers.
   */
  getRetailers() {
    return loadPartners().filter((p) => p.category === "retailer");
  },

  /**
   * Find a partner by ID.
   */
  getPartnerById(id) {
    if (!id) return null;
    return loadPartners().find((p) => p.id.toLowerCase() === String(id).toLowerCase().trim()) || null;
  },

  /**
   * Search partners by city, state, zip, or name keyword.
   */
  searchPartners({ query = "", category = "all", limit = 5 } = {}) {
    const q = String(query).toLowerCase().trim();
    let list = loadPartners();

    if (category === "salon" || category === "stylist") {
      list = list.filter((p) => p.category === "salon");
    } else if (category === "retailer") {
      list = list.filter((p) => p.category === "retailer");
    }

    if (!q) return list.slice(0, limit);

    const matches = list.filter((p) => {
      const inName = p.name.toLowerCase().includes(q);
      const inStylist = p.lead_stylist_or_founder && p.lead_stylist_or_founder.toLowerCase().includes(q);
      const inCity = p.address.city && p.address.city.toLowerCase().includes(q);
      const inState = p.address.state && p.address.state.toLowerCase().includes(q);
      const inZip = p.address.postal_code && p.address.postal_code.toLowerCase().includes(q);
      const inCountry = p.address.country && p.address.country.toLowerCase().includes(q);
      return inName || inStylist || inCity || inState || inZip || inCountry;
    });

    return matches.slice(0, limit);
  },

  /**
   * Find nearest salons or retailers using latitude and longitude coordinates.
   */
  findNearest({ latitude, longitude, maxDistanceMiles = 100, category = "salon", limit = 5 }) {
    if (latitude == null || longitude == null) return [];
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) return [];

    let list = loadPartners();
    if (category === "salon" || category === "stylist") {
      list = list.filter((p) => p.category === "salon");
    } else if (category === "retailer") {
      list = list.filter((p) => p.category === "retailer");
    }

    const calculated = list.map((p) => {
      const dist = calculateHaversineDistanceMiles(lat, lon, p.coordinates.latitude, p.coordinates.longitude);
      return {
        ...p,
        distance_miles: Math.round(dist * 10) / 10
      };
    });

    return calculated
      .filter((p) => p.distance_miles <= maxDistanceMiles)
      .sort((a, b) => a.distance_miles - b.distance_miles)
      .slice(0, limit);
  }
};

module.exports = StylistEcosystemService;
