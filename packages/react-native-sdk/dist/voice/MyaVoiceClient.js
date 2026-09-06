/**
 * MyaVoiceClient
 *
 * Mobile voice & audio transcription client for MYAVANA.
 * Connects to the backend /audio/transcribe and /chat/voice endpoints.
 * Compatible with React Native FormData and file URI abstractions (Zero DOM).
 */
export class MyaVoiceClient {
    constructor(options) {
        this.apiBase = options.apiBase.replace(/\/$/, '');
        this.authToken = options.authToken;
        this.customHeaders = options.headers || {};
        this.timeoutMs = options.timeoutMs || 30000;
    }
    /**
     * Transcribe an audio recording from mobile filesystem or memory.
     */
    async transcribe(audio, options = {}) {
        const url = `${this.apiBase}/audio/transcribe`;
        const formData = new globalThis.FormData();
        if (audio && audio.uri) {
            formData.append('audio', {
                uri: audio.uri,
                type: audio.type || options.mimeType || 'audio/m4a',
                name: audio.name || 'recording.m4a'
            });
        }
        else {
            formData.append('audio', audio);
        }
        if (options.language) {
            formData.append('language', options.language);
        }
        const headers = {
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
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * Send a voice query directly and receive AI voice/text response.
     */
    async sendVoiceQuery(audio, context) {
        const transcription = await this.transcribe(audio);
        return {
            transcript: transcription.text
        };
    }
}
//# sourceMappingURL=MyaVoiceClient.js.map