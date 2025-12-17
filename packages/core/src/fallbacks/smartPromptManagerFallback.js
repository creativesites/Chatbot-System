// smartPromptManagerFallback.js - Fallback implementation for SmartPromptManager
class SmartPromptManagerFallback {
    constructor() {
        console.log('⚠️ Using SmartPromptManager fallback implementation');
        this.promptCache = new Map();
        this.initializeCache();
    }

    async initializeCache() {
        // Pre-cache the core prompt
        this.promptCache.set('core_system_prompt', this.getCoreSystemPromptSync());
    }

    async buildSmartPrompt(userId, userQuery, chatHistory, userInfo, allchatsSummary) {
        try {
            const corePrompt = this.getCoreSystemPromptSync();
            
            // Simple topic detection
            const query = userQuery.toLowerCase();
            const isProductQuery = query.includes('product') || query.includes('buy') || query.includes('recommend');
            const isServiceQuery = query.includes('hairai') || query.includes('hairsi') || query.includes('consultation');
            const isHairTypeQuery = query.includes('hair type') || query.includes('texture') || /[2-4][a-c]/i.test(query);
            
            let prompt = corePrompt + '\n\n';
            
            // Add user context
            if (userInfo) {
                prompt += `User Profile: ${JSON.stringify(userInfo)}\n`;
            }
            
            if (allchatsSummary && allchatsSummary !== 'conversation summary not available.') {
                prompt += `Previous Conversations: ${allchatsSummary}\n\n`;
            }
            
            // Add relevant context based on query type
            if (isServiceQuery) {
                prompt += this.getServiceContext();
            }
            
            if (isProductQuery) {
                prompt += this.getProductContext();
            }
            
            if (isHairTypeQuery) {
                prompt += this.getHairTypeContext();
            }
            
            // Add recent conversation
            if (chatHistory && chatHistory.length > 0) {
                prompt += '\nRecent Conversation:\n';
                const recentMessages = chatHistory.slice(-3);
                recentMessages.forEach(msg => {
                    prompt += `${msg.role}: ${msg.content}\n`;
                });
            }
            
            prompt += `\n\nUser Query: ${userQuery}\n`;
            prompt += '\nREMEMBER: Respond ONLY in valid JSON format as specified. Never mention xAI or any other AI service.';
            
            return prompt;
            
        } catch (error) {
            console.error('Fallback prompt error:', error);
            return this.getCoreSystemPromptSync() + `\n\nUser Query: ${userQuery}`;
        }
    }

    getCoreSystemPromptSync() {
        return `You are Mya, MYAVANA's official hair care AI assistant. You represent MYAVANA exclusively.

CRITICAL RULES:
1. NEVER mention xAI, Grok, or any other AI service
2. ALWAYS respond in valid JSON format for Kommunicate
3. ALWAYS maintain MYAVANA's professional yet warm tone
4. ALWAYS format suggestions as user questions

Required JSON Response Format:
{
  "messageType": "html",
  "message": "<html><head><style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}i{font-style:italic;color:#4a4d68;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}</style></head><body>YOUR_RESPONSE_HERE</body></html>",
  "metadata": {
    "contentType": "300",
    "templateId": "12",
    "payload": [
      {
        "title": "Question user might ask",
        "message": "What the user would type"
      }
    ]
  }
}

Core Knowledge:
- You are an expert in personalized hair care
- MYAVANA offers HairAI™ (AI-powered hair analysis), HairSI™ (science-based insights), and virtual consultations
- Focus on understanding the user's hair journey and providing personalized advice
- Be empathetic, encouraging, and solution-focused`;
    }

    getServiceContext() {
        return `
MYAVANA Services:
- HairAI™: Our revolutionary AI-powered hair analysis that provides personalized recommendations
- HairSI™: Science-based hair insights using advanced analytics
- Virtual Consultations: One-on-one sessions with certified hair care experts
- Personalized Product Recommendations: Curated based on your unique hair profile

`;
    }

    getProductContext() {
        return `
Product Recommendation Approach:
- Always ask about hair type and concerns before recommending products
- Focus on MYAVANA's curated product selection
- Explain why specific products work for their hair type
- Mention ingredients and benefits

`;
    }

    getHairTypeContext() {
        return `
Hair Type Classification:
- Type 1: Straight (1A: Pin-straight, 1B: Straight with slight wave, 1C: Straight with body wave)
- Type 2: Wavy (2A: Loose waves, 2B: Defined waves, 2C: Strong waves)
- Type 3: Curly (3A: Loose curls, 3B: Tight curls, 3C: Tight corkscrews)
- Type 4: Coily/Kinky (4A: Soft coils, 4B: Tight coils, 4C: Tight zig-zag pattern)

`;
    }

    async getCoreSystemPrompt() {
        return this.getCoreSystemPromptSync();
    }

    async getFallbackPrompt(userInfo, allchatsSummary) {
        return this.getCoreSystemPromptSync() + `\n\nUser Info: ${JSON.stringify(userInfo || {})}`;
    }

    clearCache() {
        this.promptCache.clear();
    }
}

module.exports = SmartPromptManagerFallback;