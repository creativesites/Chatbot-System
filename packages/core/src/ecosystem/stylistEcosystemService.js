/**
 * Myavana Stylist & Salon Ecosystem Service
 *
 * Provides location lookup, geographic proximity search, and stylist recommendations
 * for Mya from the official MYAVANA Hair & Beauty Ecosystem network.
 */

const path = require("path");
const fs = require("fs");

const ECOSYSTEM_URL = "https://www.myavana.com/pages/myavana-ecosystem";
const STOCKIST_MAP_TAG = process.env.STOCKIST_MAP_TAG || "map_93e65xvq";
const ECOSYSTEM_TTL_MS = parseInt(process.env.ECOSYSTEM_SYNC_TTL_MS || String(30 * 60 * 1000), 10);
const GEOCODE_TIMEOUT_MS = 2500;
const LIVE_SYNC_TIMEOUT_MS = 6000;

// Stockist "description" holds either a bare listing type ("SALON" /
// "RETAILER") or the partner's own profile text (specialties, bio). A custom
// field named like "Services" / "Specialties" holds a list of services.
const LISTING_TYPE_RE = /^(?:salon|retailer)$/i;
const SERVICES_FIELD_RE = /service|specialt/i;
const LEAD_FIELD_RE = /owner|founder|stylist/i;

