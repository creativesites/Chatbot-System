/**
 * Mobile Stream Adapter (JavaScript implementation)
 */

const { FrameType } = require('../types');

class NDJSONStreamParser {
  constructor(onFrame, onError) {
    this.buffer = '';
    this.onFrame = onFrame;
    this.onError = onError || ((err) => console.warn('[MyaNDJSONParser] Line error:', err.message));
  }

  feed(chunk) {
    if (!chunk) return;
    this.buffer += chunk;
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line) {
        this.parseLine(line);
      }
    }
  }

  flush() {
    const remaining = this.buffer.trim();
    this.buffer = '';
    if (remaining) {
      this.parseLine(remaining);
    }
  }

  parseLine(line) {
    try {
      const parsed = JSON.parse(line);
      this.onFrame(parsed);
    } catch (err) {
      this.onError(new Error(`Failed to parse NDJSON frame "${line}": ${err.message}`), line);
    }
  }
}

function dispatchFrame(frame, callbacks, state) {
  callbacks.onFrame && callbacks.onFrame(frame);

  const frameType = frame.t || frame.type;

  if (
    frameType === FrameType.DELTA ||
    frameType === FrameType.TEXT_DELTA ||
    (frame.text !== undefined && !frameType)
  ) {
    const delta = frame.text || frame.delta || '';
    state.accumulatedText += delta;
    callbacks.onDelta && callbacks.onDelta(delta, state.accumulatedText);
  } else if (frameType === FrameType.BLOCK || frame.block) {
    const block = frame.block || frame;
    if (block) {
      const isDup = state.blocks.some((b) => {
        if (b.id && block.id && b.id === block.id) return true;
        if (b.type && block.type && b.type === block.type) {
          const bData = b.data || {};
          const curData = block.data || {};
          if (bData.id !== undefined && curData.id !== undefined && bData.id === curData.id) return true;
          const bTitle = String(bData.title || bData.heading || bData.name || '').trim().toLowerCase();
          const curTitle = String(curData.title || curData.heading || curData.name || '').trim().toLowerCase();
          if (bTitle && curTitle && bTitle === curTitle) return true;
          const bNotes = String(bData.notes || bData.summary || '').trim().toLowerCase().slice(0, 60);
          const curNotes = String(curData.notes || curData.summary || '').trim().toLowerCase().slice(0, 60);
          if (bNotes && curNotes && bNotes === curNotes) return true;
        }
        return false;
      });
      if (!isDup) {
        state.blocks.push(block);
        callbacks.onBlock && callbacks.onBlock(block);
      }
    }
  } else if (frameType === FrameType.ACTION || frame.actions) {
    const actionList = Array.isArray(frame.actions)
      ? frame.actions
      : frame.actions
      ? [frame.actions]
      : [];
    for (const act of actionList) {
      state.actions.push(act);
      callbacks.onAction && callbacks.onAction(act);
    }
  } else if (frameType === FrameType.DONE) {
    state.doneDispatched = true;
    callbacks.onDone && callbacks.onDone(frame.meta || frame.metadata || {});
  } else if (frameType === FrameType.ERROR) {
    const errMsg = frame.message || frame.error || 'Chat streaming error';
    callbacks.onError && callbacks.onError(new Error(errMsg));
  } else if (frameType === FrameType.METADATA) {
    callbacks.onMetadata && callbacks.onMetadata(frame);
  } else if (frameType === FrameType.TOOL_CALL) {
    callbacks.onToolCall && callbacks.onToolCall(frame);
  }
}

function parseNDJSON(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  const frames = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      frames.push(JSON.parse(trimmed));
    } catch {
      // skip
    }
  }
  return frames;
}

