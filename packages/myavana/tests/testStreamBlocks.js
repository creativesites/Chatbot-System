/**
 * Verification test for streaming with mya-blocks code blocks
 */
const { parseNDJSON, FrameType } = require('../src/chatProtocol');
const { parseModelOutput } = require('../../chat-protocol/src/responseParser');

console.log('🧪 Testing streaming with mya-blocks buffering & block extraction...');

// Test 1: Verify parseModelOutput extracts prose preamble, block, and quick replies
const sampleOutput = `Here is your wash day routine for low porosity 4C curls! Keep your strands nourished with warm water and steam.

\`\`\`mya-blocks
{
  "blocks": [
    {
      "id": "checklist_1",
      "type": "today_checklist",
      "data": {
        "title": "Low Porosity Wash Day",
        "steps": [
          "Pre-poo with warm jojoba oil (15 mins)",
          "Cleanse with clarifying shampoo",
          "Steam deep condition with moisture mask"
        ]
      }
    }
  ],
  "quickReplies": [
    { "label": "Product tips", "payload": { "text": "What products should I use?" } },
    { "label": "Log in diary", "payload": { "text": "Log this wash day in my hair diary" } }
  ]
}
\`\`\`
`;

const parsed = parseModelOutput(sampleOutput);
console.log('Parsed text:', parsed.text);
console.log('Blocks count:', parsed.blocks.length);
console.log('Quick replies count:', parsed.quickReplies.length);

if (!parsed.text.includes('Here is your wash day routine')) {
  throw new Error('Prose text was not preserved');
}

const checklistBlock = parsed.blocks.find(b => b.type === 'today_checklist');
if (!checklistBlock) {
  throw new Error('today_checklist block was not found');
}
if (checklistBlock.data.steps.length !== 3) {
  throw new Error(`Expected 3 steps, got ${checklistBlock.data.steps.length}`);
}

if (parsed.quickReplies.length !== 2) {
  throw new Error(`Expected 2 quick replies, got ${parsed.quickReplies.length}`);
}

console.log('✅ parseModelOutput with mya-blocks passed!');

// Test 2: Simulate streaming buffer logic
const chunks = [
  'Here is your ',
  'wash day routine for low ',
  'porosity 4C curls! ',
  'Keep your strands nourished.\n\n',
  '```mya-blocks\n',
  '{\n  "blocks": [',
  '    {\n      "id": "checklist_1",\n',
  '      "type": "today_checklist",\n',
  '      "data": { "title": "Wash Day", "steps": ["Step 1", "Step 2"] }\n',
  '    }\n  ],\n',
  '  "quickReplies": [{ "label": "Tips", "payload": { "text": "Tips" } }]\n',
  '}\n```'
];

let streamedText = '';
let inCodeBlock = false;
let pendingProse = '';
const emittedDeltas = [];

for (const chunk of chunks) {
  streamedText += chunk;

  if (!inCodeBlock) {
    const fenceIndex = streamedText.indexOf('```');
    if (fenceIndex !== -1) {
      inCodeBlock = true;
      const proseBeforeFence = streamedText.slice(0, fenceIndex);
      const newProseChunk = proseBeforeFence.slice(pendingProse.length);
      if (newProseChunk) {
        emittedDeltas.push(newProseChunk);
        pendingProse = proseBeforeFence;
      }
    } else {
      const safeLength = streamedText.endsWith('``')
        ? streamedText.length - 2
        : (streamedText.endsWith('`') ? streamedText.length - 1 : streamedText.length);

      const safeProse = streamedText.slice(0, safeLength);
      const newProseChunk = safeProse.slice(pendingProse.length);
      if (newProseChunk) {
        emittedDeltas.push(newProseChunk);
        pendingProse = safeProse;
      }
    }
  }
}

const totalEmittedProse = emittedDeltas.join('');
console.log('Total emitted prose during streaming:', JSON.stringify(totalEmittedProse));

if (totalEmittedProse.includes('```') || totalEmittedProse.includes('checklist_1')) {
  throw new Error('Streaming emitted raw code block or JSON into delta frames!');
}
if (!totalEmittedProse.includes('Here is your wash day routine')) {
  throw new Error('Streaming did not emit the conversational prose!');
}

console.log('✅ Streaming code block isolation passed!');
console.log('🎉 All rich response tests succeeded!');
