/**
 * Funnel events for the upsell (Phase 2 step 1: measure first).
 *
 * Events go to the existing POST /events (chatbot_funnel_events) with
 * surface:'app', and are mirrored to the host's analytics (Firebase). A failed
 * send never reaches the UI, but it is reported to onError so it is not
 * silently lost.
 */

const EVENTS = [
  'offer_shown',
  'offer_tapped',
  'offer_dismissed',
  'paywall_opened',
  'purchase_completed',
  'purchase_cancelled',
  'link_opened',
  'consult_booking_opened',
];

function createFunnelTracker({ send, mirror, onError } = {}) {
  const shown = new Set();

  async function track(eventType, offer, extra = {}) {
    if (EVENTS.indexOf(eventType) === -1) return undefined;
    const metadata = {
      surface: 'app',
      service: offer ? offer.service : null,
      offer_id: offer ? offer.id : null,
      price_shown: offer ? offer.priceDisplay || null : null,
      framing_variant: offer ? offer.variant : null,
      route: offer && offer.cta ? offer.cta.route : null,
      ...extra,
    };
    try {
      if (mirror) mirror(`mya_${eventType}`, metadata);
    } catch (e) {
      onError && onError(e);
    }
    try {
      if (send) await send(eventType, metadata);
    } catch (e) {
      onError && onError(e);
    }
    return undefined;
  }

  return {
    track,
    /** offer_shown fires once per offer, however often the card re-renders. */
    async offerShown(offer) {
      if (!offer || shown.has(offer.id)) return undefined;
      shown.add(offer.id);
      return track('offer_shown', offer);
    },
  };
}

module.exports = { EVENTS, createFunnelTracker };
