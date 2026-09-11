/**
 * Master Verification Suite: Phases 0, 1, 2, and 3
 */
const assert = require('assert');
const {
  FrameType,
  BlockType,
  ActionType,
  encodeFrame,
  parseNDJSON,
  parseModelOutput
} = require('../src/chatProtocol');
const { ExperienceContextService } = require('../../core/src/experience/experienceContextService');
const { HairJourneyService } = require('../../core/src/hairJourney/hairJourneyService');
const { WordPressHairJourneyProvider } = require('../../core/src/hairJourney/wordPressHairJourneyProvider');

console.log('🚀 Running Master Verification Suite...');

async function main() {
  // 1. Verify Wire Protocol
  console.log('1️⃣ Verifying Chat Protocol encoding & decoding...');
  const testFrame = { t: FrameType.DELTA, text: 'Hello Candace' };
  const encoded = encodeFrame(testFrame);
  assert.strictEqual(encoded, '{"t":"delta","text":"Hello Candace"}\n');
  const parsed = parseNDJSON(encoded);
  assert.strictEqual(parsed[0].t, FrameType.DELTA);
  assert.strictEqual(parsed[0].text, 'Hello Candace');
  console.log('   ✅ Protocol frames validated.');

  // 2. Verify Semantic Parser with Simulated Gemini Output
  console.log('2️⃣ Verifying Model Output Parser (GuideLens-style blocks)...');
  const simulatedAiOutput = `
Here is your hair journey summary:
\`\`\`json
{
  "blocks": [
    {
      "type": "text",
      "content": "You are on track to achieve your length retention goal!"
    },
    {
      "type": "goal_card",
      "data": {
        "title": "Retain 4 Inches Length by Dec 2026",
        "category": "Length & Retention",
        "progressPercent": 42,
        "targetMetric": "4 Inches",
        "targetDate": "December 2026"
      }
    },
    {
      "type": "today_checklist",
      "data": {
        "title": "Today's Hair Care Steps",
        "steps": [
          { "title": "Morning hydration mist", "completed": true },
          { "title": "Deep condition with heat (20 min)", "completed": false }
        ]
      }
    }
  ],
  "quickReplies": [
    "Mark deep condition done",
    "Update target date",
    "Ask another question"
  ]
}
\`\`\`
`;
  const result = parseModelOutput(simulatedAiOutput);
  assert.strictEqual(result.blocks.length, 4);
  assert.strictEqual(result.blocks[1].type, BlockType.GOAL_CARD);
  assert.strictEqual(result.blocks[2].type, BlockType.TODAY_CHECKLIST);
  assert.strictEqual(result.blocks[3].type, BlockType.QUICK_REPLIES);
  assert.strictEqual(result.quickReplies.length, 3);
  console.log('   ✅ Model output parser extracted all 4 canonical blocks cleanly.');

  // 3. Verify Experience Context Service
  console.log('3️⃣ Verifying Experience Context Engine...');
  const expContext = {
    surface: 'myhairjourney.ai',
    page: '/goals',
    entity: { goalId: 'goal_123' },
    recentActions: ['viewed_goals', 'toggled_step']
  };
  const expSnippet = ExperienceContextService.buildPromptSnippet(expContext);
  assert(expSnippet.includes('Surface: myhairjourney.ai'));
  assert(expSnippet.includes('Page: /goals'));
  assert(expSnippet.includes('Active Entity: {"goalId":"goal_123"}'));
  assert(expSnippet.includes('The user is actively viewing their Hair Goals'));
  console.log('   ✅ Experience Context prompt snippet generated successfully.');

  // 4. Verify Hair Journey Service
  console.log('4️⃣ Verifying Hair Journey Service with Provider...');
  const mockProvider = {
    getGoals: async () => ({
      available: true,
      goals: [{ id: 'goal_123', title: 'Retain Length', category: 'Growth', progressPercent: 68 }]
    }),
    getTodayData: async () => ({
      available: true,
      date: '2026-09-04',
      streakDays: 7,
      checklist: [{ id: 's1', title: 'Mist hair', completed: false }]
    }),
    getProfile: async () => ({
      available: true,
      hairType: '4A',
      porosity: 'Medium',
      density: 'Medium',
      hairConcerns: ['Dryness']
    }),
    getJournalEntries: async () => ({
      available: true,
      items: [{ id: 'j_1', date: '2026-09-04', notes: 'Wash day', photos: [] }]
    })
  };
  const service = new HairJourneyService({ provider: mockProvider });
  const goalsData = await service.getGoalsWithBlocks('test-user-candace');
  assert(goalsData.blocks.length > 0);
  assert.strictEqual(goalsData.blocks[0].type, BlockType.GOAL_CARD);
  console.log(`   ✅ Hair Journey Service generated ${goalsData.blocks.length} goal blocks.`);

  const todayData = await service.getTodayWithBlocks('test-user-candace');
  assert(todayData.blocks.length > 0);
  assert.strictEqual(todayData.blocks[0].type, BlockType.TODAY_CHECKLIST);
  console.log(`   ✅ Today Hub Service generated checklist block with ${todayData.blocks[0].data.steps.length} steps.`);

  const profileData = await service.getProfileWithBlocks('test-user-candace');
  assert.strictEqual(profileData.blocks[0].type, BlockType.HAIR_PROFILE_SUMMARY);
  console.log('   ✅ Hair Profile Summary block generated.');

  // 5. Verify Hair Journey Journal & Photo Upload Action
  console.log('5️⃣ Verifying Hair Journey Journal & Photo Upload Blocks...');
  const journalData = await service.getJournalEntriesWithBlocks('test-user-candace');
  assert(journalData.blocks.length > 0);
  assert.strictEqual(journalData.blocks[0].type, BlockType.JOURNAL_ENTRY);
  const photoAction = journalData.blocks[0].actions.find(a => a.type === ActionType.UPLOAD_PHOTO);
  assert(photoAction, 'UPLOAD_PHOTO action must be present on journal entry block');
  console.log('   ✅ Journal Entry block with in-chat camera/photo upload action validated.');

  console.log('\n🎉 ALL MASTER VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
