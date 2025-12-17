// personalizationEngine.js - Advanced personalization based on user behavior and preferences
const { pgClient, redisClient } = require('./database');

class PersonalizationEngine {
    constructor() {
        // User persona profiles based on behavior patterns
        this.userPersonas = {
            'hair_enthusiast': {
                name: 'Hair Enthusiast',
                characteristics: ['frequent_queries', 'product_focused', 'experimental'],
                response_style: 'detailed_technical',
                product_focus: 'ingredients_and_science'
            },
            'busy_professional': {
                name: 'Busy Professional',
                characteristics: ['quick_queries', 'routine_focused', 'low_maintenance'],
                response_style: 'concise_actionable',
                product_focus: 'time_saving_solutions'
            },
            'hair_journey_beginner': {
                name: 'Hair Journey Beginner',
                characteristics: ['basic_questions', 'guidance_seeking', 'education_focused'],
                response_style: 'educational_supportive',
                product_focus: 'fundamentals_and_basics'
            },
            'problem_solver': {
                name: 'Problem Solver',
                characteristics: ['issue_focused', 'solution_seeking', 'specific_concerns'],
                response_style: 'problem_solution_focused',
                product_focus: 'targeted_treatments'
            },
            'maintenance_mode': {
                name: 'Maintenance Mode',
                characteristics: ['routine_check_ins', 'satisfied_with_current', 'occasional_tweaks'],
                response_style: 'encouraging_maintenance',
                product_focus: 'routine_optimization'
            }
        };

        // Personalization factors
        this.personalizationFactors = {
            'hair_profile': 0.3, // Hair type, concerns, goals
            'behavior_pattern': 0.25, // How they use the chat
            'journey_stage': 0.2, // Current stage in hair journey
            'interaction_history': 0.15, // Past conversations
            'time_context': 0.1 // Time of day, season, etc.
        };
    }

    /**
     * Analyze user behavior and assign persona
     */
    async analyzeUserPersona(userId) {
        try {
            // Get user's interaction patterns
            const behaviorMetrics = await this.getUserBehaviorMetrics(userId);
            const hairProfile = await this.getUserHairProfile(userId);
            const conversationPatterns = await this.getConversationPatterns(userId);

            // Score each persona based on user data
            const personaScores = {};
            
            for (const [personaKey, persona] of Object.entries(this.userPersonas)) {
                let score = 0;

                // Check characteristics match
                for (const characteristic of persona.characteristics) {
                    score += this.scoreCharacteristic(characteristic, behaviorMetrics, conversationPatterns);
                }

                personaScores[personaKey] = score;
            }

            // Find best matching persona
            const bestPersona = Object.keys(personaScores).reduce((a, b) => 
                personaScores[a] > personaScores[b] ? a : b
            );

            // Cache the result
            await redisClient.set(`persona:${userId}`, bestPersona, { EX: 86400 }); // 24 hours

            return {
                persona: bestPersona,
                confidence: personaScores[bestPersona],
                details: this.userPersonas[bestPersona]
            };

        } catch (error) {
            console.error('Error analyzing user persona:', error);
            return { persona: 'hair_journey_beginner', confidence: 0.5 }; // Default fallback
        }
    }

    /**
     * Score a specific characteristic against user data
     */
    scoreCharacteristic(characteristic, behaviorMetrics, conversationPatterns) {
        switch (characteristic) {
            case 'frequent_queries':
                return behaviorMetrics.messagesPerDay > 5 ? 1 : 0;
            
            case 'product_focused':
                return conversationPatterns.productMentionRate > 0.3 ? 1 : 0;
            
            case 'experimental':
                return conversationPatterns.experimentalLanguage > 0.2 ? 1 : 0;
            
            case 'quick_queries':
                return behaviorMetrics.avgMessageLength < 50 ? 1 : 0;
            
            case 'routine_focused':
                return conversationPatterns.routineKeywords > 0.4 ? 1 : 0;
            
            case 'low_maintenance':
                return conversationPatterns.simplificityKeywords > 0.3 ? 1 : 0;
            
            case 'basic_questions':
                return conversationPatterns.basicQuestionWords > 0.5 ? 1 : 0;
            
            case 'guidance_seeking':
                return conversationPatterns.helpSeekingLanguage > 0.4 ? 1 : 0;
            
            case 'education_focused':
                return conversationPatterns.learningKeywords > 0.3 ? 1 : 0;
            
            case 'issue_focused':
                return conversationPatterns.problemLanguage > 0.4 ? 1 : 0;
            
            case 'solution_seeking':
                return conversationPatterns.solutionKeywords > 0.3 ? 1 : 0;
            
            case 'specific_concerns':
                return conversationPatterns.specificIssues > 2 ? 1 : 0;
            
            default:
                return 0;
        }
    }

