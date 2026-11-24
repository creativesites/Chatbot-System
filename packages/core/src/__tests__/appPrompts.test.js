/**
 * Tests for self-serve App Prompts config service and live Ecosystem auto-sync.
 */

const { DEFAULT_APP_PROMPTS, getAppPrompts, clearAppPromptsCache } = require('../appPrompts');
const StylistEcosystemService = require('../ecosystem/stylistEcosystemService');

describe('appPrompts', () => {
  beforeEach(() => {
    clearAppPromptsCache();
  });

  test('falls back to DEFAULT_APP_PROMPTS when table does not exist yet', async () => {
    const pg = { query: jest.fn().mockRejectedValue(Object.assign(new Error('missing'), { code: '42P01' })) };
    const payload = await getAppPrompts(pg);
    expect(payload.source).toBe('defaults');
    expect(payload.byKey.consult_expert_advice.promptText).toMatch(/consultation/i);
    expect(payload.byKey.request_stylist.promptText).toMatch(/stylist/i);
    expect(payload.prompts.length).toBe(DEFAULT_APP_PROMPTS.length);
  });

  test('merges DB overrides over defaults and caches until cleared', async () => {
    const pg = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            prompt_key: 'consult_expert_advice',
            title: 'Get Expert Advice',
            prompt_text: 'Custom Candace prompt for consultations',
            screen: 'home',
            starter_chips: ['Chip A', 'Chip B'],
            is_active: true,
          },
        ],
      }),
    };

    const first = await getAppPrompts(pg);
    expect(first.source).toBe('database');
    expect(first.byKey.consult_expert_advice.promptText).toBe('Custom Candace prompt for consultations');
    expect(first.byKey.consult_expert_advice.starterChips).toEqual(['Chip A', 'Chip B']);
    expect(first.byKey.request_stylist).toBeDefined();

    // Cached second call does not hit DB again
    await getAppPrompts(pg);
    expect(pg.query).toHaveBeenCalledTimes(1);

    clearAppPromptsCache();
    await getAppPrompts(pg);
    expect(pg.query).toHaveBeenCalledTimes(2);
  });
});

describe('StylistEcosystemService live Stockist auto-sync', () => {
  afterEach(() => {
    StylistEcosystemService.resetPartnersCache();
  });

  test('refreshFromLiveDirectory updates partners, upgrades http:// booking links, and strips hair-assessment placeholders', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 'loc_new1',
          name: 'Test Live Salon',
          description: 'SALON',
          address_line_1: '100 Peachtree St',
          city: 'Atlanta',
          state: 'GA',
          postal_code: '30303',
          country: 'USA',
          latitude: '33.75',
          longitude: '-84.39',
          website: 'http://styleseat.com/m/v/testlive',
          custom_fields: [{ name: 'Owner/Founder', value: 'Jane Doe' }],
        },
        {
          id: 'loc_new2',
          name: 'Placeholder Salon',
          description: 'SALON',
          address_line_1: '200 Main St',
          city: 'Atlanta',
          state: 'GA',
          postal_code: '30303',
          country: 'USA',
          latitude: '33.76',
          longitude: '-84.38',
          website: 'https://www.myavana.com/products/hair-assessment',
          custom_fields: [],
        },
      ],
    });

    const status = await StylistEcosystemService.refreshFromLiveDirectory({ force: true, fetchImpl });
    expect(status.source).toBe('live_stockist');
    expect(status.count).toBe(2);
    expect(status.lastError).toBeNull();

    const live1 = StylistEcosystemService.getPartnerById('loc_new1');
    expect(live1.booking_url).toBe('https://styleseat.com/m/v/testlive');
    const live2 = StylistEcosystemService.getPartnerById('loc_new2');
    expect(live2.booking_url).toBe(StylistEcosystemService.ECOSYSTEM_URL);
  });
});
