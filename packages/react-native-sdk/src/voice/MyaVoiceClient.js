/**
 * MyaVoiceClient (CommonJS)
 */

class MyaVoiceClient {
  constructor(options = {}) {
    if (!options.apiBase) {
      throw new Error('MyaVoiceClient requires apiBase');
    }
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
    const FormDataCtor = globalThis.FormData;
    if (!FormDataCtor) {
      throw new Error('FormData is not supported in this runtime environment');
    }
    const formData = new FormDataCtor();

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

    const headers = Object.assign({}, this.customHeaders);
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: formData,
        signal: controller ? controller.signal : undefined
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
      if (timeoutId) clearTimeout(timeoutId);
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

module.exports = {
  MyaVoiceClient
};
