// unifiedChatHandlerFallback.js - Complete fallback implementation
const { genkit, z } = require('genkit');

class UnifiedChatHandlerFallback {
    constructor(config) {
        console.log('⚠️ Using UnifiedChatHandler fallback implementation');
        this.packageName = config.packageName || 'myavana';
        this.logger = config.logger || console;
        this.validator = config.validator;
        this.analytics = config.analytics;
        this.ai = config.ai;
        
        // Emergency response template
        this.emergencyResponse = {
            messageType: 'html',
            message: '<html><head><style>body{font-family:\'Archivo\',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:\'Archivo Expanded Black\',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}</style></head><body><p>I\'m here to help with your hair care journey! Let me assist you with information about <span class="highlight">MYAVANA\'s services</span>.</p></body></html>',
            metadata: {
                contentType: '300',
                templateId: '12',
                payload: [
                    { title: 'Tell me about HairAI™', message: 'What is HairAI™?' },
                    { title: 'Book a consultation', message: 'How do I book a consultation?' },
                    { title: 'My hair type', message: 'Help me find my hair type' }
                ]
            }
        };
    }

    async handleRequest(req, res) {
        try {
            const startTime = Date.now();
            
            // Basic validation
            if (!req.body || !req.body.message) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid request: missing message'
                });
            }

            const { userId, message, conversationId } = req.body;
            
            this.logger.info('Fallback handler processing request', {
                userId,
                conversationId,
                messageLength: message.length
            });

            // Simple response logic based on keywords
            let response = this.getResponseForQuery(message);

            // Track if analytics available
            if (this.analytics) {
                await this.analytics.trackUserMessage(userId, conversationId, message);
                await this.analytics.trackAIResponse(
                    userId,
                    conversationId,
                    response,
                    'fallback',
                    Date.now() - startTime,
                    false
                );
            }

            // Send response
            res.json({
                success: true,
                response: response,
                metadata: {
                    model: 'fallback',
                    cached: false,
                    processingTime: Date.now() - startTime
                }
            });

        } catch (error) {
            this.logger.error('Fallback handler error:', error);
            
            res.status(500).json({
                error: true,
                response: this.emergencyResponse
            });
        }
    }

    getResponseForQuery(query) {
        const queryLower = query.toLowerCase();
        
        // HairAI™ queries
        if (queryLower.includes('hairai') || queryLower.includes('hair ai')) {
            return {
                messageType: 'html',
                message: '<html><head><style>body{font-family:\'Archivo\',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:\'Archivo Expanded Black\',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}</style></head><body><p><span class="highlight">HairAI™</span> is MYAVANA\'s revolutionary AI-powered hair analysis technology!</p><p>Simply upload a photo of your hair, and our advanced AI will:</p><ul><li>Identify your unique hair type and texture</li><li>Analyze your hair\'s current condition</li><li>Provide personalized product recommendations</li><li>Create a custom hair care routine just for you</li></ul><p><i>Ready to discover your hair\'s full potential?</i></p></body></html>',
                metadata: {
                    contentType: '300',
                    templateId: '12',
                    payload: [
                        { title: 'Start HairAI™ analysis', message: 'I want to try HairAI™ analysis' },
                        { title: 'How accurate is it?', message: 'How accurate is HairAI™?' },
                        { title: 'See sample results', message: 'Show me sample HairAI™ results' }
                    ]
                }
            };
        }
        
        // Hair type queries
        if (queryLower.includes('hair type') || queryLower.includes('texture')) {
            return {
                messageType: 'html',
                message: '<html><head><style>body{font-family:\'Archivo\',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:\'Archivo Expanded Black\',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}</style></head><body><p>Understanding your <span class="highlight">hair type</span> is the first step to great hair care!</p><p>Hair types are classified as:</p><ul><li><strong>Type 1:</strong> Straight hair</li><li><strong>Type 2:</strong> Wavy hair (2A, 2B, 2C)</li><li><strong>Type 3:</strong> Curly hair (3A, 3B, 3C)</li><li><strong>Type 4:</strong> Coily/Kinky hair (4A, 4B, 4C)</li></ul><p><i>Want me to help you identify your specific hair type?</i></p></body></html>',
                metadata: {
                    contentType: '300',
                    templateId: '12',
                    payload: [
                        { title: 'Find my hair type', message: 'Help me identify my hair type' },
                        { title: 'Upload a photo', message: 'Can I upload a photo for analysis?' },
                        { title: 'Type 3 hair care', message: 'Tell me about Type 3 hair care' }
                    ]
                }
            };
        }
        
        // Consultation queries
        if (queryLower.includes('consultation') || queryLower.includes('expert') || queryLower.includes('book')) {
            return {
                messageType: 'html',
                message: '<html><head><style>body{font-family:\'Archivo\',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:\'Archivo Expanded Black\',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}</style></head><body><p>Our <span class="highlight">Virtual Consultations</span> connect you with certified hair care experts!</p><p>During your personalized session, you\'ll:</p><ul><li>Get expert analysis of your hair concerns</li><li>Receive a customized hair care plan</li><li>Learn professional styling techniques</li><li>Ask all your hair questions</li></ul><p><i>Ready to book your transformation session?</i></p></body></html>',
                metadata: {
                    contentType: '300',
                    templateId: '12',
                    payload: [
                        { title: 'Book now', message: 'Book a virtual consultation' },
                        { title: 'Consultation pricing', message: 'How much does a consultation cost?' },
                        { title: 'What to expect', message: 'What happens during a consultation?' }
                    ]
                }
            };
        }
        
        // Default response
        return {
            messageType: 'html',
            message: '<html><head><style>body{font-family:\'Archivo\',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:\'Archivo Expanded Black\',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}</style></head><body><p>I\'m Mya, your <span class="highlight">MYAVANA</span> hair care assistant! I\'m here to help you discover your best hair ever.</p><p>I can help you with:</p><ul><li>Finding your hair type</li><li>Personalized product recommendations</li><li>Creating a custom hair routine</li><li>Booking expert consultations</li></ul><p><i>What would you like to know about your hair today?</i></p></body></html>',
            metadata: {
                contentType: '300',
                templateId: '12',
                payload: [
                    { title: 'Find my hair type', message: 'What\'s my hair type?' },
                    { title: 'Product recommendations', message: 'Recommend products for me' },
                    { title: 'Learn about HairAI™', message: 'Tell me about HairAI™' }
                ]
            }
        };
    }

    // Initialize flows (minimal implementation)
    initializeFlows() {
        this.chatFlow = async (input) => {
            return {
                response: this.getResponseForQuery(input.query),
                model: 'fallback',
                cached: false,
                processingTime: 100
            };
        };
    }
}

module.exports = UnifiedChatHandlerFallback;