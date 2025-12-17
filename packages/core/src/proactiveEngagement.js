// proactiveEngagement.js - Proactive user engagement and follow-up system
const { pgClient, redisClient } = require('./database');

class ProactiveEngagementManager {
    constructor() {
        // Define engagement triggers and their conditions
        this.engagementTriggers = {
            'welcome_followup': {
                delay: 24 * 60 * 60 * 1000, // 24 hours
                condition: 'first_interaction_completed',
                message_template: 'welcome_followup_template'
            },
            'hair_analysis_followup': {
                delay: 3 * 24 * 60 * 60 * 1000, // 3 days
                condition: 'hair_analysis_completed',
                message_template: 'analysis_followup_template'
            },
            'product_recommendation_followup': {
                delay: 7 * 24 * 60 * 60 * 1000, // 7 days
                condition: 'product_recommended',
                message_template: 'product_followup_template'
            },
            'inactive_user_reengagement': {
                delay: 14 * 24 * 60 * 60 * 1000, // 14 days
                condition: 'user_inactive',
                message_template: 'reengagement_template'
            },
            'seasonal_hair_tips': {
                delay: 30 * 24 * 60 * 60 * 1000, // 30 days
                condition: 'seasonal_change',
                message_template: 'seasonal_tips_template'
            }
        };

        // Message templates for different engagement scenarios
        this.messageTemplates = {
            'welcome_followup_template': {
                "messageType": "html",
                "message": "<html><head><style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}i{font-style:italic;color:#4a4d68;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}</style></head><body><p>Hi there! 👋 I hope you're doing well! <i>I wanted to check in and see how your hair journey is going.</i></p><p>Have you had a chance to try any of the suggestions we discussed? I'm here if you have any questions or want to explore your hair care routine further!</p><p><span class='highlight'>What would you like to focus on today?</span></p></body></html>",
                "metadata": {
                    "templateId": "6",
                    "contentType": "300",
                    "payload": [
                        {"title": "Hair Analysis", "message": "I'd like a hair analysis"},
                        {"title": "Product Recommendations", "message": "Show me product recommendations"},
                        {"title": "Hair Tips", "message": "Give me hair care tips"}
                    ]
                }
            },
            'analysis_followup_template': {
                "messageType": "html", 
                "message": "<html><head><style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}i{font-style:italic;color:#4a4d68;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}</style></head><body><p>How's your hair feeling after our analysis? <i>I'd love to hear about your progress!</i></p><p>Have you noticed any improvements? Any new questions or concerns that have come up?</p><p><span class='highlight'>Let me know how I can continue to support your hair journey!</span></p></body></html>"
            },
            'product_followup_template': {
                "messageType": "html",
                "message": "<html><head><style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}i{font-style:italic;color:#4a4d68;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}</style></head><body><p>Just checking in! <i>How are those product recommendations working out for you?</i></p><p>I'd love to hear your thoughts and help you fine-tune your routine if needed. Your feedback helps me provide even better recommendations!</p></body></html>"
            },
            'reengagement_template': {
                "messageType": "html",
                "message": "<html><head><style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}i{font-style:italic;color:#4a4d68;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}</style></head><body><p>I miss chatting with you! <i>Your hair journey is important, and I'm here whenever you're ready to continue.</i></p><p>Whether you need a quick tip, product advice, or just want to check in about your routine - <span class='highlight'>I'm always here to help!</span></p></body></html>",
                "metadata": {
                    "templateId": "6", 
                    "contentType": "300",
                    "payload": [
                        {"title": "Quick Hair Tip", "message": "Give me a quick hair tip"},
                        {"title": "Check My Progress", "message": "Help me check my hair progress"},
                        {"title": "What's New", "message": "What's new in hair care?"}
                    ]
                }
            },
            'seasonal_tips_template': {
                "messageType": "html",
                "message": "<html><head><style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}i{font-style:italic;color:#4a4d68;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}</style></head><body><p>The seasons are changing, and so are your hair's needs! <i>I have some great seasonal tips that could help your routine.</i></p><p><span class='highlight'>Ready for some personalized seasonal advice?</span></p></body></html>"
            }
        };
    }

