/**
 * Unit test suite for chat-protocol
 */
const assert = require('assert');
const {
  FrameType,
  BlockType,
  ActionType,
  encodeFrame,
  parseNDJSON,
  NDJSONStreamParser,
  createDeltaFrame,
  createBlockFrame,
  createDoneFrame,
  parseModelOutput
} = require('../src/index');

console.log('🧪 Testing chat-protocol...');

// 1. Test Frame Encoding
const deltaFrame = createDeltaFrame('Hello Mya!');
const encodedDelta = encodeFrame(deltaFrame);
assert.strictEqual(encodedDelta, '{"t":"delta","text":"Hello Mya!"}\n');

// 2. Test Frame Parsing
const sampleNDJSON = [
  encodeFrame(createDeltaFrame('Streaming part 1...')),
  encodeFrame(createDeltaFrame('Streaming part 2...')),
  encodeFrame(createBlockFrame({
    id: 'goal_123',
    type: BlockType.GOAL_CARD,
    data: { title: 'Retain 4 Inches', progressPercent: 65 }
  })),
  encodeFrame(createDoneFrame({ tokenUsage: 250 }))
].join('');

const frames = parseNDJSON(sampleNDJSON);
assert.strictEqual(frames.length, 4);
assert.strictEqual(frames[0].t, FrameType.DELTA);
assert.strictEqual(frames[0].text, 'Streaming part 1...');
assert.strictEqual(frames[2].t, FrameType.BLOCK);
assert.strictEqual(frames[2].block.type, BlockType.GOAL_CARD);
assert.strictEqual(frames[3].t, FrameType.DONE);

// 3. Test Stream Line-Buffering
const receivedFrames = [];
const streamParser = new NDJSONStreamParser((frame) => {
  receivedFrames.push(frame);
});

// Feed chunks split across line boundaries
streamParser.feed('{"t":"delta","text":"Chunk ');
streamParser.feed('A"}\n{"t":"delta","text":"Chunk B"}\n{"t":"done"');
streamParser.feed(',"meta":{"ok":true}}\n');
assert.strictEqual(receivedFrames.length, 3);
assert.strictEqual(receivedFrames[0].text, 'Chunk A');
assert.strictEqual(receivedFrames[1].text, 'Chunk B');
assert.strictEqual(receivedFrames[2].t, FrameType.DONE);

// 4. Test Model Output Parsing (JSON blocks)
const mockModelOutput = `
Here is your current status:
\`\`\`json
{
  "blocks": [
    {
      "type": "text",
      "content": "You are making incredible progress on your length retention goal!"
    },
    {
      "type": "component",
      "component": {
        "type": "goal_card",
        "data": {
          "title": "Retain 4 Inches Length",
          "category": "Length & Retention",
          "progressPercent": 42,
          "targetMetric": "4 Inches",
          "targetDate": "December 2026"
        }
      }
    },
    {
      "type": "component",
      "component": {
        "type": "today_checklist",
        "data": {
          "title": "Today's Hair Care Steps",
          "steps": [
            { "title": "Hydration mist", "completed": true },
            { "title": "Deep condition with heat", "completed": false }
          ]
        }
      }
    }
  ],
  "quickReplies": [
    "Update target date",
    "Mark deep condition done",
    "Ask another question"
  ]
}
\`\`\`
`;

const parsed = parseModelOutput(mockModelOutput);
assert.strictEqual(parsed.blocks.length, 4); // text, goal_card, today_checklist, quick_replies
assert.strictEqual(parsed.blocks[0].type, BlockType.TEXT);
assert.strictEqual(parsed.blocks[1].type, BlockType.GOAL_CARD);
assert.strictEqual(parsed.blocks[1].data.progressPercent, 42);
assert.strictEqual(parsed.blocks[2].type, BlockType.TODAY_CHECKLIST);
assert.strictEqual(parsed.blocks[2].data.steps.length, 2);
assert.strictEqual(parsed.blocks[3].type, BlockType.QUICK_REPLIES);
assert.strictEqual(parsed.blocks[3].data.replies.length, 3);

// 5. Test Plain Text Fallback
const plainText = "Hello! I am Mya, how can I assist your hair journey today?";
const parsedPlain = parseModelOutput(plainText);
assert.strictEqual(parsedPlain.blocks.length, 1);
assert.strictEqual(parsedPlain.blocks[0].type, BlockType.TEXT);
assert.strictEqual(parsedPlain.blocks[0].data.text, plainText);

console.log('✅ All chat-protocol tests passed with 100% success!');
