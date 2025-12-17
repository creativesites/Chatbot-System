// smartPromptManager.js - Fixed version with proper exports and functionality
const { pgClient, redisClient } = require('./database');

class SmartPromptManager {
    constructor() {
        // Cache for frequently used prompt components
        this.promptCache = new Map();
        
        // Token limits for different models
        this.modelLimits = {
            'gemini20FlashExp': 32000,
            'gemini15Flash': 16000,
            'xai-grok-3-mini-fast': 32000
        };

        // Initialize cache with core prompts
        this.initializeCache();
    }

    /**
     * Initialize cache with essential prompts
     */
    async initializeCache() {
        try {
            // Pre-cache core system prompt
            await this.getCoreSystemPrompt();
            console.log('✅ Smart prompt cache initialized');
        } catch (error) {
            console.error('❌ Failed to initialize prompt cache:', error);
        }
    }

    /**
     * Get context-aware prompt based on user query and conversation state
     */
    async buildSmartPrompt(userId, userQuery, chatHistory, userInfo, allchatsSummary) {
        try {
            // Analyze user query to determine required context
            const contextAnalysis = await this.analyzeQueryContext(userQuery, chatHistory);
            
            // Get core system prompt (cached)
            const corePrompt = await this.getCoreSystemPrompt();
            
            // Get relevant FAQs based on query (smart selection)
            const relevantFaqs = await this.getRelevantFAQs(userQuery, contextAnalysis.topics);
            
            // Get relevant products (only if product-related query)
            const relevantProducts = contextAnalysis.isProductQuery ? 
                await this.getRelevantProducts(contextAnalysis.topics) : [];
            
            // Get relevant additional instructions
            const relevantInstructions = await this.getRelevantInstructions(contextAnalysis.topics);
            
            // Select most relevant conversation history (not all)
            const relevantHistory = this.selectRelevantHistory(chatHistory, contextAnalysis, 5);
            
            // Build optimized prompt
            const optimizedPrompt = this.assemblePrompt({
                corePrompt,
                userInfo,
                relevantHistory,
                relevantFaqs,
                relevantProducts,
                relevantInstructions,
                allchatsSummary,
                contextAnalysis
            });

            // Log metrics for analytics
            await this.logPromptMetrics(userId, {
                queryType: contextAnalysis.queryType,
                topicsDetected: contextAnalysis.topics,
                promptLength: optimizedPrompt.length,
                faqsUsed: relevantFaqs.length,
                productsUsed: relevantProducts.length
            });

            return optimizedPrompt;

        } catch (error) {
            console.error('Error in buildSmartPrompt:', error);
            // Fallback to basic prompt
            return await this.getFallbackPrompt(userInfo, allchatsSummary);
        }
    }

