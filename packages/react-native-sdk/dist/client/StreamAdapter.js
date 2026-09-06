/**
 * Mobile Stream Adapter
 *
 * Implements chunked streaming fetch for React Native and Node environments
 * without referencing browser DOM globals (no window, document, or HTML elements).
 *
 * Supports:
 * - ReadableStream (modern fetch / polyfilled mobile fetch)
 * - AsyncIterable stream (Node 18+ undici fetch)
 * - XMLHttpRequest onprogress chunk reading (standard React Native streaming)
 * - Buffered text fallback
 */
import { FrameType } from '../types';
/**
 * Stateful line-buffered parser for NDJSON chunked streams.
 */
export class NDJSONStreamParser {
    constructor(onFrame, onError) {
        this.buffer = '';
        this.onFrame = onFrame;
        this.onError = onError || ((err) => console.warn('[MyaNDJSONParser] Line error:', err.message));
    }
    feed(chunk) {
        if (!chunk)
            return;
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
        }
        catch (err) {
            this.onError(new Error(`Failed to parse NDJSON frame "${line}": ${err.message}`));
        }
    }
}
/**
 * Normalizes incoming protocol frames and calls semantic callbacks.
 */
export function dispatchFrame(frame, callbacks, state) {
    callbacks.onFrame?.(frame);
    const frameType = frame.t || frame.type;
    // Text Delta
    if (frameType === FrameType.DELTA ||
        frameType === FrameType.TEXT_DELTA ||
        (frame.text !== undefined && !frameType)) {
        const delta = frame.text || frame.delta || '';
        state.accumulatedText += delta;
        callbacks.onDelta?.(delta, state.accumulatedText);
    }
    // Component Block
    else if (frameType === FrameType.BLOCK || frame.block) {
        const block = frame.block || frame;
        if (block && block.id) {
            state.blocks.push(block);
            callbacks.onBlock?.(block);
        }
    }
    // Actions (Quick replies, navigation, etc.)
    else if (frameType === FrameType.ACTION || frame.actions) {
        const actionList = Array.isArray(frame.actions)
            ? frame.actions
            : frame.actions
                ? [frame.actions]
                : [];
        for (const act of actionList) {
            state.actions.push(act);
            callbacks.onAction?.(act);
        }
    }
    // Done Frame
    else if (frameType === FrameType.DONE) {
        callbacks.onDone?.(frame.meta || frame.metadata || {});
    }
    // Error Frame
    else if (frameType === FrameType.ERROR) {
        const errMsg = frame.message || frame.error || 'Chat streaming error';
        callbacks.onError?.(new Error(errMsg));
    }
    // Metadata Frame
    else if (frameType === FrameType.METADATA) {
        callbacks.onMetadata?.(frame);
    }
    // Tool Call Frame
    else if (frameType === FrameType.TOOL_CALL) {
        callbacks.onToolCall?.(frame);
    }
}
/**
 * Parses a static NDJSON string into an array of frames.
 */
export function parseNDJSON(text) {
    if (!text || typeof text !== 'string')
        return [];
    const lines = text.split('\n');
    const frames = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        try {
            frames.push(JSON.parse(trimmed));
        }
        catch {
            // ignore malformed lines
        }
    }
    return frames;
}
/**
 * Main streaming fetch executor.
 */
export async function streamFetch(url, options, callbacks) {
    const state = {
        accumulatedText: '',
        blocks: [],
        actions: []
    };
    const parser = new NDJSONStreamParser((frame) => dispatchFrame(frame, callbacks, state), callbacks.onError);
    const fetchImplementation = options.fetchFn || globalThis.fetch;
    if (!fetchImplementation && typeof XMLHttpRequest === 'undefined') {
        throw new Error('No fetch or XMLHttpRequest available in runtime.');
    }
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/x-ndjson, text/plain;q=0.9',
        ...(options.headers || {})
    };
    const bodyString = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    // 1. Try modern fetch with body reader or async iterable
    if (fetchImplementation) {
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
                }
                catch { }
                const error = new Error(`HTTP ${res.status}: ${errText || res.statusText || 'Stream failed'}`);
                callbacks.onError?.(error);
                throw error;
            }
            // Check for ReadableStream reader
            if (res.body && typeof res.body.getReader === 'function') {
                const reader = res.body.getReader();
                const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
                while (true) {
                    if (options.signal?.aborted) {
                        reader.cancel?.();
                        break;
                    }
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    let chunk = '';
                    if (typeof value === 'string') {
                        chunk = value;
                    }
                    else if (decoder && value) {
                        chunk = decoder.decode(value, { stream: true });
                    }
                    else if (value && typeof Buffer !== 'undefined') {
                        chunk = Buffer.from(value).toString('utf-8');
                    }
                    parser.feed(chunk);
                }
                parser.flush();
                return state;
            }
            // Check for Node-style AsyncIterable stream (e.g., undici / node-fetch)
            if (res.body && Symbol.asyncIterator in res.body) {
                for await (const rawChunk of res.body) {
                    if (options.signal?.aborted)
                        break;
                    const chunk = typeof rawChunk === 'string' ? rawChunk : rawChunk.toString('utf-8');
                    parser.feed(chunk);
                }
                parser.flush();
                return state;
            }
            // Fallback: Buffered text from fetch response
            const fullText = await res.text();
            parser.feed(fullText);
            parser.flush();
            return state;
        }
        catch (fetchErr) {
            if (fetchErr.name === 'AbortError' || options.signal?.aborted) {
                return state;
            }
            // If fetch failed due to lack of streaming in native React Native, try XHR
            if (typeof XMLHttpRequest === 'undefined') {
                callbacks.onError?.(fetchErr);
                throw fetchErr;
            }
        }
    }
    // 2. React Native Native Streaming via XMLHttpRequest onprogress
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
                    resolve(state);
                }
                else {
                    const err = new Error(`XHR HTTP ${xhr.status}: ${xhr.statusText || 'Stream failed'}`);
                    callbacks.onError?.(err);
                    reject(err);
                }
            };
            xhr.onerror = () => {
                const err = new Error('Network error during streaming request');
                callbacks.onError?.(err);
                reject(err);
            };
            xhr.send(bodyString);
        }
        catch (err) {
            callbacks.onError?.(err);
            reject(err);
        }
    });
}
//# sourceMappingURL=StreamAdapter.js.map