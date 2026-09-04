/**
 * NDJSON Wire Protocol Utilities
 *
 * Provides serialization, framing, and line-buffered chunk parsing
 * for the streaming chat protocol.
 */

const { FrameType } = require('./types');

/**
 * Encodes a single chat frame into an NDJSON string line.
 * @param {object} frame
 * @returns {string}
 */
function encodeFrame(frame) {
  if (!frame || typeof frame !== 'object') {
    throw new Error('Frame must be an object');
  }
  if (!frame.t) {
    throw new Error('Frame must include type property "t"');
  }
  return JSON.stringify(frame) + '\n';
}

/**
 * Convenience frame builders
 */
function createDeltaFrame(text) {
  return { t: FrameType.DELTA, text: String(text || '') };
}

function createBlockFrame(block) {
  return { t: FrameType.BLOCK, block };
}

function createActionFrame(actions) {
  return {
    t: FrameType.ACTION,
    actions: Array.isArray(actions) ? actions : [actions]
  };
}

function createDoneFrame(meta = {}) {
  return {
    t: FrameType.DONE,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

function createErrorFrame(code, message) {
  return {
    t: FrameType.ERROR,
    code: String(code || 'INTERNAL_ERROR'),
    message: String(message || 'An unexpected error occurred')
  };
}

/**
 * Parses a static NDJSON string or buffer into an array of frames.
 * @param {string} text
 * @returns {Array<object>}
 */
function parseNDJSON(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  const frames = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      frames.push(JSON.parse(trimmed));
    } catch (err) {
      console.warn('Malformed NDJSON line skipped:', trimmed, err.message);
    }
  }
  return frames;
}

/**
 * Stateful line-buffer parser for streaming responses (Node or Browser).
 */
class NDJSONStreamParser {
  /**
   * @param {function(object): void} onFrame
   * @param {function(Error): void} [onError]
   */
  constructor(onFrame, onError) {
    this.buffer = '';
    this.onFrame = onFrame;
    this.onError = onError || ((err) => console.error('NDJSON parser error:', err));
  }

  /**
   * Feed an incoming raw string chunk from the stream.
   * @param {string} chunk
   */
  feed(chunk) {
    if (!chunk) return;
    this.buffer += chunk;
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line) {
        try {
          const parsed = JSON.parse(line);
          this.onFrame(parsed);
        } catch (err) {
          this.onError(new Error(`Failed to parse line "${line}": ${err.message}`));
        }
      }
    }
  }

  /**
   * Flush any remaining data in the buffer on stream end.
   */
  flush() {
    const remaining = this.buffer.trim();
    this.buffer = '';
    if (remaining) {
      try {
        const parsed = JSON.parse(remaining);
        this.onFrame(parsed);
      } catch (err) {
        this.onError(new Error(`Failed to parse trailing buffer "${remaining}": ${err.message}`));
      }
    }
  }
}

module.exports = {
  encodeFrame,
  parseNDJSON,
  NDJSONStreamParser,
  createDeltaFrame,
  createBlockFrame,
  createActionFrame,
  createDoneFrame,
  createErrorFrame
};
