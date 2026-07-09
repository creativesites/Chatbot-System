// unifiedChatHandler.js - Fixed version with proper model prioritization
const { genkit, z } = require('genkit');
const { googleAI } = require('@genkit-ai/google-genai');

class UnifiedChatHandler {
    constructor(config) {
        this.packageName = config.packageName;
        this.logger = config.logger;
        this.validator = config.validator;
        this.analytics = config.analytics;
        this.smartPromptManager = config.smartPromptManager;
        this.responseCache = config.responseCache;
        this.errorRecovery = config.errorRecovery;
        this.personalization = config.personalization;
        this.ai = config.ai;
        this.xaiApiKey = config.xaiApiKey;
        
        // Initialize model priority list - GEMINI FIRST!
        this.modelPriority = [
            { name: 'gemini20FlashExp', model: googleAI.model('gemini-3-flash-preview'), type: 'primary' },
            { name: 'gemini15Flash', model: googleAI.model('gemini-2.5-flash'), type: 'primary' },
            { name: 'gemini15Pro', model: googleAI.model('gemini-3-pro-preview'), type: 'backup' }
        ];

        // Only initialize xAI as last resort if API key exists
        if (this.xaiApiKey) {
            console.log('✅ xAI initialized as emergency fallback only');
            this.initializeXAIFallback();
        }

        this.initializeFlows();
    }

    async initializeXAIFallback() {
        try {
            const xai = genkit({
                plugins: [
                    {
                        name: 'xai',
                        async init() {
                            return {
                                models: {
                                    'xai-grok-3-mini-fast': async (request) => {
                                        // xAI implementation
                                        return {
                                            text: () => request.prompt,
                                            candidates: [{ text: request.prompt }]
                                        };
                                    }
                                }
                            };
                        }
                    }
                ]
            });
            
            // Add xAI as LAST RESORT only
            this.modelPriority.push({
                name: 'xai-grok-3-mini-fast',
                model: 'xai-grok-3-mini-fast',
                type: 'emergency',
                isXAI: true
            });
        } catch (error) {
            console.error('Failed to initialize xAI fallback:', error);
        }
    }

    initializeFlows() {
        // Define the main chat flow
        this.chatFlow = this.ai.defineFlow(
            {
                name: `${this.packageName}ChatFlow`,
                inputSchema: z.object({
                    userId: z.string(),
                    query: z.string(),
                    chatHistory: z.array(z.object({
                        role: z.string(),
                        content: z.string()
                    })).optional(),
                    userInfo: z.any().optional(),
                    allchatsSummary: z.string().optional()
                }),
                outputSchema: z.object({
                    response: z.any(),
                    model: z.string(),
                    cached: z.boolean(),
                    processingTime: z.number()
                })
            },
            async (input) => {
                const startTime = Date.now();
                
                try {
                    // Check cache first
                    if (this.responseCache) {
                        const cachedResponse = await this.responseCache.getCachedResponse(
                            input.userId,
                            input.query
                        );
                        
                        if (cachedResponse) {
                            return {
                                response: cachedResponse,
                                model: 'cache',
                                cached: true,
                                processingTime: Date.now() - startTime
                            };
                        }
                    }

                    // Build smart prompt
                    const prompt = await this.buildPrompt(input);
                    
                    // Try models in priority order - GEMINI FIRST!
                    let lastError = null;
                    let attemptsLog = [];
                    
                    for (const modelConfig of this.modelPriority) {
                        // Skip emergency models unless all primary models failed
                        if (modelConfig.type === 'emergency' && attemptsLog.length < 3) {
                            continue;
                        }
                        
                        try {
                            this.logger.info(`Attempting with ${modelConfig.name} (${modelConfig.type})`);
                            
                            const response = await this.callModel(modelConfig, prompt, input);
                            
                            // Validate and clean response
                            const cleanedResponse = this.validateAndCleanResponse(response, modelConfig);
                            
                            // Cache successful response
                            if (this.responseCache && !modelConfig.isXAI) {
                                await this.responseCache.cacheResponse(
                                    input.userId,
                                    input.query,
                                    cleanedResponse
                                );
                            }
                            
                            // Log success
                            attemptsLog.push({
                                model: modelConfig.name,
                                success: true,
                                type: modelConfig.type
                            });
                            
                            this.logger.info(`✅ Success with ${modelConfig.name} after ${attemptsLog.length} attempts`);
                            
                            return {
                                response: cleanedResponse,
                                model: modelConfig.name,
                                cached: false,
                                processingTime: Date.now() - startTime
                            };
                            
                        } catch (error) {
                            lastError = error;
                            attemptsLog.push({
                                model: modelConfig.name,
                                success: false,
                                error: error.message
                            });
                            
                            this.logger.warn(`Failed with ${modelConfig.name}: ${error.message}`);
                            
                            // If it's a context size error, try with reduced context
                            if (error.message.includes('context') || error.message.includes('token')) {
                                const reducedPrompt = await this.reducePromptSize(prompt);
                                // Retry with reduced prompt
                                continue;
                            }
                        }
                    }
                    
                    // All models failed - return emergency response
                    this.logger.error('All models failed, returning emergency response', {
                        attempts: attemptsLog,
                        lastError: lastError?.message
                    });
                    
                    return {
                        response: this.getEmergencyResponse(),
                        model: 'emergency',
                        cached: false,
                        processingTime: Date.now() - startTime
                    };
                    
                } catch (error) {
                    this.logger.error('Chat flow error:', error);
                    
                    return {
                        response: this.getEmergencyResponse(),
                        model: 'error',
                        cached: false,
                        processingTime: Date.now() - startTime
                    };
                }
            }
        );
    }