    /**
     * Schedule proactive engagement based on user activity
     */
    async scheduleEngagement(userId, triggerType, contextData = {}) {
        try {
            const trigger = this.engagementTriggers[triggerType];
            if (!trigger) {
                console.warn(`Unknown trigger type: ${triggerType}`);
                return false;
            }

            // Check if user has preferences against proactive messages
            const userPreferences = await this.getUserEngagementPreferences(userId);
            if (userPreferences && !userPreferences.allow_proactive_messages) {
                console.log(`User ${userId} has opted out of proactive messages`);
                return false;
            }

            // Calculate when to send the message
            const scheduledTime = new Date(Date.now() + trigger.delay);

            // Store the scheduled engagement
            const query = `
                INSERT INTO proactive_engagement_schedule (
                    user_id, trigger_type, scheduled_time, context_data, created_at
                ) VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (user_id, trigger_type) 
                DO UPDATE SET scheduled_time = $3, context_data = $4
            `;

            await pgClient.query(query, [
                userId,
                triggerType,
                scheduledTime,
                JSON.stringify(contextData)
            ]);

            console.log(`Scheduled ${triggerType} engagement for user ${userId} at ${scheduledTime}`);
            return true;

        } catch (error) {
            console.error('Error scheduling engagement:', error);
            return false;
        }
    }

    /**
     * Process due engagements (should be called periodically)
     */
    async processDueEngagements() {
        try {
            // Get all engagements that are due
            const query = `
                SELECT * FROM proactive_engagement_schedule 
                WHERE scheduled_time <= NOW() 
                  AND sent = false 
                  AND active = true
                ORDER BY scheduled_time ASC
                LIMIT 100
            `;

            const result = await pgClient.query(query);
            const dueEngagements = result.rows;

            console.log(`Processing ${dueEngagements.length} due engagements`);

            for (const engagement of dueEngagements) {
                await this.sendProactiveMessage(engagement);
            }

            return dueEngagements.length;

        } catch (error) {
            console.error('Error processing due engagements:', error);
            return 0;
        }
    }

    /**
     * Send a proactive message to a user
     */
    async sendProactiveMessage(engagement) {
        try {
            const { user_id, trigger_type, context_data } = engagement;
            const trigger = this.engagementTriggers[trigger_type];
            const messageTemplate = this.messageTemplates[trigger.message_template];

            if (!messageTemplate) {
                console.error(`No message template found for ${trigger.message_template}`);
                return false;
            }

            // Personalize the message based on user context
            const personalizedMessage = await this.personalizeMessage(
                messageTemplate, 
                user_id, 
                JSON.parse(context_data || '{}')
            );

            // Here you would integrate with your messaging system (Kommunicate, etc.)
            // For now, we'll just log and mark as sent
            console.log(`Sending proactive message to user ${user_id}:`, personalizedMessage);

            // Mark as sent in database
            await pgClient.query(
                `UPDATE proactive_engagement_schedule SET sent = true, sent_at = NOW() WHERE id = $1`,
                [engagement.id]
            );

            // Log the engagement
            await this.logEngagementSent(user_id, trigger_type, personalizedMessage);

            return true;

        } catch (error) {
            console.error('Error sending proactive message:', error);
            return false;
        }
    }

    /**
     * Personalize message template based on user data
     */
    async personalizeMessage(messageTemplate, userId, contextData) {
        try {
            // Get user details for personalization
            const userQuery = `SELECT name, hair_type, hair_concerns FROM users WHERE user_id = $1`;
            const userResult = await pgClient.query(userQuery, [userId]);
            const user = userResult.rows[0];

            // Clone the template
            let personalizedTemplate = JSON.parse(JSON.stringify(messageTemplate));

            // Replace placeholders in message content
            if (personalizedTemplate.message && user) {
                let messageContent = personalizedTemplate.message;

                // Add user name if available
                if (user.name) {
                    messageContent = messageContent.replace(/Hi there!/g, `Hi ${user.name}!`);
                }

                // Add hair-specific context
                if (user.hair_type) {
                    messageContent = messageContent.replace(/your hair/g, `your ${user.hair_type} hair`);
                }

                personalizedTemplate.message = messageContent;
            }

            return personalizedTemplate;

        } catch (error) {
            console.error('Error personalizing message:', error);
            return messageTemplate; // Return original if personalization fails
        }
    }