function splitServices(value) {
  return String(value || "")
    .split(/[\n,;|•]+/)
    .map((s) => s.replace(/^[-*#\s]+/, "").trim())
    .filter(Boolean);
}

let partnersCache = null;
let syncState = {
  source: "snapshot",
  lastSyncedAt: 0,
  lastError: null,
  inFlight: null,
};

// Canonical US state + DC + Canadian province + AU state map (abbr -> full lowercase name)
const STATE_ABBR_TO_NAME = {
  al: "alabama", ak: "alaska", az: "arizona", ar: "arkansas", ca: "california",
  co: "colorado", ct: "connecticut", de: "delaware", dc: "district of columbia",
  fl: "florida", ga: "georgia", hi: "hawaii", id: "idaho", il: "illinois",
  in: "indiana", ia: "iowa", ks: "kansas", ky: "kentucky", la: "louisiana",
  me: "maine", md: "maryland", ma: "massachusetts", mi: "michigan", mn: "minnesota",
  ms: "mississippi", mo: "missouri", mt: "montana", ne: "nebraska", nv: "nevada",
  nh: "new hampshire", nj: "new jersey", nm: "new mexico", ny: "new york",
  nc: "north carolina", nd: "north dakota", oh: "ohio", ok: "oklahoma",
  or: "oregon", pa: "pennsylvania", ri: "rhode island", sc: "south carolina",
  sd: "south dakota", tn: "tennessee", tx: "texas", ut: "utah", vt: "vermont",
  va: "virginia", wa: "washington", wv: "west virginia", wi: "wisconsin",
  wy: "wyoming", on: "ontario", qc: "quebec", bc: "british columbia",
  ab: "alberta", nsw: "new south wales",
};

const STATE_NAME_TO_ABBR = Object.fromEntries(
  Object.entries(STATE_ABBR_TO_NAME).map(([abbr, name]) => [name, abbr])
);

// Built-in coordinates for major cities so proximity & "no partner nearby" lookups
// work deterministically even without external network calls.
const CITY_COORDINATES = {
  "atlanta": { lat: 33.7490, lon: -84.3880, label: "Atlanta, GA" },
  "marietta": { lat: 33.9526, lon: -84.5499, label: "Marietta, GA" },
  "lawrenceville": { lat: 33.9562, lon: -83.9880, label: "Lawrenceville, GA" },
  "brooklyn": { lat: 40.6782, lon: -73.9442, label: "Brooklyn, NY" },
  "new york": { lat: 40.7128, lon: -74.0060, label: "New York, NY" },
  "nyc": { lat: 40.7128, lon: -74.0060, label: "New York, NY" },
  "chicago": { lat: 41.8781, lon: -87.6298, label: "Chicago, IL" },
  "blue island": { lat: 41.6573, lon: -87.6800, label: "Blue Island, IL" },
  "los angeles": { lat: 34.0522, lon: -118.2437, label: "Los Angeles, CA" },
  "inglewood": { lat: 33.9617, lon: -118.3531, label: "Inglewood, CA" },
  "carson": { lat: 33.8317, lon: -118.2820, label: "Carson, CA" },
  "houston": { lat: 29.7604, lon: -95.3698, label: "Houston, TX" },
  "dallas": { lat: 32.7767, lon: -96.7970, label: "Dallas, TX" },
  "addison": { lat: 32.9618, lon: -96.8292, label: "Addison, TX" },
  "austin": { lat: 30.2672, lon: -97.7431, label: "Austin, TX" },
  "san antonio": { lat: 29.4241, lon: -98.4936, label: "San Antonio, TX" },
  "miami": { lat: 25.7617, lon: -80.1918, label: "Miami, FL" },
  "orlando": { lat: 28.5383, lon: -81.3792, label: "Orlando, FL" },
  "tampa": { lat: 27.9506, lon: -82.4572, label: "Tampa, FL" },
  "jacksonville": { lat: 30.3322, lon: -81.6557, label: "Jacksonville, FL" },
  "seattle": { lat: 47.6062, lon: -122.3321, label: "Seattle, WA" },
  "portland": { lat: 45.5152, lon: -122.6784, label: "Portland, OR" },
  "denver": { lat: 39.7392, lon: -104.9903, label: "Denver, CO" },
  "phoenix": { lat: 33.4484, lon: -112.0740, label: "Phoenix, AZ" },
  "las vegas": { lat: 36.1699, lon: -115.1398, label: "Las Vegas, NV" },
  "san francisco": { lat: 37.7749, lon: -122.4194, label: "San Francisco, CA" },
  "oakland": { lat: 37.8044, lon: -122.2712, label: "Oakland, CA" },
  "san diego": { lat: 32.7157, lon: -117.1611, label: "San Diego, CA" },
  "philadelphia": { lat: 39.9526, lon: -75.1652, label: "Philadelphia, PA" },
  "washington": { lat: 38.9072, lon: -77.0369, label: "Washington, DC" },
  "dc": { lat: 38.9072, lon: -77.0369, label: "Washington, DC" },
  "baltimore": { lat: 39.2904, lon: -76.6122, label: "Baltimore, MD" },
  "bowie": { lat: 39.0068, lon: -76.7791, label: "Bowie, MD" },
  "boston": { lat: 42.3601, lon: -71.0589, label: "Boston, MA" },
  "detroit": { lat: 42.3314, lon: -83.0458, label: "Detroit, MI" },
  "charlotte": { lat: 35.2271, lon: -80.8431, label: "Charlotte, NC" },
  "raleigh": { lat: 35.7796, lon: -78.6382, label: "Raleigh, NC" },
  "wake forest": { lat: 35.9799, lon: -78.5097, label: "Wake Forest, NC" },
  "dayton": { lat: 39.7589, lon: -84.1916, label: "Dayton, OH" },
  "columbus": { lat: 39.9612, lon: -82.9988, label: "Columbus, OH" },
  "cleveland": { lat: 41.4993, lon: -81.6944, label: "Cleveland, OH" },
  "nashville": { lat: 36.1627, lon: -86.7816, label: "Nashville, TN" },
  "memphis": { lat: 35.1495, lon: -90.0490, label: "Memphis, TN" },
  "new orleans": { lat: 29.9511, lon: -90.0715, label: "New Orleans, LA" },
  "minneapolis": { lat: 44.9778, lon: -93.2650, label: "Minneapolis, MN" },
  "st louis": { lat: 38.6270, lon: -90.1994, label: "St. Louis, MO" },
  "kansas city": { lat: 39.0997, lon: -94.5786, label: "Kansas City, MO" },
  "indianapolis": { lat: 39.7684, lon: -86.1581, label: "Indianapolis, IN" },
  "pittsburgh": { lat: 40.4406, lon: -79.9959, label: "Pittsburgh, PA" },
  "somerset": { lat: 40.4976, lon: -74.4885, label: "Somerset, NJ" },
  "newark": { lat: 40.7357, lon: -74.1724, label: "Newark, NJ" },
  "dover": { lat: 39.1582, lon: -75.5244, label: "Dover, DE" },
  "toronto": { lat: 43.6532, lon: -79.3832, label: "Toronto, ON" },
  "ajax": { lat: 43.8509, lon: -79.0204, label: "Ajax, ON" },
};

// Built-in 3-digit US ZIP prefix fallback coordinates for common metro areas
const ZIP3_COORDINATES = {
  "303": { lat: 33.7490, lon: -84.3880, label: "Atlanta, GA" },
  "300": { lat: 33.9042, lon: -84.3500, label: "Metro Atlanta, GA" },
  "301": { lat: 33.9526, lon: -84.5499, label: "Northwest Atlanta, GA" },
  "302": { lat: 33.5400, lon: -84.3600, label: "South Atlanta, GA" },
  "100": { lat: 40.7505, lon: -73.9934, label: "New York, NY" },
  "112": { lat: 40.6782, lon: -73.9442, label: "Brooklyn, NY" },
  "606": { lat: 41.8781, lon: -87.6298, label: "Chicago, IL" },
  "604": { lat: 41.6573, lon: -87.6800, label: "South Chicago, IL" },
  "900": { lat: 34.0522, lon: -118.2437, label: "Los Angeles, CA" },
  "902": { lat: 33.9416, lon: -118.3960, label: "Los Angeles Area, CA" },
  "903": { lat: 33.9617, lon: -118.3531, label: "Inglewood, CA" },
  "907": { lat: 33.8317, lon: -118.2820, label: "South Bay, CA" },
  "750": { lat: 32.9618, lon: -96.8292, label: "Dallas Metro, TX" },
  "752": { lat: 32.7767, lon: -96.7970, label: "Dallas, TX" },
  "770": { lat: 29.7604, lon: -95.3698, label: "Houston, TX" },
  "773": { lat: 30.0838, lon: -95.6322, label: "North Houston, TX" },
  "282": { lat: 35.2271, lon: -80.8431, label: "Charlotte, NC" },
  "275": { lat: 35.9508, lon: -78.5152, label: "Raleigh-Durham, NC" },
  "207": { lat: 38.9776, lon: -76.7353, label: "Bowie / Prince George's, MD" },
  "200": { lat: 38.9072, lon: -77.0369, label: "Washington, DC" },
  "221": { lat: 38.7800, lon: -77.1837, label: "Northern Virginia, VA" },
  "088": { lat: 40.4873, lon: -74.5025, label: "Central New Jersey, NJ" },
  "454": { lat: 39.7589, lon: -84.1916, label: "Dayton, OH" },
  "322": { lat: 30.3322, lon: -81.6557, label: "Jacksonville, FL" },
  "331": { lat: 25.7617, lon: -80.1918, label: "Miami, FL" },
  "981": { lat: 47.6062, lon: -122.3321, label: "Seattle, WA" },
  "802": { lat: 39.7392, lon: -104.9903, label: "Denver, CO" },
  "199": { lat: 39.1566, lon: -75.5242, label: "Dover, DE" },
};

function normalizeBookingUrl(rawUrl) {
  const trimmed = rawUrl ? String(rawUrl).trim() : "";
  if (!trimmed) return null;
  if (/myavana\.com\/products\/hair-assessment/i.test(trimmed)) return null;
  // Upgrade http:// to https:// for modern booking/salon hosts to avoid iOS ATS issues
  if (/^http:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http:\/\//i, "https://");
  }
  return trimmed;
}

function mapStockistLocation(loc) {
  const description = String(loc.description || "").trim();
  const isRetailer = description.toUpperCase() === "RETAILER";
  const type = isRetailer ? "RETAILER" : "SALON";
  const category = isRetailer ? "retailer" : "salon";
  const about = description && !LISTING_TYPE_RE.test(description) ? description : null;

  const customFields = (Array.isArray(loc.custom_fields) ? loc.custom_fields : []).filter(
    (f) => f && f.value != null && String(f.value).trim()
  );
  const servicesField = customFields.find((f) => SERVICES_FIELD_RE.test(String(f.name || "")));
  const ownerField = customFields.find(
    (f) => f !== servicesField && LEAD_FIELD_RE.test(String(f.name || ""))
  );
  const lead = ownerField ? String(ownerField.value).trim() : null;

  const website = normalizeBookingUrl(loc.website);
  const phone = loc.phone ? String(loc.phone).trim() : null;
  const email = loc.email ? String(loc.email).trim() : null;

  let state = String(loc.state || "").trim();
  let postalCode = String(loc.postal_code || "").trim();
  if (!postalCode) {
    const stateZip = state.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZip) {
      state = stateZip[1].toUpperCase();
      postalCode = stateZip[2];
    }
  }

  return {
    id: String(loc.id || "").trim(),
    name: String(loc.name || "").trim(),
    type,
    category,
    lead_stylist_or_founder: lead,
    // Only what the partner's listing states; empty means "not listed", never a default.
    services_offered: servicesField ? splitServices(servicesField.value) : [],
    about,
    address: {
      street: String(loc.address_line_1 || "").trim(),
      suite: loc.address_line_2 ? String(loc.address_line_2).trim() : null,
      city: String(loc.city || "").trim(),
      state,
      postal_code: postalCode,
      country: String(loc.country || "").trim(),
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
    booking_url: website || ECOSYSTEM_URL,
    myavana_certified: true,
    partnership_status: "ACTIVE_ECOSYSTEM_PARTNER",
  };
}

async function refreshFromLiveDirectory({ force = false, fetchImpl = globalThis.fetch, tag = STOCKIST_MAP_TAG } = {}) {
  const now = Date.now();
  if (!force && syncState.lastSyncedAt > 0 && now - syncState.lastSyncedAt < ECOSYSTEM_TTL_MS && partnersCache) {
    return getSyncStatus();
  }
  if (syncState.inFlight && !force) {
    return syncState.inFlight;
  }
  if (typeof fetchImpl !== "function") {
    syncState.lastError = "fetch unavailable";
    return getSyncStatus();
  }

  const run = (async () => {
    try {
      const signal =
        typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(LIVE_SYNC_TIMEOUT_MS)
          : undefined;
      const apiUrl = `https://stockist.co/api/v1/${tag}/locations/all`;
      const res = await fetchImpl(apiUrl, { headers: { Accept: "application/json" }, signal });
      if (!res || !res.ok) {
        throw new Error(`Stockist HTTP ${res ? res.status : "no response"}`);
      }
      const locations = await res.json();
      if (!Array.isArray(locations) || locations.length === 0) {
        throw new Error("Stockist returned empty locations array");
      }
      partnersCache = locations
        .filter((loc) => loc && loc.id && loc.name)
        .map(mapStockistLocation)
        .sort((a, b) => a.name.localeCompare(b.name));
      syncState.source = "live_stockist";
      syncState.lastSyncedAt = Date.now();
      syncState.lastError = null;
      console.log(`🔄 [StylistEcosystemService] Synced ${partnersCache.length} live partners from Stockist (${tag})`);
    } catch (err) {
      syncState.lastError = err.message;
      console.warn("[StylistEcosystemService] Live Stockist sync failed (keeping cached/snapshot):", err.message);
    } finally {
      syncState.inFlight = null;
    }
    return getSyncStatus();
  })();

  syncState.inFlight = run;
  return run;
}

function getSyncStatus() {
  const list = loadPartners();
  return {
    count: list.length,
    salons: list.filter((p) => p.category === "salon").length,
    retailers: list.filter((p) => p.category === "retailer").length,
    source: syncState.source,
    lastSyncedAt: syncState.lastSyncedAt ? new Date(syncState.lastSyncedAt).toISOString() : null,
    lastError: syncState.lastError,
    ttlMs: ECOSYSTEM_TTL_MS,
  };
}

function loadPartners() {
  if (partnersCache) {
    // Non-blocking TTL background refresh in non-test environments
    if (
      process.env.NODE_ENV !== "test" &&
      !syncState.inFlight &&
      Date.now() - syncState.lastSyncedAt >= ECOSYSTEM_TTL_MS
    ) {
      refreshFromLiveDirectory().catch(() => {});
    }
    return partnersCache;
  }
  try {
    const filePath = path.resolve(__dirname, "../../data/myavana_stylists_ecosystem.json");
    if (fs.existsSync(filePath)) {
      partnersCache = JSON.parse(fs.readFileSync(filePath, "utf8")).map((p) => ({
        ...p,
        booking_url: normalizeBookingUrl(p.booking_url) || ECOSYSTEM_URL,
        contact: p.contact ? { ...p.contact, website: normalizeBookingUrl(p.contact.website) } : p.contact,
      }));
      syncState.source = "snapshot";
      if (process.env.NODE_ENV !== "test") {
        refreshFromLiveDirectory().catch(() => {});
      }
      return partnersCache;
    }
  } catch (err) {
    console.warn("[StylistEcosystemService] Failed to load ecosystem partners:", err.message);
  }
  partnersCache = [];
  return partnersCache;
}

function resetPartnersCache() {
  partnersCache = null;
  syncState = { source: "snapshot", lastSyncedAt: 0, lastError: null, inFlight: null };
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

function normalizeStateCode(value) {
  const clean = String(value || "")
    .toLowerCase()
    .replace(/\b\d{5}(?:-\d{4})?\b/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  if (STATE_ABBR_TO_NAME[clean]) return clean;
  if (STATE_NAME_TO_ABBR[clean]) return STATE_NAME_TO_ABBR[clean];
  return clean;
}

function extractPartnerZip(partner) {
  const rawZip = String(partner?.address?.postal_code || "").trim();
  if (rawZip) return rawZip.toLowerCase();
  const stateZip = String(partner?.address?.state || "").match(/\b(\d{5})\b/);
  return stateZip ? stateZip[1] : "";
}

function parseLocationQuery(rawQuery) {
  const raw = String(rawQuery || "").trim();
  const lower = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const zipMatch = lower.match(/\b(\d{5})\b/);
  const zip = zipMatch ? zipMatch[1] : null;

  // Strip zip and trailing country words ("usa", "united states", "us")
  const withoutZip = lower
    .replace(/\b\d{5}(?:-\d{4})?\b/g, " ")
    .replace(/\b(?:united states|usa|u\.s\.a\.|u\.s\.)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  let city = "";
  let stateCode = "";

  if (withoutZip.includes(",")) {
    const parts = withoutZip.split(",").map((s) => s.trim()).filter(Boolean);
    city = parts[0] || "";
    if (parts[1]) {
      stateCode = normalizeStateCode(parts[1]);
    }
  } else if (withoutZip) {
    // Check if the whole string is a state name or abbreviation
    const asState = normalizeStateCode(withoutZip);
    if (STATE_ABBR_TO_NAME[asState] && (withoutZip.length === 2 || STATE_NAME_TO_ABBR[withoutZip])) {
      stateCode = asState;
    } else {
      // Check trailing 2-letter state abbreviation e.g. "Atlanta GA"
      const trailingState = withoutZip.match(/^(.+?)\s+([a-z]{2})$/i);
      if (trailingState && STATE_ABBR_TO_NAME[trailingState[2].toLowerCase()]) {
        city = trailingState[1].trim();
        stateCode = trailingState[2].toLowerCase();
      } else {
        city = withoutZip;
      }
    }
  }

  return { raw, lower, zip, city, stateCode };
}

function filterByCategory(list, category) {
  if (category === "salon" || category === "stylist" || category === "salon_or_stylist") {
    return list.filter((p) => p.category === "salon");
  }
  if (category === "retailer") {
    return list.filter((p) => p.category === "retailer");
  }
  return list;
}

/**
 * Resolve a city/state or 5-digit US ZIP code to { latitude, longitude, label }.
 * Uses built-in tables first (fast, offline-safe), then falls back to Zippopotam /
 * Open-Meteo geocoding with a tight timeout.
 */
async function resolveLocationCoordinates(query, options = {}) {
  const parsed = parseLocationQuery(query);
  const partners = loadPartners();

  // 1. Exact ZIP match against our own partners first
  if (parsed.zip) {
    const zipPartner = partners.find((p) => extractPartnerZip(p).startsWith(parsed.zip));
    if (zipPartner && zipPartner.coordinates) {
      return {
        latitude: zipPartner.coordinates.latitude,
        longitude: zipPartner.coordinates.longitude,
        label: `${zipPartner.address.city}, ${zipPartner.address.state} ${parsed.zip}`,
      };
    }
  }

  // 2. Built-in city lookup
  const cityKey = parsed.city.replace(/\./g, "").trim();
  if (cityKey && CITY_COORDINATES[cityKey]) {
    const hit = CITY_COORDINATES[cityKey];
    return {
      latitude: hit.lat,
      longitude: hit.lon,
      label: parsed.raw || hit.label,
    };
  }

  // 3. Optional live geocoding for unknown ZIPs or cities
  const fetchImpl = options.fetchImpl !== undefined ? options.fetchImpl : globalThis.fetch;
  if (typeof fetchImpl === "function" && options.allowNetwork !== false) {
    const signal =
      typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(GEOCODE_TIMEOUT_MS)
        : undefined;

    if (parsed.zip) {
      try {
        const res = await fetchImpl(`https://api.zippopotam.us/us/${parsed.zip}`, { signal });
        if (res && res.ok) {
          const data = await res.json();
          const place = Array.isArray(data?.places) ? data.places[0] : null;
          if (place && place.latitude && place.longitude) {
            return {
              latitude: parseFloat(place.latitude),
              longitude: parseFloat(place.longitude),
              label: `${place["place name"]}, ${place["state abbreviation"]} ${parsed.zip}`,
            };
          }
        }
      } catch {
        // fall through to prefix fallback
      }
    } else if (cityKey) {
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityKey)}&count=5&language=en&format=json`;
        const res = await fetchImpl(url, { signal });
        if (res && res.ok) {
          const data = await res.json();
          const results = Array.isArray(data?.results) ? data.results : [];
          let best = results[0];
          if (parsed.stateCode && results.length > 0) {
            const stateFull = STATE_ABBR_TO_NAME[parsed.stateCode] || parsed.stateCode;
            best =
              results.find(
                (r) =>
                  normalizeStateCode(r.admin1) === parsed.stateCode ||
                  String(r.admin1 || "").toLowerCase() === stateFull
              ) || best;
          }
          if (best && best.latitude != null && best.longitude != null) {
            return {
              latitude: parseFloat(best.latitude),
              longitude: parseFloat(best.longitude),
              label: best.admin1 ? `${best.name}, ${best.admin1}` : best.name,
            };
          }
        }
      } catch {
        // fall through
      }
    }
  }

  // 4. Built-in 3-digit ZIP prefix fallback
  if (parsed.zip) {
    const prefix = parsed.zip.slice(0, 3);
    if (ZIP3_COORDINATES[prefix]) {
      const hit = ZIP3_COORDINATES[prefix];
      return {
        latitude: hit.lat,
        longitude: hit.lon,
        label: `${hit.label} (${parsed.zip})`,
      };
    }
  }

  return null;
}

const StylistEcosystemService = {
  ECOSYSTEM_URL,
  ECOSYSTEM_TTL_MS,
  STOCKIST_MAP_TAG,
  mapStockistLocation,
  resetPartnersCache,
  refreshFromLiveDirectory,
  getSyncStatus,
  parseLocationQuery,
  resolveLocationCoordinates,

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
   * Search partners by city, state, "City, ST", zip, or name keyword.
   */
  searchPartners({ query = "", category = "all", limit = 5 } = {}) {
    const parsed = parseLocationQuery(query);
    const list = filterByCategory(loadPartners(), category);

    if (!parsed.lower) return list.slice(0, limit);

    const scored = [];
    for (const p of list) {
      const pName = (p.name || "").toLowerCase();
      const pStylist = (p.lead_stylist_or_founder || "").toLowerCase();
      const pCity = (p.address?.city || "").toLowerCase();
      const pStateCode = normalizeStateCode(p.address?.state || "");
      const pStateRaw = (p.address?.state || "").toLowerCase();
      const pZip = extractPartnerZip(p);
      const pCountry = (p.address?.country || "").toLowerCase();

      let score = 0;

      // Exact ZIP match
      if (parsed.zip && pZip && pZip.startsWith(parsed.zip)) {
        score = Math.max(score, 100);
      }

      // City (+ optional state) match — handles "Atlanta, GA", "Atlanta, Georgia", "Atlanta"
      if (parsed.city) {
        const cityMatch = pCity === parsed.city || pCity.includes(parsed.city);
        const nameMatch = pName.includes(parsed.city) || pStylist.includes(parsed.city);
        const countryMatch = pCountry === parsed.city || pCountry.includes(parsed.city);

        if (cityMatch) {
          if (!parsed.stateCode || pStateCode === parsed.stateCode) {
            score = Math.max(score, pCity === parsed.city ? 95 : 85);
          }
        } else if (nameMatch) {
          if (!parsed.stateCode || pStateCode === parsed.stateCode) {
            score = Math.max(score, 75);
          }
        } else if (countryMatch && !parsed.stateCode) {
          score = Math.max(score, 60);
        }
      }

      // Pure state search (e.g. "GA", "Georgia", "MD")
      if (!parsed.city && !parsed.zip && parsed.stateCode) {
        if (pStateCode === parsed.stateCode || pStateRaw === parsed.lower) {
          score = Math.max(score, 80);
        }
      }

      // Direct full-query fallback against name / stylist / city / state / zip / country
      if (
        score === 0 &&
        (pName.includes(parsed.lower) ||
          pStylist.includes(parsed.lower) ||
          pCity.includes(parsed.lower) ||
          pStateRaw.includes(parsed.lower) ||
          pZip.includes(parsed.lower) ||
          pCountry.includes(parsed.lower))
      ) {
        score = 50;
      }

      if (score > 0) {
        scored.push({ partner: p, score });
      }
    }

    scored.sort((a, b) => b.score - a.score || a.partner.name.localeCompare(b.partner.name));
    const directMatches = scored.map((s) => s.partner);

    // If the user searched a city we have coordinates for (e.g. "Atlanta, GA"),
    // also include nearby metro partners within 35 miles (e.g. Marietta, GA)
    // after exact-city matches so members see the full metro options.
    if (parsed.city && CITY_COORDINATES[parsed.city.replace(/\./g, "").trim()]) {
      const coord = CITY_COORDINATES[parsed.city.replace(/\./g, "").trim()];
      const nearby = this.findNearest({
        latitude: coord.lat,
        longitude: coord.lon,
        maxDistanceMiles: 35,
        category,
        limit,
      });
      const seen = new Set(directMatches.map((p) => p.id));
      for (const n of nearby) {
        if (!seen.has(n.id)) {
          directMatches.push(n);
          seen.add(n.id);
        }
      }
    }

    return directMatches.slice(0, limit);
  },

  /**
   * Find nearest salons or retailers using latitude and longitude coordinates.
   */
  findNearest({ latitude, longitude, maxDistanceMiles = 100, category = "salon", limit = 5 }) {
    if (latitude == null || longitude == null) return [];
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) return [];

    const list = filterByCategory(loadPartners(), category);

    const calculated = list
      .filter((p) => p.coordinates && Number.isFinite(p.coordinates.latitude) && Number.isFinite(p.coordinates.longitude))
      .map((p) => {
        const dist = calculateHaversineDistanceMiles(lat, lon, p.coordinates.latitude, p.coordinates.longitude);
        return {
          ...p,
          distance_miles: Math.round(dist * 10) / 10,
        };
      });

    return calculated
      .filter((p) => p.distance_miles <= maxDistanceMiles)
      .sort((a, b) => a.distance_miles - b.distance_miles)
      .slice(0, limit);
  },

  /**
   * Unified location search supporting city/state, ZIP code, or coordinates.
   * When no partner exists locally (within maxLocalMiles), returns noLocalPartner: true
   * along with the nearest partners and their distances in miles.
   */
  async searchByLocation({
    query = "",
    latitude = null,
    longitude = null,
    category = "salon",
    limit = 5,
    maxLocalMiles = 50,
    fetchImpl,
    allowNetwork = true,
  } = {}) {
    const hasCoords = latitude != null && longitude != null && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude));

    if (hasCoords) {
      const local = this.findNearest({
        latitude,
        longitude,
        maxDistanceMiles: maxLocalMiles,
        category,
        limit,
      });
      if (local.length > 0) {
        return {
          partners: local,
          nearest: local,
          noLocalPartner: false,
          resolvedLocation: query || "your location",
        };
      }
      const nearest = this.findNearest({
        latitude,
        longitude,
        maxDistanceMiles: Infinity,
        category,
        limit: Math.min(limit, 3),
      });
      return {
        partners: [],
        nearest,
        noLocalPartner: true,
        resolvedLocation: query || "your location",
      };
    }

    const trimmed = String(query || "").trim();
    if (!trimmed) {
      return { partners: [], nearest: [], noLocalPartner: false, resolvedLocation: null };
    }

    // 1. Direct text / metro match
    const direct = this.searchPartners({ query: trimmed, category, limit });
    if (direct.length > 0) {
      return {
        partners: direct,
        nearest: direct,
        noLocalPartner: false,
        resolvedLocation: trimmed,
      };
    }

    // 2. Geocode ZIP or city/state to find local or nearest partners with distances
    const coords = await resolveLocationCoordinates(trimmed, { fetchImpl, allowNetwork });
    if (coords) {
      const local = this.findNearest({
        latitude: coords.latitude,
        longitude: coords.longitude,
        maxDistanceMiles: maxLocalMiles,
        category,
        limit,
      });
      if (local.length > 0) {
        return {
          partners: local,
          nearest: local,
          noLocalPartner: false,
          resolvedLocation: coords.label || trimmed,
        };
      }
      const nearest = this.findNearest({
        latitude: coords.latitude,
        longitude: coords.longitude,
        maxDistanceMiles: Infinity,
        category,
        limit: Math.min(limit, 3),
      });
      return {
        partners: [],
        nearest,
        noLocalPartner: true,
        resolvedLocation: coords.label || trimmed,
      };
    }

    return {
      partners: [],
      nearest: [],
      noLocalPartner: true,
      resolvedLocation: trimmed,
    };
  },
};

module.exports = StylistEcosystemService;