    /**
     * Get personalized response based on user persona and context
     */
    async getPersonalizedResponse(userId, query, baseResponse, context = {}) {
        try {
            // Get user persona
            let userPersona = await redisClient.get(`persona:${userId}`);
            if (!userPersona) {
                const personaAnalysis = await this.analyzeUserPersona(userId);
                userPersona = personaAnalysis.persona;
            }

            // Get personalization context
            const personalizationContext = await this.getPersonalizationContext(userId);
            
            // Apply personalization based on persona
            const personalizedResponse = await this.applyPersonalization(
                baseResponse, 
                userPersona, 
                personalizationContext,
                context
            );

            // Track personalization metrics
            await this.trackPersonalizationMetrics(userId, userPersona, query, personalizedResponse);

            return personalizedResponse;

        } catch (error) {
            console.error('Error in personalized response:', error);
            return baseResponse; // Return original if personalization fails
        }
    }

    /**
     * Apply personalization to base response
     */
    async applyPersonalization(baseResponse, persona, personalizationContext, context) {
        const personaConfig = this.userPersonas[persona];
        if (!personaConfig) return baseResponse;

        let personalizedResponse = { ...baseResponse };

        // Modify response based on persona style
        switch (personaConfig.response_style) {
            case 'detailed_technical':
                personalizedResponse = await this.enhanceWithTechnicalDetails(personalizedResponse, personalizationContext);
                break;
                
            case 'concise_actionable':
                personalizedResponse = await this.makeConciseAndActionable(personalizedResponse);
                break;
                
            case 'educational_supportive':
                personalizedResponse = await this.addEducationalSupport(personalizedResponse);
                break;
                
            case 'problem_solution_focused':
                personalizedResponse = await this.focusOnProblemSolution(personalizedResponse, personalizationContext);
                break;
                
            case 'encouraging_maintenance':
                personalizedResponse = await this.addMaintenanceEncouragement(personalizedResponse);
                break;
        }

        // Add personal touches based on user data
        personalizedResponse = await this.addPersonalTouches(personalizedResponse, personalizationContext);

        return personalizedResponse;
    }

    /**
     * Get comprehensive personalization context for user
     */
    async getPersonalizationContext(userId) {
        try {
            const [hairProfile, recentIssues, preferences, behaviorMetrics] = await Promise.all([
                this.getUserHairProfile(userId),
                this.getRecentHairIssues(userId),
                this.getUserPreferences(userId),
                this.getUserBehaviorMetrics(userId)
            ]);

            return {
                hairProfile,
                recentIssues,
                preferences,
                behaviorMetrics,
                lastActive: await this.getLastActiveTime(userId),
                preferredTimeOfDay: await this.getPreferredTimeOfDay(userId)
            };

        } catch (error) {
            console.error('Error getting personalization context:', error);
            return {};
        }
    }

