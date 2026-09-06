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
import { ChatBlock, ChatAction, ChatFrame } from '../types';
export interface StreamCallbacks {
    onFrame?: (frame: ChatFrame) => void;
    onDelta?: (delta: string, accumulated: string) => void;
    onBlock?: (block: ChatBlock) => void;
    onAction?: (action: ChatAction) => void;
    onDone?: (meta: Record<string, any>) => void;
    onError?: (error: Error) => void;
}
export interface StreamFetchOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    signal?: AbortSignal;
    timeoutMs?: number;
    fetchFn?: typeof fetch;
}
/**
 * Stateful line-buffered parser for NDJSON chunked streams.
 */
export declare class NDJSONStreamParser {
    private buffer;
    private onFrame;
    private onError;
    constructor(onFrame: (frame: ChatFrame) => void, onError?: (error: Error) => void);
    feed(chunk: string): void;
    flush(): void;
    private parseLine;
}
/**
 * Normalizes incoming protocol frames and calls semantic callbacks.
 */
export declare function dispatchFrame(frame: ChatFrame, callbacks: StreamCallbacks, state: {
    accumulatedText: string;
    blocks: ChatBlock[];
    actions: ChatAction[];
}): void;
/**
 * Parses a static NDJSON string into an array of frames.
 */
export declare function parseNDJSON(text: string): ChatFrame[];
/**
 * Main streaming fetch executor.
 */
export declare function streamFetch(url: string, options: StreamFetchOptions, callbacks: StreamCallbacks): Promise<{
    accumulatedText: string;
    blocks: ChatBlock[];
    actions: ChatAction[];
}>;
//# sourceMappingURL=StreamAdapter.d.ts.map