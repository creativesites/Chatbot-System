/**
 * End-to-end tests for S2: deterministic stylist location follow-up resolution.
 */

const {
  ECOSYSTEM_URL,
  didPreviousTurnAskForStylistLocation,
  extractLocationFromTurn,
  resolveStylistLocationFollowUp,
} = require('../ecosystem/stylistFollowUp');

describe('stylistFollowUp (S2)', () => {
  const atlantaConversationHistory = [
    {
      role: 'user',
      content: 'I want to get my hair colored, can you find me a stylist?',
    },
    {
      role: 'assistant',
      content:
        'I can help you find a MYAVANA-certified stylist for your color! What city, state, or zip code are you in?',
    },
  ];

  test('detects when previous assistant turn asked for a stylist location', () => {
    expect(didPreviousTurnAskForStylistLocation(atlantaConversationHistory)).toBe(true);
    expect(
      didPreviousTurnAskForStylistLocation([
        { role: 'user', content: 'My hair feels dry' },
        { role: 'assistant', content: 'How often do you deep condition?' },
      ])
    ).toBe(false);
  });

  test('runs the Atlanta conversation end-to-end and returns Atlanta partners with stylist cards', async () => {
    const result = await resolveStylistLocationFollowUp({
      message: 'Atlanta, GA',
      chatHistory: atlantaConversationHistory,
      allowNetwork: false,
    });

    expect(result).not.toBeNull();
    expect(result.handled).toBe(true);
    expect(result.noLocalPartner).toBe(false);

    const names = result.partners.map((p) => p.name);
    expect(names).toContain('MYAVANA Certified Beauty Tech Lab');
    expect(names).toContain("It's a Hair Thang");
    expect(names).toContain('Krush Beauty');

    // Sends structured stylist cards + ecosystem navigation card
    const stylistCards = result.blocks.filter((b) => b.type === 'consultation_card');
    expect(stylistCards.length).toBeGreaterThanOrEqual(3);
    expect(stylistCards[0].data.title).toBeTruthy();
    expect(stylistCards[0].data.address).toBeTruthy();

    const ecoNav = result.blocks.find((b) => b.type === 'navigation');
    expect(ecoNav).toBeDefined();
    expect(ecoNav.data.url).toBe(ECOSYSTEM_URL);
  });

  test('handles a 5-digit ZIP code reply', async () => {
    const result = await resolveStylistLocationFollowUp({
      message: '30308',
      chatHistory: atlantaConversationHistory,
      allowNetwork: false,
    });

    expect(result).not.toBeNull();
    expect(result.handled).toBe(true);
    expect(result.noLocalPartner).toBe(false);
    expect(result.partners.some((p) => p.address.city === 'Atlanta')).toBe(true);
  });

  test('handles a city with no nearby partner by saying so and giving nearest partners with distance', async () => {
    const result = await resolveStylistLocationFollowUp({
      message: 'Seattle, WA',
      chatHistory: atlantaConversationHistory,
      allowNetwork: false,
    });

    expect(result).not.toBeNull();
    expect(result.handled).toBe(true);
    expect(result.noLocalPartner).toBe(true);
    expect(result.partners).toEqual([]);
    expect(result.nearest.length).toBeGreaterThan(0);
    expect(result.text).toMatch(/don't have a certified MYAVANA partner/i);
    expect(result.text).toMatch(/mi away/i);

    const cards = result.blocks.filter((b) => b.type === 'consultation_card');
    expect(cards.length).toBe(result.nearest.length);
    expect(cards[0].data.distanceMiles).toBeGreaterThan(500);
  });

  test('handles "Share my location" chip with GPS coordinates', async () => {
    const result = await resolveStylistLocationFollowUp({
      message: 'Share my location',
      chatHistory: atlantaConversationHistory,
      experienceContext: {
        location: { latitude: 33.749, longitude: -84.388 },
      },
      allowNetwork: false,
    });

    expect(result).not.toBeNull();
    expect(result.handled).toBe(true);
    expect(result.noLocalPartner).toBe(false);
    expect(result.partners[0].name).toBe('MYAVANA Certified Beauty Tech Lab');
    expect(result.partners[0].distance_miles).toBeLessThan(2);
  });

  test('handles "Share my location" chip when no coordinates were attached', async () => {
    const result = await resolveStylistLocationFollowUp({
      message: 'Share my location',
      chatHistory: atlantaConversationHistory,
      experienceContext: {},
      allowNetwork: false,
    });

    expect(result).not.toBeNull();
    expect(result.handled).toBe(true);
    expect(result.text).toMatch(/city and state|zip code/i);
  });

  test('returns null when the member changes the subject instead of giving a location', async () => {
    const result = await resolveStylistLocationFollowUp({
      message: 'Actually, how often should I deep condition 4C hair?',
      chatHistory: atlantaConversationHistory,
      allowNetwork: false,
    });

    expect(result).toBeNull();
    expect(extractLocationFromTurn('No thanks')).toBeNull();
  });
});
