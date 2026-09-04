const { HairJourneyService } = require('../hairJourney/hairJourneyService');
const { BlockType, ActionType } = require('../../../chat-protocol/src');

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

  test('getGoalsWithBlocks returns goals and blocks via fallback provider', async () => {
    const { result, blocks } = await service.getGoalsWithBlocks('test_user');
    expect(result.goals).toBeDefined();
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].type).toBe(BlockType.GOAL_CARD);
  });

  test('getTodayWithBlocks returns today checklist block via fallback provider', async () => {
    const { result, blocks } = await service.getTodayWithBlocks('test_user');
    expect(result.checklist).toBeDefined();
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe(BlockType.TODAY_CHECKLIST);
  });

  test('getJournalEntriesWithBlocks returns journal blocks via fallback provider', async () => {
    const { result, blocks } = await service.getJournalEntriesWithBlocks('test_user');
    expect(result.items).toBeDefined();
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].type).toBe(BlockType.JOURNAL_ENTRY);
  });

  test('createJournalEntryWithBlock creates an entry and returns block', async () => {
    const { result, blocks } = await service.createJournalEntryWithBlock('test_user', {
      title: 'New Growth Milestone',
      notes: 'Noticed half an inch of growth!',
      moistureLevel: 4
    });
    expect(result.saved).toBe(true);
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe(BlockType.JOURNAL_ENTRY);
    expect(blocks[0].data.title).toBe('New Growth Milestone');
  });
});