async function streamFetch(url, options = {}, callbacks = {}) {
  const state = {
    accumulatedText: '',
    blocks: [],
    actions: [],
    doneDispatched: false
  };

  const parser = new NDJSONStreamParser(
    (frame) => dispatchFrame(frame, callbacks, state),
    (err, rawLine) => {
      // If a line is raw text rather than NDJSON, treat as streaming delta text
      // instead of killing the entire stream with an unhandled onError.
      if (rawLine && typeof rawLine === 'string' && rawLine.trim()) {
        dispatchFrame({ t: FrameType.DELTA, text: rawLine + '\n' }, callbacks, state);
      } else {
        callbacks.onError && callbacks.onError(err);
      }
    }
  );

  const fetchImplementation = options.fetchFn || globalThis.fetch;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/x-ndjson, text/plain;q=0.9',
    ...(options.headers || {})
  };

  const bodyString = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);

  const isReactNative =
    (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') ||
    (typeof globalThis !== 'undefined' && Boolean(globalThis.__fbBatchedBridge || globalThis.nativeCallSyncHook));

  // In React Native, fetch polyfill does not support streaming ReadableStream bodies.
  // When options.fetchFn is not explicitly provided, use XMLHttpRequest directly for on-device streaming
  // to avoid sending a duplicate HTTP request.
  const preferXHR = !options.fetchFn && typeof XMLHttpRequest !== 'undefined' && isReactNative;

  if (!preferXHR && fetchImplementation) {
    try {
      const res = await fetchImplementation(url, {
        method: options.method || 'POST',
        headers,
        body: bodyString,
        signal: options.signal
      });

      if (!res.ok) {
        let errText = '';
        try {
          errText = await res.text();
        } catch {}
        const error = new Error(`HTTP ${res.status}: ${errText || res.statusText || 'Stream failed'}`);
        callbacks.onError && callbacks.onError(error);
        throw error;
      }

      if (res.body && typeof res.body.getReader === 'function') {
        const reader = res.body.getReader();
        const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

        while (true) {
          if (options.signal && options.signal.aborted) {
            reader.cancel && reader.cancel();
            break;
          }
          const { done, value } = await reader.read();
          if (done) break;

          let chunk = '';
          if (typeof value === 'string') {
            chunk = value;
          } else if (decoder && value) {
            chunk = decoder.decode(value, { stream: true });
          } else if (value && typeof Buffer !== 'undefined') {
            chunk = Buffer.from(value).toString('utf-8');
          }
          parser.feed(chunk);
        }
        parser.flush();
        return state;
      }

      if (res.body && Symbol.asyncIterator in res.body) {
        for await (const rawChunk of res.body) {
          if (options.signal && options.signal.aborted) break;
          const chunk = typeof rawChunk === 'string' ? rawChunk : rawChunk.toString('utf-8');
          parser.feed(chunk);
        }
        parser.flush();
        return state;
      }

      // If res.body lacks a stream reader, consume the buffered response.
      // Do NOT fall through to XMLHttpRequest here — the request has already been sent.
      const fullText = await res.text();
      parser.feed(fullText);
      parser.flush();
      return state;
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError' || (options.signal && options.signal.aborted)) {
        return state;
      }
      callbacks.onError && callbacks.onError(fetchErr);
      throw fetchErr;
    }
  }

  // React Native XMLHttpRequest chunk streaming
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      let processedIndex = 0;

      xhr.open(options.method || 'POST', url, true);
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          xhr.abort();
          resolve(state);
        });
      }

      xhr.onprogress = () => {
        const text = xhr.responseText || '';
        if (text.length > processedIndex) {
          const chunk = text.substring(processedIndex);
          processedIndex = text.length;
          parser.feed(chunk);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const text = xhr.responseText || '';
          if (text.length > processedIndex) {
            parser.feed(text.substring(processedIndex));
          }
          parser.flush();
          if (!state.doneDispatched) {
            state.doneDispatched = true;
            callbacks.onDone && callbacks.onDone({ finished: true, text: state.accumulatedText });
          }
          resolve(state);
        } else {
          const err = new Error(`XHR HTTP ${xhr.status}: ${xhr.statusText || 'Stream failed'}`);
          callbacks.onError && callbacks.onError(err);
          reject(err);
        }
      };

      xhr.onerror = () => {
        const err = new Error('Network error during streaming request');
        callbacks.onError && callbacks.onError(err);
        reject(err);
      };

      xhr.send(bodyString);
    } catch (err) {
      callbacks.onError && callbacks.onError(err);
      reject(err);
    }
  });
}

module.exports = {
  NDJSONStreamParser,
  dispatchFrame,
  parseNDJSON,
  streamFetch
};
