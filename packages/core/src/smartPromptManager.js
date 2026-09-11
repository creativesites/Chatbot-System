// smartPromptManager.js - Fixed version with proper exports and functionality
const { pgClient, redisClient } = require('./database');
const { HairMediaService } = require('./hairMedia/hairMediaService');

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

            // Get relevant visual media references (Item D)
            const relevantMedia = await this.getRelevantMedia(userQuery, contextAnalysis.topics, userInfo);
            
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
                relevantMedia,
                allchatsSummary,
                contextAnalysis
            });

            // Log metrics for analytics
            await this.logPromptMetrics(userId, {
                queryType: contextAnalysis.queryType,
                topicsDetected: contextAnalysis.topics,
                promptLength: optimizedPrompt.length,
                faqsUsed: relevantFaqs.length,
                productsUsed: relevantProducts.length,
                mediaUsed: relevantMedia.length
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
            'styling': ['style', 'protect', 'heat', 'curling', 'straightening', 'braids'],
            'hairstyles': ['bantu knots', 'cornrows', 'box braids', 'flat twists', 'twist out', 'afro', 'twa', 'locs', 'protective style', 'braids', 'protective styling', 'updo'],
            'diagnostics': ['cuticle', 'sem', 'microscopy', 'split ends', 'trichoptilosis', 'seborrheic dermatitis', 'traction alopecia', 'scalp', 'follicle', 'shaft', 'shrinkage']
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

        // CRITICAL: Myavana-specific system prompt with Response Format Intelligence Layer (TASK_MSDK_009)
        const corePrompt = `You are Mya, MYAVANA's official hair care AI assistant. You must ALWAYS represent MYAVANA and NEVER mention being powered by any other AI service.

CRITICAL INSTRUCTIONS:
1. NEVER mention xAI, Grok, or any other AI service
2. ALWAYS maintain Myavana's brand voice and identity
3. ALWAYS format responses in valid JSON

Core Personality:
- Empathetic and encouraging about hair journeys
- Professional yet warm and approachable
- Expert in personalized hair care advice
- Focused on MYAVANA's services and solutions

================================================================================
🤖 RESPONSE FORMAT INTELLIGENCE LAYER (TASK_MSDK_009)
================================================================================

You must dynamically choose between two output modes based on the user's intent:

1. PROSE MODE:
   - Trigger: Conversational greetings, empathy, simple check-ins, or brief factual answers.
   - Response structure: ONLY a single "text" block in the blocks array, accompanied by 2-3 relevant quickReplies.
   - Word count: Keep concise, warm, and direct (max 100-150 words).

2. STRUCTURED MODE:
   - Trigger: Regimens, multi-step routines, wash day checklists, hair goals, strand DNA analysis, or diary logging.
   - HARD COMPONENT DENSITY BUDGET: Max 1 to 2 structured components per response! NEVER stack more than 2 components. Quality over quantity.
   - Accompanying text: When structured components are present, keep accompanying text concise (under 80-120 words). Let the cards do the heavy lifting instead of dumping walls of text.

When-To-Use Heuristics for Block Types:
- "text" Block: Conversational dialogue, empathetic encouragement, concise explanations.
- "today_checklist" Block: Immediate step-by-step wash day or styling execution (3-6 clear actionable steps).
- "routine_card" Block: Complete hair care regimens, multi-step morning/night regimens.
- "hair_profile_summary" Block: Strand diagnostic attributes (porosity, texture, elasticity, density).
- "goal_card" Block: Active hair milestones (length retention, moisture restoration, transition tracking).
- "journal_entry" Block: Confirming or summarizing a hair diary log.
- "community_post" Block: Surfacing relevant peer discussions or community tips.
- "media_card" Block: Visual strand diagnostics, microscopy (SEM cuticle scales, strand damage), Andre Walker curl pattern references (1A-4C macro photography), scalp conditions (seborrheic dermatitis, traction alopecia), and hair biology diagrams.
- "hairstyle_card" Block: Protective hairstyle inspiration and maintenance (bantu knots, box braids, cornrows, flat twists, locs, twist-outs, TWAs, afros).

================================================================================
🔬 SCIENTIFIC HAIR TAXONOMY & BIOMECHANICS INTELLIGENCE
================================================================================
When counseling users on curl patterns, diagnostics, or styling, apply these foundational biomechanics principles:
1. 4C SHRINKAGE AS AN ELASTIC ADAPTATION: 75%–90%+ shrinkage in 4C hair is an evolutionary spring mechanism for internal moisture retention and tensile recoil, NOT damage or lack of growth. Celebrate shrinkage and counsel low-manipulation maintenance.
2. FOLLICULAR ASYMMETRY & STRESS POINTS: Textured curls emerge from curved, elliptical follicles with asymmetric orthocortical and paracortical cell distribution. Every curvature represents a high-friction stress point; always advise lubricated detangling slip.
3. CUTICLE SCALE PHYSICS: Low porosity hair features sealed 18-MEA lipid layers requiring gentle warmth/indirect steam to hydrate; high porosity hair features lifted/chipped scales requiring cationic conditioning and sealing butter/oil.
4. TENSION MITIGATION & PROTECTIVE STYLING: Flat twists exert ~40% less scalp shear tension than three-strand plaits. Emphasize tension-free installation, knotless transitions, and edge preservation to prevent traction alopecia.

MANDATORY QUICK REPLIES:
- You MUST provide 2 to 3 "quickReplies" on EVERY response without exception.
- Quick replies anticipate what the USER would naturally ask or tap next.
- Make labels short, punchy, and actionable (e.g., "See wash steps", "Track in diary", "Adjust frequency").

Response Format Requirements:
You MUST respond in valid JSON using this EXACT structure:

{
  "blocks": [
    {
      "id": "text_block_1",
      "type": "text",
      "data": {
        "text": "Your concise, warm conversational or descriptive text here (plain markdown, bolding allowed)."
      }
    },
    {
      "id": "component_block_1",
      "type": "today_checklist",
      "data": {
        "title": "Wash Day Regimen",
        "steps": [
          "Pre-poo with jojoba oil (15 mins)",
          "Cleanse with clarifying shampoo",
          "Deep condition with moisture mask"
        ]
      }
    }
  ],
  "quickReplies": [
    {
      "label": "Deep conditioner tips",
      "payload": { "text": "What deep conditioner should I use for low porosity?" }
    },
    {
      "label": "Log in hair diary",
      "payload": { "text": "Log this wash day in my hair diary" }
    }
  ]
}

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
     * Get relevant visual media references from verified catalog
     */
    async getRelevantMedia(userQuery, topics, userInfo) {
        try {
            if (!HairMediaService) return [];
            let matches = [];
            const query = (userQuery || '').toLowerCase();
            
            if (topics.includes('hairstyles') || query.includes('braid') || query.includes('twist') || query.includes('knot') || query.includes('loc')) {
                matches.push(...HairMediaService.searchMedia(query, { category: 'hairstyles', limit: 3 }));
            }
            if (topics.includes('diagnostics') || query.includes('cuticle') || query.includes('scalp') || query.includes('split') || query.includes('damage')) {
                matches.push(...HairMediaService.searchMedia(query, { category: 'microscopic_anatomy', limit: 3 }));
            }
            if (topics.includes('hair_type') || query.includes('4c') || query.includes('4b') || query.includes('4a') || query.includes('3c')) {
                let userType = null;
                if (typeof userInfo === 'object' && userInfo) {
                    userType = userInfo.hair_type || userInfo.curl_pattern;
                } else if (typeof userInfo === 'string') {
                    const m = userInfo.match(/(?:hair_type|curl_pattern)["':\s]+([1-4][A-C])/i);
                    if (m) userType = m[1];
                }
                if (!userType) {
                    const typeMatch = query.match(/\b([1-4][a-c])\b/i);
                    if (typeMatch) userType = typeMatch[1];
                }
                if (userType) {
                    matches.push(...HairMediaService.getMediaForHairType(userType, 2));
                }
            }
            // Deduplicate by ID
            const seen = new Set();
            return matches.filter(m => {
                if (seen.has(m.id)) return false;
                seen.add(m.id);
                return true;
            }).slice(0, 3);
        } catch (error) {
            console.error('Error fetching relevant media:', error);
            return [];
        }
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

        // TASK_MSDK_007: Adherence-to-Recommendation Personalization Check
        if (userInfo) {
            let userObj = {};
            if (typeof userInfo === 'string') {
                try {
                    userObj = JSON.parse(userInfo);
                } catch {
                    userObj = {};
                }
            } else if (typeof userInfo === 'object') {
                userObj = userInfo;
            }

            if (userObj.adherence_30d !== undefined && parseFloat(userObj.adherence_30d) < 0.50) {
                const percentage = Math.round(parseFloat(userObj.adherence_30d) * 100);
                prompt += `
🚨 [CRITICAL LIFESTYLE PERSONALIZATION RULE - TASK_MSDK_007]:
This user's 30-day routine adherence rate is currently at ${percentage}% (which is below 50%).
This indicates their current recommended wash-day frequency is too high or difficult to maintain with their current busy lifestyle.
Instead of repeating the standard generic wash-day recommendation, you MUST proactively address this low adherence:
1. Empathize warmly with their busy schedule (no guilt-tripping).
2. Recommend reducing or adjusting their wash-day frequency to a more manageable spacing (e.g. bi-weekly instead of weekly).
3. Offer a simplified checklist block with only the most essential maintenance steps.
\n`;
            }
        }

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

        // Add relevant instructions
        if (relevantInstructions.length > 0) {
            prompt += `Additional Instructions:\n`;
            relevantInstructions.forEach(instruction => {
                prompt += `- ${instruction.instruction_text}\n`;
            });
            prompt += '\n';
        }

        // Add verified visual media references if available (Item D)
        if (components.relevantMedia && components.relevantMedia.length > 0) {
            prompt += `Verified Visual Media References (Can emit as "media_card" or "hairstyle_card"):\n`;
            components.relevantMedia.forEach(m => {
                prompt += `- [${m.id}] ${m.title} (${m.category}/${m.subcategory}) Image: ${m.source_url} Attribution: ${m.author_attribution} License: ${m.license}\n`;
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