    /**
     * Analyze user query to understand context and intent
     */
    async analyzeQueryContext(userQuery, chatHistory) {
        const query = userQuery.toLowerCase();
        
        // Define topic keywords for smart matching
        const topicKeywords = {
            'hair_type': ['hair type', 'texture', 'curly', 'straight', 'wavy', 'coily', '2a', '2b', '2c', '3a', '3b', '3c', '4a', '4b', '4c'],
            'hair_care': ['routine', 'products', 'shampoo', 'conditioner', 'treatment', 'moisturize', 'protein'],
            'hair_issues': ['damage', 'breakage', 'dry', 'frizzy', 'split ends', 'thinning', 'scalp', 'dandruff'],
            'services': ['hairai', 'hairsi', 'analysis', 'consultation', 'appointment', 'book'],
            'company_info': ['myavana', 'about', 'company', 'mission', 'team', 'story'],
            'products': ['buy', 'purchase', 'recommend', 'best products', 'ingredients'],
            'styling': ['style', 'protect', 'heat', 'curling', 'straightening', 'braids']
        };

        const detectedTopics = [];
        let queryType = 'general';
        let isProductQuery = false;

        // Detect topics in query
        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(keyword => query.includes(keyword))) {
                detectedTopics.push(topic);
                if (topic === 'products') isProductQuery = true;
            }
        }

        // Determine query type based on recent conversation
        if (chatHistory.length > 0) {
            const recentMessages = chatHistory.slice(-3);
            const recentContent = recentMessages.map(m => m.content).join(' ').toLowerCase();
            
            if (recentContent.includes('image') || recentContent.includes('photo')) {
                queryType = 'image_followup';
            } else if (detectedTopics.includes('services')) {
                queryType = 'service_inquiry';
            } else if (detectedTopics.includes('hair_issues')) {
                queryType = 'problem_solving';
            }
        }

        return {
            topics: detectedTopics,
            queryType,
            isProductQuery,
            confidence: detectedTopics.length > 0 ? 0.8 : 0.3
        };
    }

    /**
     * Get core system prompt (cached for efficiency)
     */
    async getCoreSystemPrompt() {
        const cacheKey = 'core_system_prompt';
        
        if (this.promptCache.has(cacheKey)) {
            return this.promptCache.get(cacheKey);
        }

        // CRITICAL: Myavana-specific system prompt
        const corePrompt = `You are Mya, MYAVANA's official hair care AI assistant. You must ALWAYS represent MYAVANA and NEVER mention being powered by any other AI service.

CRITICAL INSTRUCTIONS:
1. NEVER mention xAI, Grok, or any other AI service
2. ALWAYS maintain Myavana's brand voice and identity
3. ALWAYS format responses in valid JSON for Kommunicate

Core Personality:
- Empathetic and encouraging about hair journeys
- Professional yet warm and approachable
- Expert in personalized hair care advice
- Focused on MYAVANA's services and solutions

Response Format Requirements:
You MUST respond in valid JSON using this EXACT structure:

For regular messages:
{
  "messageType": "html",
  "message": "<html><head><style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}i{font-style:italic;color:#4a4d68;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}</style></head><body>YOUR_RESPONSE_HERE</body></html>",
  "metadata": {
    "contentType": "300",
    "templateId": "12",
    "payload": [
      {
        "title": "Suggestion 1 Text",
        "message": "What the user would type when clicking this"
      },
      {
        "title": "Suggestion 2 Text", 
        "message": "Another question the user might ask"
      },
      {
        "title": "Suggestion 3 Text",
        "message": "A related follow-up question"
      }
    ]
  }
}

IMPORTANT Suggestion Rules:
- Suggestions are questions/statements the USER would ask next
- The "message" field is what gets sent AS IF the user typed it
- Keep suggestions relevant to the current conversation topic

Your Primary Goals:
1. Understand user's hair journey stage and provide personalized advice
2. Recommend appropriate MYAVANA services (HairAI™, HairSI™, consultations)
3. Build user confidence in their hair care journey
4. Always maintain professional, helpful demeanor

Never break character or mention technical details about AI models or services.`;

        this.promptCache.set(cacheKey, corePrompt);
        return corePrompt;
    }

    /**
     * Get relevant FAQs based on detected topics
     */
    async getRelevantFAQs(userQuery, topics) {
        try {
            const cacheKey = `faqs_${topics.join('_')}`;
            
            // Check Redis cache first
            if (redisClient && redisClient.isOpen) {
                const cached = await redisClient.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            }

            // Build dynamic query based on topics
            let whereClause = '';
            let values = [];
            
            if (topics.length > 0) {
                const conditions = [];
                let paramIndex = 1;
                
                topics.forEach(topic => {
                    const topicWords = topic.replace(/_/g, ' ');
                    conditions.push(`(LOWER(question) LIKE $${paramIndex} OR LOWER(answer) LIKE $${paramIndex + 1})`);
                    values.push(`%${topicWords}%`, `%${topicWords}%`);
                    paramIndex += 2;
                });
                
                whereClause = `WHERE ${conditions.join(' OR ')}`;
            }

            const query = `SELECT question, answer FROM faqs ${whereClause} LIMIT 5`;
            const result = await pgClient.query(query, values);
            const relevantFaqs = result.rows;

            // Cache for 30 minutes
            if (redisClient && redisClient.isOpen) {
                await redisClient.set(cacheKey, JSON.stringify(relevantFaqs), { EX: 1800 });
            }
            
            return relevantFaqs;

        } catch (error) {
            console.error('Error fetching relevant FAQs:', error);
            return [];
        }
    }

    /**
     * Get relevant products based on topics
     */
    async getRelevantProducts(topics) {
        try {
            if (topics.length === 0) return [];

            const cacheKey = `products_${topics.join('_')}`;
            
            // Check cache
            if (redisClient && redisClient.isOpen) {
                const cached = await redisClient.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            }

            // Get products that match the hair care topics
            const conditions = [];
            const values = [];
            let paramIndex = 1;
            
            topics.forEach(topic => {
                const topicWords = topic.replace(/_/g, ' ');
                conditions.push(`(LOWER(description) LIKE $${paramIndex} OR LOWER(product_name) LIKE $${paramIndex + 1})`);
                values.push(`%${topicWords}%`, `%${topicWords}%`);
                paramIndex += 2;
            });
            
            const whereClause = conditions.join(' OR ');
            const query = `SELECT product_name, description, price FROM products WHERE ${whereClause} LIMIT 3`;
            
            const result = await pgClient.query(query, values);
            const relevantProducts = result.rows;

            // Cache for 1 hour
            if (redisClient && redisClient.isOpen) {
                await redisClient.set(cacheKey, JSON.stringify(relevantProducts), { EX: 3600 });
            }
            
            return relevantProducts;

        } catch (error) {
            console.error('Error fetching relevant products:', error);
            return [];
        }
    }

    /**
     * Get relevant bot instructions
     */
    async getRelevantInstructions(topics) {
        try {
            const result = await pgClient.query('SELECT instruction_text FROM bot_instructions LIMIT 3');
            return result.rows;
        } catch (error) {
            console.error('Error fetching bot instructions:', error);
            return [];
        }
    }

    /**
     * Select most relevant conversation history
     */
    selectRelevantHistory(chatHistory, contextAnalysis, maxMessages = 5) {
        if (!chatHistory || chatHistory.length === 0) return [];

        // Always include the last few messages for continuity
        const recentMessages = chatHistory.slice(-3);
        
        // If we have more history, select contextually relevant messages
        if (chatHistory.length > 3) {
            const olderMessages = chatHistory.slice(0, -3);
            const relevantOlderMessages = olderMessages.filter(message => {
                const content = message.content.toLowerCase();
                return contextAnalysis.topics.some(topic => 
                    content.includes(topic.replace('_', ' '))
                );
            }).slice(-2); // Max 2 older relevant messages

            return [...relevantOlderMessages, ...recentMessages];
        }

        return recentMessages;
    }

    /**
     * Assemble optimized prompt from components
     */
    assemblePrompt(components) {
        const {
            corePrompt,
            userInfo,
            relevantHistory,
            relevantFaqs,
            relevantProducts,
            relevantInstructions,
            allchatsSummary,
            contextAnalysis
        } = components;

        let prompt = corePrompt + '\n\n';

        // Add user context
        if (userInfo) {
            prompt += `User Profile: ${JSON.stringify(userInfo)}\n`;
        }

        if (allchatsSummary && allchatsSummary !== 'conversation summary not available.') {
            prompt += `Previous Conversations Summary: ${allchatsSummary}\n\n`;
        }

        // Add relevant FAQs (most important for domain accuracy)
        if (relevantFaqs.length > 0) {
            prompt += `Relevant MYAVANA Knowledge:\n`;
            relevantFaqs.forEach(faq => {
                prompt += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
            });
        }

        // Add relevant products if this is a product query
        if (relevantProducts.length > 0) {
            prompt += `Available MYAVANA Products:\n`;
            relevantProducts.forEach(product => {
                prompt += `- ${product.product_name}: ${product.description} (${product.price})\n`;
            });
            prompt += '\n';
        }

        // Add specific instructions
        if (relevantInstructions.length > 0) {
            prompt += `Additional Instructions:\n`;
            relevantInstructions.forEach(instruction => {
                prompt += `- ${instruction.instruction_text}\n`;
            });
            prompt += '\n';
        }

        // Add conversation context
        if (relevantHistory.length > 0) {
            prompt += `Recent Conversation Context:\n`;
            relevantHistory.forEach(message => {
                prompt += `${message.role}: ${message.content}\n`;
            });
        }

        // Add final reminder about response format
        prompt += '\n\nREMEMBER: Respond in valid JSON format with proper HTML styling and relevant suggestion buttons as specified above.';

        return prompt;
    }

    /**
     * Get fallback prompt when smart analysis fails
     */
    async getFallbackPrompt(userInfo, allchatsSummary) {
        const corePrompt = await this.getCoreSystemPrompt();
        return `${corePrompt}\n\nUser Info: ${JSON.stringify(userInfo)}\nPrevious Summary: ${allchatsSummary}`;
    }

    /**
     * Log prompt metrics for analytics
     */
    async logPromptMetrics(userId, metrics) {
        try {
            const query = `
                INSERT INTO prompt_analytics (
                    user_id, query_type, topics_detected, prompt_length, 
                    faqs_used, products_used, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `;
            
            await pgClient.query(query, [
                userId,
                metrics.queryType,
                JSON.stringify(metrics.topicsDetected),
                metrics.promptLength,
                metrics.faqsUsed,
                metrics.productsUsed
            ]);
        } catch (error) {
            console.error('Error logging prompt metrics:', error);
            // Don't throw - this shouldn't break the conversation
        }
    }

    /**
     * Clear cache (useful for testing or updates)
     */
    clearCache() {
        this.promptCache.clear();
        console.log('✅ Smart prompt cache cleared');
    }
}

// Export the class properly
module.exports = SmartPromptManager;