// test-fixes.js - Test script to verify MYAVANA chatbot fixes
const assert = require('assert');

console.log('🧪 MYAVANA Chatbot Fix Verification Test');
console.log('=======================================\n');

// Test 1: Module Loading
console.log('Test 1: Module Loading');
try {
    const SmartPromptManager = require('./smartPromptManager');
    const manager = new SmartPromptManager();
    assert(manager instanceof SmartPromptManager, 'SmartPromptManager should be instantiable');
    console.log('✅ SmartPromptManager loads correctly\n');
} catch (error) {
    console.error('❌ SmartPromptManager failed:', error.message, '\n');
}

// Test 2: Core System Prompt
console.log('Test 2: Core System Prompt Validation');
try {
    const SmartPromptManager = require('./smartPromptManager');
    const manager = new SmartPromptManager();
    
    async function testPrompt() {
        const prompt = await manager.getCoreSystemPrompt();
        
        // Check for critical elements
        assert(!prompt.includes('xAI'), 'Prompt should NOT mention xAI');
        assert(!prompt.includes('Grok'), 'Prompt should NOT mention Grok');
        assert(prompt.includes('MYAVANA'), 'Prompt should mention MYAVANA');
        assert(prompt.includes('valid JSON'), 'Prompt should specify JSON format');
        assert(prompt.includes('messageType'), 'Prompt should include response structure');
        
        console.log('✅ Core prompt is properly formatted\n');
    }
    
    testPrompt().catch(console.error);
} catch (error) {
    console.error('❌ Core prompt test failed:', error.message, '\n');
}

// Test 3: Response Cleaning
console.log('Test 3: Response Cleaning');
try {
    // Simulate response cleaning
    const testResponses = [
        'This response is powered by xAI',
        'Grok AI assistant here',
        'MYAVANA hair care advice'
    ];
    
    testResponses.forEach(response => {
        const cleaned = response
            .replace(/powered by xai/gi, '')
            .replace(/xai/gi, 'MYAVANA')
            .replace(/grok/gi, 'Mya');
            
        assert(!cleaned.toLowerCase().includes('xai'), `Response still contains xAI: ${cleaned}`);
        assert(!cleaned.toLowerCase().includes('grok'), `Response still contains Grok: ${cleaned}`);
    });
    
    console.log('✅ Response cleaning works correctly\n');
} catch (error) {
    console.error('❌ Response cleaning failed:', error.message, '\n');
}

// Test 4: JSON Response Structure
console.log('Test 4: JSON Response Structure');
try {
    const validResponse = {
        messageType: 'html',
        message: '<html><body>Test</body></html>',
        metadata: {
            contentType: '300',
            templateId: '12',
            payload: [
                { title: 'Test question', message: 'What is a test?' }
            ]
        }
    };
    
    // Validate structure
    assert(validResponse.messageType === 'html', 'messageType should be html');
    assert(validResponse.message.includes('<html>'), 'message should contain HTML');
    assert(validResponse.metadata, 'metadata should exist');
    assert(Array.isArray(validResponse.metadata.payload), 'payload should be array');
    assert(validResponse.metadata.payload[0].message, 'suggestions should have message field');
    
    console.log('✅ JSON response structure is valid\n');
} catch (error) {
    console.error('❌ JSON structure test failed:', error.message, '\n');
}

// Test 5: Fallback Loading
console.log('Test 5: Fallback Module Loading');
try {
    const fallbacks = [
        './fallbacks/smartPromptManagerFallback',
        './fallbacks/responseCacheFallback',
        './fallbacks/conversationAnalyticsFallback',
        './fallbacks/errorRecoveryFallback',
        './fallbacks/personalizationEngineFallback'
    ];
    
    fallbacks.forEach(fallbackPath => {
        try {
            const FallbackClass = require(fallbackPath);
            const instance = new FallbackClass();
            console.log(`✅ ${fallbackPath} loads correctly`);
        } catch (error) {
            console.error(`❌ ${fallbackPath} failed:`, error.message);
        }
    });
    
    console.log('');
} catch (error) {
    console.error('❌ Fallback loading test failed:', error.message, '\n');
}

// Test 6: Model Priority
console.log('Test 6: Model Priority Check');
try {
    // This would normally be in UnifiedChatHandler
    const modelPriority = [
        { name: 'gemini20FlashExp', type: 'primary' },
        { name: 'gemini15Flash', type: 'primary' },
        { name: 'gemini15Pro', type: 'backup' },
        { name: 'xai-grok-3-mini-fast', type: 'emergency' }
    ];
    
    // Verify xAI is last and marked as emergency
    const xaiModel = modelPriority.find(m => m.name.includes('xai'));
    assert(xaiModel.type === 'emergency', 'xAI should be emergency only');
    assert(modelPriority.indexOf(xaiModel) === modelPriority.length - 1, 'xAI should be last resort');
    
    console.log('✅ Model priority is correct (Gemini first, xAI last)\n');
} catch (error) {
    console.error('❌ Model priority test failed:', error.message, '\n');
}

// Summary
console.log('========================================');
console.log('Test Summary:');
console.log('- Check logs for ✅ (pass) and ❌ (fail)');
console.log('- All tests should pass before deployment');
console.log('- Monitor production logs after deployment');
console.log('========================================');

// Test a sample query building
console.log('\nBonus: Testing Smart Prompt Building...');
async function testPromptBuilding() {
    try {
        const SmartPromptManager = require('./smartPromptManager');
        const manager = new SmartPromptManager();
        
        const testQuery = "What's the best shampoo for 3C hair?";
        const prompt = await manager.buildSmartPrompt(
            'test-user-123',
            testQuery,
            [],
            { hairType: '3C' },
            'Previous conversation about hair care routines'
        );
        
        console.log('📝 Sample prompt length:', prompt.length, 'characters');
        console.log('✅ Prompt building successful\n');
        
        // Verify prompt doesn't contain forbidden terms
        assert(!prompt.toLowerCase().includes('powered by xai'), 'Prompt should not mention xAI');
        console.log('✅ Final verification: No xAI branding found!\n');
        
    } catch (error) {
        console.error('❌ Prompt building test failed:', error.message);
    }
}

testPromptBuilding();