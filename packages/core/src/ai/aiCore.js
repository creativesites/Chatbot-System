// packages/core/src/ai/aiCore.js
// Clean, owned Google Gen AI SDK integration for Mya.
// Replaces Genkit, solves the 'role: function' bug, and eliminates workspace hoisting issues.

const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../myavana/.env') });

const { GoogleGenAI } = require('@google/genai');
const config = require('../config');

function zodToGeminiSchema(schema) {
    if (!schema) return { type: 'OBJECT', properties: {} };
    if (schema.type && (schema.properties || schema.items)) return schema;

    let def = schema._def;
    if (!def) return { type: 'STRING' };

    if (def.typeName === 'ZodOptional' || def.typeName === 'ZodNullable') {
        def = def.innerType._def;
    }

    const description = schema.description || def.description;

    switch (def.typeName) {
        case 'ZodString':
            return { type: 'STRING', description };
        case 'ZodNumber':
            return { type: 'NUMBER', description };
        case 'ZodBoolean':
            return { type: 'BOOLEAN', description };
        case 'ZodEnum':
            return { type: 'STRING', enum: def.values, description };
        case 'ZodArray':
            return { type: 'ARRAY', items: zodToGeminiSchema(def.type), description };
        case 'ZodObject': {
            const properties = {};
            const required = [];
            const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
            if (shape) {
                for (const [key, value] of Object.entries(shape)) {
                    properties[key] = zodToGeminiSchema(value);
                    if (value._def?.typeName !== 'ZodOptional') {
                        required.push(key);
                    }
                }
            }
            return {
                type: 'OBJECT',
                properties,
                required: required.length > 0 ? required : undefined,
                description,
            };
        }
        case 'ZodRecord':
            return { type: 'OBJECT', description };
        default:
            return { type: 'STRING', description };
    }
}