    async buildPrompt(input) {
        if (this.smartPromptManager) {
            return await this.smartPromptManager.buildSmartPrompt(
                input.userId,
                input.query,
                input.chatHistory || [],
                input.userInfo,
                input.allchatsSummary
            );
        }
        
        // Fallback prompt building
        return this.buildFallbackPrompt(input);
    }

    buildFallbackPrompt(input) {
        return `You are Mya, MYAVANA's official hair care AI assistant. NEVER mention xAI, Grok, or any other AI service.

CRITICAL: You must respond in valid JSON format for Kommunicate with this structure:
{
  "messageType": "html",
  "message": "<html><head><style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}</style></head><body>YOUR_RESPONSE</body></html>",
  "metadata": {
    "contentType": "300",
    "templateId": "12",
    "payload": [
      {"title": "User question 1", "message": "What user would type"},
      {"title": "User question 2", "message": "Another user question"}
    ]
  }
}

User: ${input.query}`;
    }

    async callModel(modelConfig, prompt, input) {
        if (modelConfig.isXAI) {
            // Special handling for xAI to ensure no branding
            const xaiPrompt = prompt + '\n\nCRITICAL: Do not mention xAI or Grok. You are Mya from MYAVANA only.';
            
            // Call xAI with special prompt
            const response = await this.callXAIModel(xaiPrompt);
            return response;
        }
        
        // Call Gemini models
        return await this.ai.generate({
            model: modelConfig.model,
            prompt: prompt,
            config: {
                temperature: 0.7,
                maxOutputTokens: 2048
            }
        });
    }