    /**
     * Get user engagement preferences
     */
    async getUserEngagementPreferences(userId) {
        try {
            const query = `
                SELECT engagement_preferences 
                FROM user_preferences 
                WHERE user_id = $1
            `;
            
            const result = await pgClient.query(query, [userId]);
            return result.rows[0]?.engagement_preferences || null;

        } catch (error) {
            console.error('Error getting user engagement preferences:', error);
            return null;
        }
    }

    /**
     * Log engagement sent for analytics
     */
    async logEngagementSent(userId, triggerType, message) {
        try {
            const query = `
                INSERT INTO proactive_engagement_history (
                    user_id, campaign_id, message_sent, delivery_status, created_at
                ) VALUES ($1, 
                    (SELECT id FROM proactive_campaigns WHERE campaign_name = $2 LIMIT 1),
                    $3, 'sent', NOW())
            `;

            await pgClient.query(query, [userId, triggerType, JSON.stringify(message)]);

        } catch (error) {
            console.error('Error logging engagement sent:', error);
        }
    }

    /**
     * Track user response to proactive message
     */
    async trackProactiveResponse(userId, triggerType, userResponse, engagementScore = 1.0) {
        try {
            const query = `
                UPDATE proactive_engagement_history 
                SET user_response = $3, engagement_score = $4, responded_at = NOW(),
                    delivery_status = 'responded'
                WHERE user_id = $1 
                  AND campaign_id = (SELECT id FROM proactive_campaigns WHERE campaign_name = $2 LIMIT 1)
                  AND responded_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
            `;

            await pgClient.query(query, [userId, triggerType, userResponse, engagementScore]);
            console.log(`Tracked proactive response for user ${userId}, trigger ${triggerType}`);

        } catch (error) {
            console.error('Error tracking proactive response:', error);
        }
    }

    /**
     * Get engagement statistics
     */
    async getEngagementStats(days = 30) {
        try {
            const query = `
                SELECT 
                    c.campaign_name,
                    COUNT(h.id) as messages_sent,
                    COUNT(h.user_response) as responses_received,
                    ROUND(AVG(h.engagement_score), 2) as avg_engagement_score,
                    ROUND(
                        COUNT(h.user_response)::float / NULLIF(COUNT(h.id), 0) * 100, 2
                    ) as response_rate
                FROM proactive_campaigns c
                LEFT JOIN proactive_engagement_history h ON c.id = h.campaign_id
                WHERE h.created_at >= NOW() - INTERVAL '${days} days' OR h.created_at IS NULL
                GROUP BY c.id, c.campaign_name
                ORDER BY response_rate DESC
            `;

            const result = await pgClient.query(query);
            return result.rows;

        } catch (error) {
            console.error('Error getting engagement stats:', error);
            return [];
        }
    }

    /**
     * Opt user out of proactive messages
     */
    async optOutUser(userId) {
        try {
            const query = `
                INSERT INTO user_preferences (user_id, engagement_preferences)
                VALUES ($1, '{"allow_proactive_messages": false}')
                ON CONFLICT (user_id)
                DO UPDATE SET 
                    engagement_preferences = jsonb_set(
                        COALESCE(user_preferences.engagement_preferences, '{}'),
                        '{allow_proactive_messages}',
                        'false'
                    ),
                    updated_at = NOW()
            `;

            await pgClient.query(query, [userId]);
            
            // Deactivate scheduled engagements
            await pgClient.query(
                `UPDATE proactive_engagement_schedule SET active = false WHERE user_id = $1`,
                [userId]
            );

            console.log(`User ${userId} opted out of proactive messages`);
            return true;

        } catch (error) {
            console.error('Error opting out user:', error);
            return false;
        }
    }

    /**
     * Opt user back in to proactive messages
     */
    async optInUser(userId) {
        try {
            const query = `
                INSERT INTO user_preferences (user_id, engagement_preferences)
                VALUES ($1, '{"allow_proactive_messages": true}')
                ON CONFLICT (user_id)
                DO UPDATE SET 
                    engagement_preferences = jsonb_set(
                        COALESCE(user_preferences.engagement_preferences, '{}'),
                        '{allow_proactive_messages}',
                        'true'
                    ),
                    updated_at = NOW()
            `;

            await pgClient.query(query, [userId]);
            console.log(`User ${userId} opted in to proactive messages`);
            return true;

        } catch (error) {
            console.error('Error opting in user:', error);
            return false;
        }
    }
}

module.exports = ProactiveEngagementManager;