function normalizeModelName(model) {
    if (!model) return 'gemini-3.7-flash';
    if (typeof model === 'string') {
        return model.replace(/^models\//, '');
    }
    if (typeof model === 'object' && model.name) {
        return model.name.replace(/^models\//, '');
    }
    return 'gemini-3.7-flash';
}

class AiCore {
    constructor(opts = {}) {
        this.opts = opts;
        this._client = null;
    }

    get client() {
        if (!this._client) {
            const apiKey = this.opts.apiKey || config.genkitApiKey || process.env.GEMINI_API_KEY || process.env.GENKIT_API_KEY;
            if (!apiKey) {
                console.warn('⚠️ Warning: No Gemini API key provided to AiCore.');
            }
            this._client = new GoogleGenAI({ apiKey });
        }
        return this._client;
    }

    defineTool(toolConfig, fn) {
        return {
            name: toolConfig.name,
            description: toolConfig.description,
            parameters: zodToGeminiSchema(toolConfig.inputSchema),
            execute: fn,
        };
    }

    dynamicTool(toolConfig, fn) {
        return this.defineTool(toolConfig, fn);
    }

    async embed(opts) {
        const text = typeof opts === 'string' ? opts : opts.content || opts.text;
        const model = opts.embedder || 'gemini-embedding-001';
        const outputDimensionality = opts.outputDimensionality || 768;
        const res = await this.client.models.embedContent({
            model: normalizeModelName(model),
            contents: text,
            config: { outputDimensionality },
        });
        const values = res.embeddings?.[0]?.values || res.embedding?.values || [];
        return [{ embedding: values }];
    }

    async generate(opts) {
        const model = normalizeModelName(opts.model || 'gemini-3.7-flash');
        const contents = opts.prompt || opts.contents;
        const temperature = opts.config?.temperature;

        const reqConfig = {};
        if (temperature !== undefined) reqConfig.temperature = temperature;

        if (opts.output?.format === 'json' || opts.output?.schema) {
            reqConfig.responseMimeType = 'application/json';
            if (opts.output.schema) {
                reqConfig.responseSchema = zodToGeminiSchema(opts.output.schema);
            }
        }

        const res = await this.client.models.generateContent({
            model,
            contents,
            config: reqConfig,
        });

        let output = res.text;
        if (opts.output?.format === 'json' || reqConfig.responseMimeType === 'application/json') {
            try {
                output = JSON.parse(res.text);
            } catch {
                // keep as string if parse fails
            }
        }
        return { text: res.text, output };
    }

    /**
     * Transcribes spoken audio into text using gemini-3.5-transcribe with domain biasing
     * and automatic fallback to gemini-2.5-flash.
     *
     * @param {object} opts
     * @param {Buffer|string} opts.audioData - Raw Buffer or base64 encoded audio string
     * @param {string} [opts.mimeType='audio/webm']
     * @param {string[]} [opts.customVocabulary] - Custom domain biasing terms
     * @param {string} [opts.model='gemini-3.5-transcribe']
     * @returns {Promise<{text: string, modelUsed: string}>}
     */
    async transcribeAudio({ audioData, mimeType = 'audio/webm', customVocabulary = [], model = 'gemini-3.5-transcribe' }) {
        const base64Data = Buffer.isBuffer(audioData) ? audioData.toString('base64') : audioData;
        const defaultVocab = [
            'MYAVANA', 'Mya', 'HairID', 'HHCP', 'porosity', 'elasticity', 'density',
            'Type 4A', 'Type 4B', 'Type 4C', 'Type 3A', 'Type 3B', 'Type 3C',
            'coils', 'curls', 'pre-poo', 'clarifying cleanse', 'steam hydration',
            'L.O.C. method', 'knotless', 'boho braids', 'length retention', 'scalp care', 'Candace'
        ];
        const vocabulary = Array.from(new Set([...defaultVocab, ...customVocabulary]));

        const primaryModel = normalizeModelName(model);
        try {
            console.log(`🎙️ Transcribing audio with ${primaryModel}... (${base64Data.length} b64 chars, ${mimeType})`);
            const contents = [
                {
                    inlineData: {
                        mimeType,
                        data: base64Data,
                    },
                },
            ];

            if (vocabulary.length > 0) {
                contents.push({
                    text: `Speech recognition biasing vocabulary: ${vocabulary.join(', ')}. Return only the exact transcription without meta-commentary.`
                });
            }

            const res = await this.client.models.generateContent({
                model: primaryModel,
                contents,
            });

            const text = (res.text || '').trim();
            if (!text) {
                throw new Error(`Empty transcription returned by ${primaryModel}`);
            }
            console.log(`✅ Transcription success (${primaryModel}): "${text}"`);
            return { text, modelUsed: primaryModel };
        } catch (err) {
            console.warn(`⚠️ Primary transcription failed with ${primaryModel}: ${err.message}. Falling back to gemini-2.5-flash...`);
            const fallbackModel = 'gemini-2.5-flash';
            const fallbackRes = await this.client.models.generateContent({
                model: fallbackModel,
                contents: [
                    {
                        inlineData: {
                            mimeType,
                            data: base64Data,
                        },
                    },
                    {
                        text: 'Transcribe this spoken audio accurately. Return only the transcribed text.'
                    }
                ],
            });
            const text = (fallbackRes.text || '').trim();
            console.log(`✅ Fallback transcription success (${fallbackModel}): "${text}"`);
            return { text, modelUsed: fallbackModel };
        }
    }

    /**
     * Connect to Gemini Live API for bidirectional real-time audio/multimodal sessions
     *
     * @param {object} opts
     * @param {string} [opts.model='gemini-3.5-live-translate-preview']
     * @param {object} opts.callbacks - { onopen, onmessage, onerror, onclose }
     * @param {string} [opts.systemInstruction]
     * @param {Array} [opts.tools]
     */
    async createLiveSession(opts = {}) {
        const model = normalizeModelName(opts.model || 'gemini-3.5-live-translate-preview');
        return await this.client.live.connect({
            model,
            callbacks: opts.callbacks,
            config: {
                systemInstruction: opts.systemInstruction,
                generationConfig: {
                    responseModalities: ['AUDIO', 'TEXT'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: opts.voiceName || 'Aoede'
                            }
                        }
                    }
                }
            }
        });
    }

    chat(opts = {}) {
        const model = normalizeModelName(opts.model || 'gemini-3.7-flash');
        const tools = Array.isArray(opts.tools) ? opts.tools : [];
        const temperature = opts.config?.temperature ?? 1.0;

        const toolMap = new Map();
        const functionDeclarations = [];

        for (const t of tools) {
            if (t && t.name && typeof t.execute === 'function') {
                toolMap.set(t.name, t);
                functionDeclarations.push({
                    name: t.name,
                    description: t.description || '',
                    parameters: t.parameters || { type: 'OBJECT', properties: {} },
                });
            }
        }

        const chatConfig = {
            temperature,
        };

        if (opts.cache) {
            chatConfig.cachedContent = opts.cache;
        } else if (opts.system) {
            chatConfig.systemInstruction = opts.system;
        }

        if (functionDeclarations.length > 0) {
            chatConfig.tools = [{ functionDeclarations }];
        }

        const genaiChat = this.client.chats.create({
            model,
            config: chatConfig,
            history: opts.history,
        });

        return {
            genaiChat,
            send: async (message) => {
                let parts = [];
                
                // Real vision pipeline: Download image URL and append as base64 inlineData (TASK_MSDK_011)
                if (opts.image && opts.image.url) {
                    try {
                        console.log(`📸 [MyaOS Vision] Fetching attachment image pixels: ${opts.image.url}`);
                        const imgRes = await fetch(opts.image.url);
                        if (imgRes.ok) {
                            const buffer = await imgRes.arrayBuffer();
                            const b64 = Buffer.from(buffer).toString('base64');
                            const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
                            
                            parts.push({
                                inlineData: {
                                    mimeType: contentType,
                                    data: b64
                                }
                            });
                            console.log('   ✅ Attachment image successfully converted to inlineData.');
                        }
                    } catch (e) {
                        console.warn('   ⚠️ Failed to fetch multimodal image for Gemini:', e.message);
                    }
                }
                
                parts.push({ text: message });
                const messagePayload = parts.length > 1 ? parts : message;

                let res = await genaiChat.sendMessage({ message: messagePayload });
                const toolCalls = [];
                let loopCount = 0;
                const maxLoops = 5;

                while (res.functionCalls && res.functionCalls.length > 0 && loopCount < maxLoops) {
                    loopCount++;
                    const functionResponses = [];

                    for (const call of res.functionCalls) {
                        const tool = toolMap.get(call.name);
                        toolCalls.push({ name: call.name, args: call.args });
                        let toolResult = null;

                        if (tool) {
                            try {
                                toolResult = await tool.execute(call.args);
                            } catch (err) {
                                console.error(`❌ Tool ${call.name} execution error:`, err.message);
                                toolResult = { error: err.message };
                            }
                        } else {
                            console.warn(`⚠️ Tool ${call.name} requested by model but not found.`);
                            toolResult = { error: `Tool ${call.name} not implemented.` };
                        }

                        functionResponses.push({
                            functionResponse: {
                                name: call.name,
                                response: typeof toolResult === 'object' && toolResult !== null ? toolResult : { result: toolResult },
                            },
                        });
                    }

                    res = await genaiChat.sendMessage({ message: functionResponses });
                }

                const text = res.text || '';
                let output = text;

                // Try parsing JSON if output looks like JSON (e.g. Kommunicate payload or JSON blocks)
                const trimmed = text.trim();
                if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                    try {
                        output = JSON.parse(trimmed);
                    } catch {
                        output = text;
                    }
                }

                return { output, text, toolCalls };
            },

            sendStream: (message) => {
                let textAccumulator = '';
                const toolCalls = [];
                const toolBlocks = [];
                let resolveResponse;
                const responsePromise = new Promise((resolve) => {
                    resolveResponse = resolve;
                });

                const streamGenerator = async function* () {
                    try {
                        let parts = [];
                        
                        // Real vision pipeline: Download image URL and append as base64 inlineData (TASK_MSDK_011)
                        if (opts.image && opts.image.url) {
                            try {
                                console.log(`📸 [MyaOS Vision Stream] Fetching attachment image pixels: ${opts.image.url}`);
                                const imgRes = await fetch(opts.image.url);
                                if (imgRes.ok) {
                                    const buffer = await imgRes.arrayBuffer();
                                    const b64 = Buffer.from(buffer).toString('base64');
                                    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
                                    
                                    parts.push({
                                        inlineData: {
                                            mimeType: contentType,
                                            data: b64
                                        }
                                    });
                                    console.log('   ✅ Attachment image successfully converted to inlineData for stream.');
                                }
                            } catch (e) {
                                console.warn('   ⚠️ Failed to fetch streaming image for Gemini:', e.message);
                            }
                        }
                        
                        parts.push({ text: message });
                        let currentMessage = parts.length > 1 ? parts : message;
                        let loopCount = 0;
                        const maxLoops = 5;

                        while (loopCount < maxLoops) {
                            loopCount++;
                            const pendingFunctionCalls = [];
                            const responseStream = await genaiChat.sendMessageStream({ message: currentMessage });

                            for await (const chunk of responseStream) {
                                if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                                    pendingFunctionCalls.push(...chunk.functionCalls);
                                }
                                if (chunk.text) {
                                    textAccumulator += chunk.text;
                                    yield { text: chunk.text };
                                }
                            }

                            if (pendingFunctionCalls.length === 0) {
                                break;
                            }

                            const functionResponses = [];
                            for (const call of pendingFunctionCalls) {
                                const tool = toolMap.get(call.name);
                                toolCalls.push({ name: call.name, args: call.args });
                                let toolResult = null;

                                if (tool) {
                                    try {
                                        toolResult = await tool.execute(call.args);
                                    } catch (err) {
                                        console.error(`❌ Tool ${call.name} execution error:`, err.message);
                                        toolResult = { error: err.message };
                                    }
                                } else {
                                    console.warn(`⚠️ Tool ${call.name} requested by model but not found.`);
                                    toolResult = { error: `Tool ${call.name} not implemented.` };
                                }

                                if (toolResult && toolResult.blocks && Array.isArray(toolResult.blocks)) {
                                    toolBlocks.push(...toolResult.blocks);
                                }

                                functionResponses.push({
                                    functionResponse: {
                                        name: call.name,
                                        response: typeof toolResult === 'object' && toolResult !== null ? toolResult : { result: toolResult },
                                    },
                                });
                            }

                            currentMessage = functionResponses;
                        }
                    } finally {
                        resolveResponse({ text: textAccumulator, output: textAccumulator, toolCalls, toolBlocks });
                    }
                };

                const stream = streamGenerator();

                return {
                    stream,
                    response: responsePromise,
                };
            },
        };
    }

    async loadSession(userId, { store } = {}) {
        let sessionData = null;
        if (store && typeof store.get === 'function') {
            sessionData = await store.get(userId);
        }

        return {
            userId,
            chat: (opts = {}) => {
                return this.chat({
                    ...opts,
                    history: sessionData?.history,
                });
            },
            save: async (data) => {
                if (store && typeof store.save === 'function') {
                    await store.save(userId, data);
                }
            },
        };
    }
}

const aiCore = new AiCore();

module.exports = {
    AiCore,
    aiCore,
    zodToGeminiSchema,
    normalizeModelName,
};
