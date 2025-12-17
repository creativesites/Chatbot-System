// personalizationEngineFallback.js - Basic personalization fallback
class PersonalizationEngineFallback {
    constructor() {
        console.log('⚠️ Using PersonalizationEngine fallback implementation');
        this.userProfiles = new Map();
    }

    async analyzeUserPersona(userId) {
        // Simple persona detection based on recent interactions
        const profile = this.userProfiles.get(userId) || { 
            messageCount: 0, 
            topics: [],
            persona: 'hair_journey_beginner' 
        };
        
        // Basic persona assignment
        if (profile.messageCount > 20) {
            profile.persona = 'hair_enthusiast';
        } else if (profile.topics.includes('quick') || profile.topics.includes('simple')) {
            profile.persona = 'busy_professional';
        } else if (profile.topics.includes('problem') || profile.topics.includes('issue')) {
            profile.persona = 'problem_solver';
        }
        
        return {
            persona: profile.persona,
            confidence: 0.7,
            details: this.getPersonaDetails(profile.persona)
        };
    }

    getPersonaDetails(persona) {
        const personas = {
            'hair_enthusiast': {
                name: 'Hair Enthusiast',
                response_style: 'detailed_technical'
            },
            'busy_professional': {
                name: 'Busy Professional',
                response_style: 'concise_actionable'
            },
            'hair_journey_beginner': {
                name: 'Hair Journey Beginner',
                response_style: 'educational_supportive'
            },
            'problem_solver': {
                name: 'Problem Solver',
                response_style: 'problem_solution_focused'
            }
        };
        
        return personas[persona] || personas['hair_journey_beginner'];
    }

    async getPersonalizedResponse(userId, query, baseResponse, context = {}) {
        try {
            // Track user interaction
            const profile = this.userProfiles.get(userId) || { 
                messageCount: 0, 
                topics: [],
                persona: 'hair_journey_beginner' 
            };
            
            profile.messageCount++;
            
            // Simple topic tracking
            const queryLower = query.toLowerCase();
            if (queryLower.includes('product')) profile.topics.push('product');
            if (queryLower.includes('routine')) profile.topics.push('routine');
            if (queryLower.includes('problem')) profile.topics.push('problem');
            
            this.userProfiles.set(userId, profile);
            
            // For fallback, just return the base response
            // Real personalization would modify the response based on persona
            return baseResponse;
            
        } catch (error) {
            console.error('Personalization fallback error:', error);
            return baseResponse;
        }
    }

    async getPersonalizationContext(userId) {
        const profile = this.userProfiles.get(userId) || {
            messageCount: 0,
            topics: [],
            persona: 'hair_journey_beginner',
            lastActive: new Date()
        };
        
        return {
            messageCount: profile.messageCount,
            topicsDiscussed: profile.topics,
            persona: profile.persona,
            isNewUser: profile.messageCount < 5
        };
    }

    async trackPersonalizationMetrics(userId, persona, query, response) {
        console.log(`📊 Personalization tracked (fallback): ${persona} for user ${userId}`);
    }

    // Helper methods for basic personalization
    shouldUseDetailedResponse(persona) {
        return persona === 'hair_enthusiast';
    }

    shouldUseConciseResponse(persona) {
        return persona === 'busy_professional';
    }

    shouldIncludeEducation(persona) {
        return persona === 'hair_journey_beginner';
    }

    getRecommendedSuggestions(persona) {
        const suggestions = {
            'hair_enthusiast': [
                { title: 'Latest hair science', message: 'Tell me about the latest hair science' },
                { title: 'Ingredient analysis', message: 'Analyze ingredients in my products' },
                { title: 'Advanced techniques', message: 'What are advanced hair care techniques?' }
            ],
            'busy_professional': [
                { title: 'Quick routine', message: 'Give me a 5-minute hair routine' },
                { title: 'Time-saving tips', message: 'What are time-saving hair tips?' },
                { title: 'Low maintenance', message: 'Suggest low maintenance styles' }
            ],
            'hair_journey_beginner': [
                { title: 'Hair type', message: 'What\'s my hair type?' },
                { title: 'Basic routine', message: 'Help me create a basic hair routine' },
                { title: 'Learn about HairAI™', message: 'What is HairAI™?' }
            ],
            'problem_solver': [
                { title: 'Diagnose issue', message: 'Help diagnose my hair problem' },
                { title: 'Treatment options', message: 'What treatments do you recommend?' },
                { title: 'Expert consultation', message: 'Should I book a consultation?' }
            ]
        };
        
        return suggestions[persona] || suggestions['hair_journey_beginner'];
    }

    clearUserProfile(userId) {
        this.userProfiles.delete(userId);
    }
}

module.exports = PersonalizationEngineFallback;