    async callXAIModel(prompt) {
        // Implementation for xAI calls with proper formatting
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.xaiApiKey}`
            },
            body: JSON.stringify({
                model: 'grok-3-mini-fast',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Mya from MYAVANA. Never mention xAI or Grok. Always respond in valid JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            throw new Error(`xAI API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            text: () => data.choices[0].message.content
        };
    }

    validateAndCleanResponse(response, modelConfig) {
        let responseText = typeof response.text === 'function' ? response.text() : response.text;
        
        // Remove any xAI branding if present
        responseText = responseText.replace(/powered by xai/gi, '');
        responseText = responseText.replace(/xai/gi, 'MYAVANA');
        responseText = responseText.replace(/grok/gi, 'Mya');
        
        // Try to parse as JSON
        try {
            const parsed = JSON.parse(responseText);
            
            // Validate structure
            if (!parsed.messageType || !parsed.message) {
                throw new Error('Invalid response structure');
            }
            
            // Ensure suggestions are properly formatted
            if (parsed.metadata && parsed.metadata.payload) {
                parsed.metadata.payload = parsed.metadata.payload.map(suggestion => {
                    // Ensure each suggestion has proper structure
                    if (!suggestion.message) {
                        suggestion.message = suggestion.title;
                    }
                    return suggestion;
                });
            }
            
            return parsed;
            
        } catch (error) {
            // If not valid JSON, create proper structure
            return {
                messageType: 'html',
                message: `<html><head><style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}</style></head><body>${responseText}</body></html>`,
                metadata: {
                    contentType: '300',
                    templateId: '12',
                    payload: [
                        { title: 'Tell me about HairAI™', message: 'Tell me about HairAI™' },
                        { title: 'What\'s my hair type?', message: 'What\'s my hair type?' },
                        { title: 'Book a consultation', message: 'I want to book a consultation' }
                    ]
                }
            };
        }
    }

    async reducePromptSize(prompt) {
        // Remove less important sections to fit token limits
        const lines = prompt.split('\n');
        const essentialLines = lines.filter(line => {
            const lower = line.toLowerCase();
            return lower.includes('you are mya') ||
                   lower.includes('critical') ||
                   lower.includes('response format') ||
                   lower.includes('user:');
        });
        
        return essentialLines.join('\n');
    }

    getEmergencyResponse() {
        return {
            messageType: 'html',
            message: '<html><head><style>body{font-family:\'Archivo\',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:\'Archivo Expanded Black\',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}</style></head><body><p>I\'m having a moment! Let me connect you with a MYAVANA hair expert who can help you personally.</p><p>Meanwhile, explore our <span class="highlight">HairAI™</span> analysis or book a consultation!</p></body></html>',
            metadata: {
                contentType: '300',
                templateId: '12',
                payload: [
                    { title: 'Connect me to an expert', message: 'I want to speak to a human expert' },
                    { title: 'Tell me about HairAI™', message: 'What is HairAI™?' },
                    { title: 'Book a consultation', message: 'How do I book a consultation?' }
                ]
            }
        };
    }

    async handleRequest(req, res) {
        try {
            const startTime = Date.now();
            
            // Validate request
            const validation = this.validator.validateChatRequest(req.body);
            if (!validation.valid) {
                return res.status(400).json({
                    error: true,
                    message: validation.error
                });
            }

            // Extract request data
            const { userId, message, chatHistory, userInfo, conversationId } = req.body;

            // Log incoming request
            this.logger.info('Incoming chat request', {
                userId,
                conversationId,
                messageLength: message.length
            });

            // Track analytics
            if (this.analytics) {
                await this.analytics.trackUserMessage(userId, conversationId, message);
            }

            // Process through chat flow
            const result = await this.chatFlow({
                userId,
                query: message,
                chatHistory,
                userInfo,
                allchatsSummary: req.body.allchatsSummary
            });

            // Track response analytics
            if (this.analytics) {
                await this.analytics.trackAIResponse(
                    userId,
                    conversationId,
                    result.response,
                    result.model,
                    result.processingTime,
                    result.cached
                );
            }

            // Send response
            res.json({
                success: true,
                response: result.response,
                metadata: {
                    model: result.model,
                    cached: result.cached,
                    processingTime: result.processingTime
                }
            });

        } catch (error) {
            this.logger.error('Request handling error:', error);
            
            res.status(500).json({
                error: true,
                response: this.getEmergencyResponse()
            });
        }
    }
}

module.exports = UnifiedChatHandler;