    /**
     * Get user behavior metrics for personalization
     */
    async getUserBehaviorMetrics(userId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_interactions,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as interactions_last_week,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') as interactions_today,
                    AVG(LENGTH(event_data->>'query')) as avg_message_length,
                    COUNT(DISTINCT DATE(created_at)) as active_days,
                    COUNT(*) FILTER (WHERE event_type = 'conversion') as conversions
                FROM user_journey_events 
                WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
            `;

            const result = await pgClient.query(query, [userId]);
            const metrics = result.rows[0];

            return {
                totalInteractions: parseInt(metrics.total_interactions) || 0,
                interactionsLastWeek: parseInt(metrics.interactions_last_week) || 0,
                interactionsToday: parseInt(metrics.interactions_today) || 0,
                avgMessageLength: parseFloat(metrics.avg_message_length) || 0,
                activeDays: parseInt(metrics.active_days) || 0,
                conversions: parseInt(metrics.conversions) || 0,
                messagesPerDay: metrics.active_days ? metrics.total_interactions / metrics.active_days : 0
            };

        } catch (error) {
            console.error('Error getting user behavior metrics:', error);
            return {};
        }
    }

    /**
     * Get user hair profile for personalization
     */
    async getUserHairProfile(userId) {
        try {
            const query = `SELECT * FROM users WHERE user_id = $1`;
            const result = await pgClient.query(query, [userId]);
            return result.rows[0] || {};
        } catch (error) {
            console.error('Error getting user hair profile:', error);
            return {};
        }
    }

    /**
     * Get conversation patterns for persona analysis
     */
    async getConversationPatterns(userId) {
        try {
            const query = `
                SELECT 
                    event_data->>'query' as query_text
                FROM user_journey_events 
                WHERE user_id = $1 AND event_type = 'user_query' 
                  AND created_at >= NOW() - INTERVAL '30 days'
                ORDER BY created_at DESC
                LIMIT 50
            `;

            const result = await pgClient.query(query, [userId]);
            const queries = result.rows.map(row => row.query_text || '').filter(q => q);

            if (queries.length === 0) {
                return this.getDefaultConversationPatterns();
            }

            const allText = queries.join(' ').toLowerCase();
            
            return {
                productMentionRate: this.calculatePatternRate(allText, ['product', 'shampoo', 'conditioner', 'oil', 'cream']),
                experimentalLanguage: this.calculatePatternRate(allText, ['try', 'experiment', 'new', 'different']),
                routineKeywords: this.calculatePatternRate(allText, ['routine', 'daily', 'regular', 'usually']),
                simplificityKeywords: this.calculatePatternRate(allText, ['simple', 'easy', 'quick', 'basic']),
                basicQuestionWords: this.calculatePatternRate(allText, ['what', 'how', 'why', 'when', 'where']),
                helpSeekingLanguage: this.calculatePatternRate(allText, ['help', 'advice', 'guide', 'suggest']),
                learningKeywords: this.calculatePatternRate(allText, ['learn', 'understand', 'explain', 'teach']),
                problemLanguage: this.calculatePatternRate(allText, ['problem', 'issue', 'trouble', 'wrong']),
                solutionKeywords: this.calculatePatternRate(allText, ['fix', 'solve', 'solution', 'resolve']),
                specificIssues: this.countSpecificIssues(allText)
            };

        } catch (error) {
            console.error('Error getting conversation patterns:', error);
            return this.getDefaultConversationPatterns();
        }
    }

    /**
     * Calculate pattern rate in text
     */
    calculatePatternRate(text, keywords) {
        const words = text.split(/\s+/);
        const matches = keywords.reduce((count, keyword) => {
            return count + (text.split(keyword).length - 1);
        }, 0);
        
        return words.length > 0 ? matches / words.length : 0;
    }

    /**
     * Count specific hair issues mentioned
     */
    countSpecificIssues(text) {
        const issues = ['dryness', 'breakage', 'dandruff', 'frizz', 'thinning', 'damage', 'split ends'];
        return issues.reduce((count, issue) => {
            return count + (text.includes(issue) ? 1 : 0);
        }, 0);
    }

    /**
     * Get default conversation patterns for new users
     */
    getDefaultConversationPatterns() {
        return {
            productMentionRate: 0.1,
            experimentalLanguage: 0.1,
            routineKeywords: 0.1,
            simplificityKeywords: 0.1,
            basicQuestionWords: 0.3,
            helpSeekingLanguage: 0.2,
            learningKeywords: 0.2,
            problemLanguage: 0.1,
            solutionKeywords: 0.1,
            specificIssues: 0
        };
    }

    /**
     * Enhance response with technical details for hair enthusiasts
     */
    async enhanceWithTechnicalDetails(response, context) {
        // Add more scientific explanations and ingredient details
        // This would involve modifying the response content to include more technical information
        return response;
    }

    /**
     * Make response concise and actionable for busy professionals
     */
    async makeConciseAndActionable(response) {
        // Simplify language, focus on quick steps and time-efficient solutions
        return response;
    }

    /**
     * Add educational support for beginners
     */
    async addEducationalSupport(response) {
        // Include more explanations, definitions, and step-by-step guidance
        return response;
    }

    /**
     * Focus on problem-solution approach
     */
    async focusOnProblemSolution(response, context) {
        // Restructure to clearly identify problems and provide targeted solutions
        return response;
    }

    /**
     * Add maintenance encouragement
     */
    async addMaintenanceEncouragement(response) {
        // Include positive reinforcement and minor optimization suggestions
        return response;
    }

    /**
     * Add personal touches based on user context
     */
    async addPersonalTouches(response, context) {
        // Add user's name, reference their hair type, acknowledge their journey stage
        return response;
    }

    /**
     * Track personalization metrics
     */
    async trackPersonalizationMetrics(userId, persona, query, response) {
        try {
            const query_text = `
                INSERT INTO personalization_metrics (
                    user_id, persona_assigned, query_length, response_length, 
                    personalization_applied, created_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())
            `;

            await pgClient.query(query_text, [
                userId,
                persona,
                query.length,
                JSON.stringify(response).length,
                true
            ]);

        } catch (error) {
            console.error('Error tracking personalization metrics:', error);
        }
    }

    /**
     * Get recent hair issues for context
     */
    async getRecentHairIssues(userId) {
        try {
            const query = `
                SELECT issue_description 
                FROM hair_issues 
                WHERE user_id = $1 
                ORDER BY created_at DESC 
                LIMIT 3
            `;
            
            const result = await pgClient.query(query, [userId]);
            return result.rows.map(row => row.issue_description);
        } catch (error) {
            return [];
        }
    }

    /**
     * Get user preferences
     */
    async getUserPreferences(userId) {
        try {
            // This could be extended to store explicit user preferences
            return {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Get last active time
     */
    async getLastActiveTime(userId) {
        try {
            const query = `
                SELECT MAX(created_at) as last_active 
                FROM user_journey_events 
                WHERE user_id = $1
            `;
            
            const result = await pgClient.query(query, [userId]);
            return result.rows[0]?.last_active;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get preferred time of day based on usage patterns
     */
    async getPreferredTimeOfDay(userId) {
        try {
            const query = `
                SELECT 
                    EXTRACT(hour FROM created_at) as hour,
                    COUNT(*) as usage_count
                FROM user_journey_events 
                WHERE user_id = $1 
                GROUP BY EXTRACT(hour FROM created_at)
                ORDER BY usage_count DESC
                LIMIT 1
            `;
            
            const result = await pgClient.query(query, [userId]);
            return result.rows[0]?.hour;
        } catch (error) {
            return null;
        }
    }
}

module.exports = PersonalizationEngine;