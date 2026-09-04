/**
 * Verification test for NDJSON streaming transport and ExperienceContext
 */
const { performance } = require('perf_hooks');
const MyavanaChatbotServer = require('../src/index');
const { parseNDJSON, FrameType } = require('../../chat-protocol/src');

console.log('🧪 Testing MyavanaChatbotServer NDJSON streaming & ExperienceContext...');

async function test() {
  const server = new MyavanaChatbotServer();

  // Mock Request & Response for WELCOME event with NDJSON
  let writtenChunks = '';
  let responseEnded = false;
  let setHeaders = {};

  const reqWelcome = {
    headers: {
      'accept': 'application/x-ndjson'
    },
    query: {},
    body: {
      from: 'test-user-candace',
      groupId: 'test-conv-123',
      eventName: 'WELCOME',
      experienceContext: {
        surface: 'myhairjourney.ai',
        page: '/goals',
        entity: { goalId: 'goal_length_1' }
      }
    }
  };

  const resWelcome = {
    setHeader(key, val) {
      setHeaders[key] = val;
    },
    flushHeaders() {},
    write(chunk) {
      writtenChunks += chunk;
    },
    end() {
      responseEnded = true;
    }
  };

  await server.handleStreamChatRequest(reqWelcome, resWelcome);

  console.log('Headers set:', setHeaders);
  console.log('Streamed body:', writtenChunks);

  if (!setHeaders['Content-Type'] || !setHeaders['Content-Type'].includes('application/x-ndjson')) {
    throw new Error('Content-Type is not application/x-ndjson');
  }

  const frames = parseNDJSON(writtenChunks);
  console.log('Parsed frames:', frames);

  if (frames.length !== 2) {
    throw new Error(`Expected 2 frames, got ${frames.length}`);
  }

  if (frames[0].t !== FrameType.DELTA || !frames[0].text.includes('Mya')) {
    throw new Error('First frame was not delta with Mya greeting');
  }

  if (frames[1].t !== FrameType.DONE) {
    throw new Error('Second frame was not done');
  }

  console.log('✅ WELCOME NDJSON streaming test passed!');

  // Now test plain text fallback for legacy clients
  let plainWritten = '';
  let plainHeaders = {};
  const reqPlain = {
    headers: { 'accept': 'text/plain' },
    query: {},
    body: {
      from: 'test-user-candace',
      groupId: 'test-conv-123',
      eventName: 'WELCOME'
    }
  };
  const resPlain = {
    setHeader(k, v) { plainHeaders[k] = v; },
    flushHeaders() {},
    write(chunk) { plainWritten += chunk; },
    end() {}
  };

  await server.handleStreamChatRequest(reqPlain, resPlain);
  console.log('Plain text output:', plainWritten);
  if (!plainHeaders['Content-Type'].includes('text/plain')) {
    throw new Error('Plain text request did not set text/plain Content-Type');
  }
  if (!plainWritten.includes("Hey there! I'm Mya")) {
    throw new Error('Plain text output mismatch');
  }

  console.log('✅ Backwards compatibility plain text test passed!');
  console.log('🎉 All streaming transport tests succeeded!');
  process.exit(0);
}

test().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
