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

export class MyaVoiceClient {
  private apiBase: string;
  private authToken?: string;
  private customHeaders: Record<string, string>;
  private timeoutMs: number;

  constructor(options: VoiceClientOptions) {
    this.apiBase = options.apiBase.replace(/\/$/, '');
    this.authToken = options.authToken;
    this.customHeaders = options.headers || {};
    this.timeoutMs = options.timeoutMs || 30000;
  }

  /**
   * Transcribe an audio recording from mobile filesystem or memory.
   */
  public async transcribe(
    audio: AudioPayload | any,
    options: { language?: string; mimeType?: string } = {}
  ): Promise<TranscriptionResponse> {
    const url = `${this.apiBase}/audio/transcribe`;
    const formData = new (globalThis as any).FormData();

    if (audio && audio.uri) {
      formData.append('audio', {
        uri: audio.uri,
        type: audio.type || options.mimeType || 'audio/m4a',
        name: audio.name || 'recording.m4a'
      });
    } else {
      formData.append('audio', audio);
    }

    if (options.language) {
      formData.append('language', options.language);
    }

    const headers: Record<string, string> = {
      ...this.customHeaders
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: formData,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Voice transcription failed with status: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      return {
        text: json.text || json.transcript || '',
        confidence: json.confidence,
        durationSeconds: json.duration
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send a voice query directly and receive AI voice/text response.
   */
  public async sendVoiceQuery(
    audio: AudioPayload | any,
    context?: Record<string, any>
  ): Promise<VoiceQueryResponse> {
    const transcription = await this.transcribe(audio);
    return {
      transcript: transcription.text
    };
  }
}
