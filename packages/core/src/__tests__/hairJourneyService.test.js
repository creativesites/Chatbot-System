const { HairJourneyService } = require('../hairJourney/hairJourneyService');
const { BlockType, ActionType } = require('../chatProtocol');

describe('HairJourneyService', () => {
  let service;

  beforeEach(() => {
    service = new HairJourneyService();
  });

  test('buildGoalCardBlock returns valid GOAL_CARD block', () => {
    const goal = {
      id: 'goal_test_1',
      title: 'Grow 4 inches',
      category: 'Length',
      progressPercent: 50,
      targetMetric: '4 Inches',
      targetDate: 'Dec 2026'
    };

    const block = service.buildGoalCardBlock(goal);
    expect(block.type).toBe(BlockType.GOAL_CARD);
    expect(block.data.title).toBe('Grow 4 inches');
    expect(block.data.progressPercent).toBe(50);
    expect(block.actions.length).toBeGreaterThan(0);
  });

  test('buildTodayChecklistBlock returns valid TODAY_CHECKLIST block', () => {
    const todayData = {
      date: '2026-09-04',
      streakDays: 5,
      checklist: [
        { id: 's1', title: 'Hydration Mist', completed: true },
        { id: 's2', title: 'Deep Condition', completed: false }
      ]
    };

    const block = service.buildTodayChecklistBlock(todayData);
    expect(block.type).toBe(BlockType.TODAY_CHECKLIST);
    expect(block.data.streakDays).toBe(5);
    expect(block.data.steps.length).toBe(2);
    expect(block.data.steps[0].completed).toBe(true);
  });

  test('buildJournalEntryBlock returns valid JOURNAL_ENTRY block with UPLOAD_PHOTO action', () => {
    const entry = {
      id: 123,
      title: 'Wash Day Success',
      notes: 'Hair felt deeply moisturized and shiny',
      moistureLevel: 5,
      scalpState: 'Healthy',
      photos: ['https://example.com/photo1.jpg']
    };

    const block = service.buildJournalEntryBlock(entry);
    expect(block.type).toBe(BlockType.JOURNAL_ENTRY);
    expect(block.data.title).toBe('Wash Day Success');
    expect(block.data.moistureLevel).toBe(5);
    expect(block.data.photos.length).toBe(1);

    const uploadAction = block.actions.find(a => a.type === ActionType.UPLOAD_PHOTO);
    expect(uploadAction).toBeDefined();
    expect(uploadAction.payload.entryId).toBe(123);
  });

  test('buildHairProfileBlock preserves nulls and does not fabricate Type 4 or Normal porosity', () => {
    const emptyProfile = {
      hairType: null,
      porosity: null,
      hairConcerns: []
    };
    const block = service.buildHairProfileBlock(emptyProfile);
    expect(block).toBeDefined();
    expect(block.data.hairType).toBeNull();
    expect(block.data.porosity).toBeNull();
    expect(block.data.regimen).toBeNull();
  });

  test('buildHairProfileBlock returns null when profile is unavailable', () => {
    const unavailableProfile = { available: false, error: 'API offline' };
    const block = service.buildHairProfileBlock(unavailableProfile);
    expect(block).toBeNull();
  });

  test('honest unavailable handling when backend is offline', async () => {
    // Service with offline/unreachable provider
    const offlineProvider = {
      getGoals: jest.fn().mockResolvedValue({ available: false, error: 'offline', goals: [] }),
      getTodayData: jest.fn().mockResolvedValue({ available: false, error: 'offline', checklist: [] }),
      getJournalEntries: jest.fn().mockResolvedValue({ available: false, error: 'offline', items: [] }),
      getProfile: jest.fn().mockResolvedValue({ available: false, error: 'offline' })
    };
    const offlineService = new HairJourneyService({ provider: offlineProvider });

    const goalsRes = await offlineService.getGoalsWithBlocks('user_123');
    expect(goalsRes.result.available).toBe(false);
    expect(goalsRes.blocks).toEqual([]);

    const todayRes = await offlineService.getTodayWithBlocks('user_123');
    expect(todayRes.result.available).toBe(false);
    expect(todayRes.blocks).toEqual([]);

    const profileRes = await offlineService.getProfileWithBlocks('user_123');
    expect(profileRes.result.available).toBe(false);
    expect(profileRes.blocks).toEqual([]);
  });

  test('getGoalsWithBlocks returns goals and blocks when provider has authentic data', async () => {
    const mockProvider = {
      getGoals: jest.fn().mockResolvedValue({
        available: true,
        goals: [
          { id: 'g1', title: 'Retain 4 Inches Length', progressPercent: 68, targetMetric: '14.5 in', targetDate: '2026-12-15' }
        ]
      })
    };
    const activeService = new HairJourneyService({ provider: mockProvider });
    const { result, blocks } = await activeService.getGoalsWithBlocks('test_user');
    expect(result.available).toBe(true);
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe(BlockType.GOAL_CARD);
    expect(blocks[0].data.title).toBe('Retain 4 Inches Length');
    expect(blocks[0].data.progressPercent).toBe(68);
  });

  test('getTodayWithBlocks returns today checklist block when provider has authentic data', async () => {
    const mockProvider = {
      getTodayData: jest.fn().mockResolvedValue({
        available: true,
        streakDays: 9,
        checklist: [{ id: 's1', title: 'Morning Hydration', completed: true }]
      })
    };
    const activeService = new HairJourneyService({ provider: mockProvider });
    const { result, blocks } = await activeService.getTodayWithBlocks('test_user');
    expect(result.available).toBe(true);
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe(BlockType.TODAY_CHECKLIST);
    expect(blocks[0].data.streakDays).toBe(9);
  });

  test('getProfileWithBlocks returns authentic hair profile without fabrication', async () => {
    const mockProvider = {
      getProfile: jest.fn().mockResolvedValue({
        available: true,
        hairType: '4A',
        porosity: 'Medium',
        elasticity: 'Medium',
        strandDiameter: 'Medium',
        hairConcerns: ['Moisture Retention']
      })
    };
    const activeService = new HairJourneyService({ provider: mockProvider });
    const { result, blocks } = await activeService.getProfileWithBlocks('test_user');
    expect(result.available).toBe(true);
    expect(result.hairType).toBe('4A');
    expect(result.porosity).toBe('Medium');
    expect(blocks.length).toBe(1);
    expect(blocks[0].data.hairType).toBe('4A');
    expect(blocks[0].data.porosity).toBe('Medium');
  });
});
