/**
 * Deterministic Stylist Location Follow-Up Resolver
 *
 * When Mya asks a member for their city, state, or ZIP code to find a stylist
 * and the member replies with a location (e.g. "Atlanta, GA", "30308", or
 * tapping "Share my location"), models sometimes answer in prose without
 * invoking findStylistOrSalon. This module handles that follow-up turn
 * directly in code using StylistEcosystemService and builds structured
 * stylist cards + the MYAVANA Ecosystem directory link.
 */

const StylistEcosystemService = require('./stylistEcosystemService');

const ECOSYSTEM_URL = StylistEcosystemService.ECOSYSTEM_URL;

const STYLIST_CONTEXT_RE =
  /\b(?:stylist|salon|colorist|braider|loctician|barber|hairscope|ecosystem|certified\s+(?:pro|salon|stylist)|in[- ]person\s+(?:hair|stylist|salon|appointment|analysis))\b/i;

const LOCATION_ASK_RE =
  /(?:\b(?:what|which|share|drop|tell\s+me|let\s+me\s+know|give\s+me|enter|send|provide)\b[^?!.]*\b(?:city|state|zip(?:\s*code)?|location|area|where\s+you(?:'re|\s+are|\s+live))\b|\b(?:city|state|zip(?:\s*code)?|location)\b[^?!.]*\?|\bshare\s+my\s+location\b)/i;

const CANCEL_OR_TOPIC_CHANGE_RE =
  /^(?:no(?:\s+thanks?)?|nope|never\s*mind|cancel|skip|stop|forget\s+it|actually\b|instead\b|what\s+(?:is|are|should|do)\b|how\s+(?:do|can|should|often)\b|why\s+(?:is|does|do)\b)/i;

const SHARE_LOCATION_TEXT_RE = /^(?:📍\s*)?share\s+my\s+location$/i;

const COORD_TEXT_RE = /(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/;

const ZIP_RE = /\b(\d{5})(?:-\d{4})?\b/;

function extractTurnText(turn) {
  if (!turn) return '';
  const c = turn.content ?? turn.text ?? turn.message ?? '';
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c.map((p) => (typeof p === 'string' ? p : p?.message || p?.text || '')).filter(Boolean).join(' ');
  }
  if (typeof c === 'object') {
    return c.message || c.text || '';
  }
  return String(c || '');
}

/**
 * True when Mya's most recent assistant turn asked for a location in the
 * context of finding a stylist / salon.
 */
function didPreviousTurnAskForStylistLocation(chatHistory) {
  if (!Array.isArray(chatHistory) || chatHistory.length === 0) return false;

  let lastAssistantIdx = -1;
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const role = chatHistory[i]?.role;
    if (role === 'assistant' || role === 'model') {
      lastAssistantIdx = i;
      break;
    }
  }
  if (lastAssistantIdx === -1) return false;

  const lastAssistantText = extractTurnText(chatHistory[lastAssistantIdx]);
  if (!LOCATION_ASK_RE.test(lastAssistantText)) return false;

  if (STYLIST_CONTEXT_RE.test(lastAssistantText)) return true;

  // Also check the preceding user turn (e.g. "can you find me a stylist?" -> "What city are you in?")
  for (let i = lastAssistantIdx - 1; i >= Math.max(0, lastAssistantIdx - 3); i--) {
    if (chatHistory[i]?.role === 'user') {
      const userText = extractTurnText(chatHistory[i]);
      if (STYLIST_CONTEXT_RE.test(userText)) return true;
    }
  }
  return false;
}

function readCoords(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const lat = obj.latitude ?? obj.lat;
  const lon = obj.longitude ?? obj.lng ?? obj.lon;
  if (lat == null || lon == null) return null;
  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) return null;
  if (Math.abs(parsedLat) > 90 || Math.abs(parsedLon) > 180) return null;
  return { latitude: parsedLat, longitude: parsedLon };
}

/**
 * Extract location intent (coordinates, ZIP, or city/state text) from the
 * member's follow-up turn. Returns null if the message does not look like a
 * location reply.
 */
function extractLocationFromTurn(message, experienceContext = {}, reqBody = {}) {
  const raw = String(message || '').trim();

  // 1. Structured coordinates from "Share my location" chip / host context
  const coords =
    readCoords(experienceContext?.location) ||
    readCoords(experienceContext?.coordinates) ||
    readCoords(reqBody?.location) ||
    readCoords(reqBody?.coordinates);

  if (coords) {
    const label =
      (typeof experienceContext?.location?.label === 'string' && experienceContext.location.label) ||
      (raw && !SHARE_LOCATION_TEXT_RE.test(raw) && !COORD_TEXT_RE.test(raw) ? raw : 'your location');
    return { type: 'coordinates', latitude: coords.latitude, longitude: coords.longitude, query: label };
  }

  if (!raw) return null;

  // 2. Coordinates typed/sent inline in text (e.g. "My location: 33.7490, -84.3880")
  const coordMatch = raw.match(COORD_TEXT_RE);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { type: 'coordinates', latitude: lat, longitude: lon, query: 'your location' };
    }
  }

  // 3. "Share my location" chip tapped without GPS payload attached
  if (SHARE_LOCATION_TEXT_RE.test(raw)) {
    return { type: 'share_location_no_coords' };
  }

  // 4. Reject obvious cancellations or topic switches
  if (CANCEL_OR_TOPIC_CHANGE_RE.test(raw)) {
    return null;
  }

  // 5. 5-digit US ZIP code anywhere in a short reply
  const zipMatch = raw.match(ZIP_RE);
  if (zipMatch && raw.length <= 80) {
    return { type: 'zip', query: zipMatch[1] };
  }

  // 6. Strip conversational lead-in ("I'm in Atlanta, GA", "Near Brooklyn, NY")
  let cleaned = raw
    .replace(/^(?:i(?:'m|\s+am)?\s+(?:in|from|near|around|located\s+in)|i\s+live\s+(?:in|near)|located\s+(?:in|near)|near|around|in|my\s+(?:city|location|area)\s+is)\s+/i, '')
    .replace(/[.!?]+$/g, '')
    .trim();

  if (!cleaned || cleaned.length > 60) return null;
  // Don't treat multi-sentence prose or questions as a bare city reply
  if (cleaned.includes('?') || cleaned.split(/\s+/).length > 6) return null;

  return { type: 'city', query: cleaned };
}

function formatPartnerAddress(partner) {
  const a = partner?.address || {};
  const line1 = [a.street, a.suite].filter(Boolean).join(', ');
  const line2 = [a.city, a.state, a.postal_code].filter(Boolean).join(', ');
  return [line1, line2].filter(Boolean).join(' · ');
}

function buildStylistCardBlock(partner, index = 0) {
  const isRetailer = partner.category === 'retailer';
  const roleLabel = isRetailer ? 'MYAVANA Certified Retailer' : 'MYAVANA Certified Salon';
  const eyebrow =
    partner.distance_miles != null
      ? `${roleLabel} · ${partner.distance_miles} mi away`
      : roleLabel;

  const address = formatPartnerAddress(partner);
  const details = [];
  if (partner.lead_stylist_or_founder) {
    details.push(`Lead Stylist: ${partner.lead_stylist_or_founder}`);
  }
  if (address) {
    details.push(address);
  }
  if (partner.contact?.phone) {
    details.push(`Phone: ${partner.contact.phone}`);
  }

  const rawBookingUrl = partner.booking_url || partner.contact?.website || ECOSYSTEM_URL;
  const hasDirectBookingSite =
    Boolean(rawBookingUrl) && !/myavana\.com\/products\/hair-assessment/i.test(rawBookingUrl) && rawBookingUrl !== ECOSYSTEM_URL;
  const bookingUrl = hasDirectBookingSite ? rawBookingUrl : ECOSYSTEM_URL;

  return {
    id: `stylist_${partner.id || index}`,
    type: 'consultation_card',
    data: {
      eyebrow,
      title: partner.name,
      name: partner.name,
      description: details.join('\n'),
      address,
      leadStylist: partner.lead_stylist_or_founder || null,
      phone: partner.contact?.phone || null,
      email: partner.contact?.email || null,
      distanceMiles: partner.distance_miles ?? null,
      url: bookingUrl,
    },
    actions: [
      {
        type: 'open_url',
        label: hasDirectBookingSite ? 'Book / Visit' : 'View in Ecosystem',
        payload: { url: bookingUrl, partnerId: partner.id },
      },
    ],
  };
}

function buildEcosystemNavigationBlock() {
  return {
    id: 'nav_myavana_ecosystem',
    type: 'navigation',
    data: {
      eyebrow: 'MYAVANA Ecosystem',
      title: 'Explore the MYAVANA Ecosystem',
      description: 'Browse all certified MYAVANA salons, stylists, and retail partners on the full map.',
      url: ECOSYSTEM_URL,
      cta: 'Open Ecosystem Map',
    },
    actions: [
      {
        type: 'open_url',
        label: 'Open Ecosystem Map',
        payload: { url: ECOSYSTEM_URL },
      },
    ],
  };
}

function formatPartnerBullet(p) {
  const loc = [p.address?.city, p.address?.state].filter(Boolean).join(', ');
  const lead = p.lead_stylist_or_founder ? ` (Lead: ${p.lead_stylist_or_founder})` : '';
  const dist = p.distance_miles != null ? ` — ${p.distance_miles} mi away` : '';
  return `- **${p.name}**${lead}${loc ? `, ${loc}` : ''}${dist}`;
}

/**
 * If the previous turn asked for a stylist location and this turn provides one,
 * resolve it directly against StylistEcosystemService and return the full
 * response (prose + stylist cards + ecosystem navigation card).
 * Returns null if this turn is NOT a stylist location follow-up.
 */
async function resolveStylistLocationFollowUp({
  message,
  chatHistory = [],
  experienceContext = {},
  reqBody = {},
  category = 'salon',
  limit = 5,
  allowNetwork = true,
  fetchImpl,
} = {}) {
  if (!didPreviousTurnAskForStylistLocation(chatHistory)) {
    return null;
  }

  const extracted = extractLocationFromTurn(message, experienceContext, reqBody);
  if (!extracted) {
    return null;
  }

  if (extracted.type === 'share_location_no_coords') {
    return {
      handled: true,
      text:
        "I didn't receive your GPS coordinates from that tap. Type your city and state (for example, \"Atlanta, GA\") or your 5-digit ZIP code, and I'll pull up the closest MYAVANA-certified salons for you.",
      blocks: [buildEcosystemNavigationBlock()],
      partners: [],
      nearest: [],
      noLocalPartner: false,
      quickReplies: [
        { label: 'Atlanta, GA', payload: { text: 'Atlanta, GA' } },
        { label: 'Browse Ecosystem Map', payload: { text: 'Show me the MYAVANA Ecosystem map' } },
      ],
    };
  }

  const searchResult = await StylistEcosystemService.searchByLocation({
    query: extracted.query,
    latitude: extracted.latitude ?? null,
    longitude: extracted.longitude ?? null,
    category,
    limit,
    allowNetwork,
    fetchImpl,
  });

  const { partners, nearest, noLocalPartner, resolvedLocation } = searchResult;
  const displayLoc = resolvedLocation || extracted.query || 'your area';

  if (!noLocalPartner && partners.length > 0) {
    const listText = partners.map(formatPartnerBullet).join('\n');
    const text =
      `Here ${partners.length === 1 ? 'is a certified MYAVANA salon' : `are ${partners.length} certified MYAVANA salons`} near **${displayLoc}**:\n\n` +
      `${listText}\n\n` +
      `Tap any card below to book or view details, or explore the full MYAVANA Ecosystem directory.`;

    const blocks = [
      ...partners.map((p, idx) => buildStylistCardBlock(p, idx)),
      buildEcosystemNavigationBlock(),
    ];

    return {
      handled: true,
      text,
      blocks,
      partners,
      nearest: partners,
      noLocalPartner: false,
      resolvedLocation: displayLoc,
      quickReplies: [
        { label: 'Search another city', payload: { text: 'Can you search another city for a stylist?' } },
        { label: 'What to ask my stylist', payload: { text: 'What should I ask my stylist before coloring my hair?' } },
      ],
    };
  }

  if (nearest && nearest.length > 0) {
    const listText = nearest.map(formatPartnerBullet).join('\n');
    const text =
      `We don't have a certified MYAVANA partner in **${displayLoc}** just yet. Here are the closest certified salons in our network:\n\n` +
      `${listText}\n\n` +
      `You can also browse the full MYAVANA Ecosystem directory below as new salons join.`;

    const blocks = [
      ...nearest.map((p, idx) => buildStylistCardBlock(p, idx)),
      buildEcosystemNavigationBlock(),
    ];

    return {
      handled: true,
      text,
      blocks,
      partners: [],
      nearest,
      noLocalPartner: true,
      resolvedLocation: displayLoc,
      quickReplies: [
        { label: 'Try another ZIP or city', payload: { text: 'Can you check another city for a stylist?' } },
        { label: 'Book a virtual consult', payload: { text: 'Tell me about a virtual hair consultation' } },
      ],
    };
  }

  return {
    handled: true,
    text:
      `We don't have a certified MYAVANA partner listed for **${displayLoc}** yet. You can check the full MYAVANA Ecosystem directory below or try a nearby major city or 5-digit ZIP code.`,
    blocks: [buildEcosystemNavigationBlock()],
    partners: [],
    nearest: [],
    noLocalPartner: true,
    resolvedLocation: displayLoc,
    quickReplies: [
      { label: 'Try another city', payload: { text: 'Can you check another city for a stylist?' } },
      { label: 'Book a virtual consult', payload: { text: 'Tell me about a virtual hair consultation' } },
    ],
  };
}

module.exports = {
  ECOSYSTEM_URL,
  didPreviousTurnAskForStylistLocation,
  extractLocationFromTurn,
  buildStylistCardBlock,
  buildEcosystemNavigationBlock,
  resolveStylistLocationFollowUp,
};
