/**
 * Unit Tests: MyaVoiceClient
 * Mobile audio transcription and voice contracts.
 */

const { MyaVoiceClient } = require('../src/voice');

describe('MyaVoiceClient', () => {
  const originalFetch = global.fetch;
  const originalFormData = global.FormData;

  class MockFormData {
    constructor() {
      this.fields = {};
    }
    append(key, value) {
      this.fields[key] = value;
    }
  }

  beforeEach(() => {
    global.FormData = MockFormData;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.FormData = originalFormData;
  });

  it('throws error if apiBase is missing', () => {
    expect(() => new MyaVoiceClient({})).toThrow('MyaVoiceClient requires apiBase');
  });

  it('transcribes audio file with React Native file URI', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: 'What is the best moisturizer for type 4 hair?',
        confidence: 0.98,
        duration: 3.4
      })
    });

    const client = new MyaVoiceClient({
      apiBase: 'https://api.myavana.com',
      authToken: 'mya-mobile-jwt'
    });

    const result = await client.transcribe(
      {
        uri: 'file:///var/mobile/Containers/Data/Application/voice_record.m4a',
        type: 'audio/m4a',
        name: 'voice_record.m4a'
      },
      { language: 'en' }
    );

    expect(result.text).toBe('What is the best moisturizer for type 4 hair?');
    expect(result.confidence).toBe(0.98);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.myavana.com/audio/transcribe',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mya-mobile-jwt'
        })
      })
    );
  });

  it('sendVoiceQuery returns transcribed query text', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        transcript: 'Tell me about scalp health.'
      })
    });

    const client = new MyaVoiceClient({
      apiBase: 'https://api.myavana.com'
    });

    const res = await client.sendVoiceQuery({
      uri: 'file:///tmp/query.m4a'
    });

    expect(res.transcript).toBe('Tell me about scalp health.');
  });

  it('handles HTTP error responses gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const client = new MyaVoiceClient({
      apiBase: 'https://api.myavana.com'
    });

    await expect(client.transcribe({ uri: 'file:///tmp/err.m4a' })).rejects.toThrow(
      'Voice transcription failed with status: 500 Internal Server Error'
    );
  });
});
