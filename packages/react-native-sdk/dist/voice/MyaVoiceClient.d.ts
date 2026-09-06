/**
 * MyaVoiceClient
 *
 * Mobile voice & audio transcription client for MYAVANA.
 * Connects to the backend /audio/transcribe and /chat/voice endpoints.
 * Compatible with React Native FormData and file URI abstractions (Zero DOM).
 */
export interface VoiceClientOptions {
    apiBase: string;
    authToken?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
}
export interface AudioPayload {
    uri: string;
    type?: string;
    name?: string;
}
export interface TranscriptionResponse {
    text: string;
    confidence?: number;
    durationSeconds?: number;
}
export interface VoiceQueryResponse {
    transcript: string;
    reply?: string;
    audioUrl?: string;
    metadata?: Record<string, any>;
}
export declare class MyaVoiceClient {
    private apiBase;
    private authToken?;
    private customHeaders;
    private timeoutMs;
    constructor(options: VoiceClientOptions);
    /**
     * Transcribe an audio recording from mobile filesystem or memory.
     */
    transcribe(audio: AudioPayload | any, options?: {
        language?: string;
        mimeType?: string;
    }): Promise<TranscriptionResponse>;
    /**
     * Send a voice query directly and receive AI voice/text response.
     */
    sendVoiceQuery(audio: AudioPayload | any, context?: Record<string, any>): Promise<VoiceQueryResponse>;
}
//# sourceMappingURL=MyaVoiceClient.d.ts.map