// eventHandlers.js
// const {DatabaseSessionStore} = require("myavana-bot-test-core");
const core = require('myavana-bot-test-core');
const OpenAI = require('openai');
const {saveConversation, generateConversationSummary, getHairIssuesForUser, getChatbotWelcomeSettings} = require("myavana-bot-test-core");
const {imageAnalysisPrompt} = require("./constructPrompt");
const {postProcessConversation, updateUserProfile} = require("myavana-bot-test-core");
const {saveHairIssue} = require("myavana-bot-test-core");
const format = require("html-format");
require('dotenv').config();

let openai;
try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ OpenAI client initialized for event handlers');
    } else {
        console.warn('⚠️ WARNING: OPENAI_API_KEY not found, image analysis may be limited');
    }
} catch (error) {
    console.error('❌ Failed to initialize OpenAI client for event handlers:', error);
}

const handleWelcomeEvent = async (res, userId) => {
    const defaultWelcomeMessage = "<html><head><style>body{font-family:'Archivo',sans-serif;}h3{font-size:1.0em;font-weight:600;color:#222323;}p{color:#222323;font-size:0.9em;line-height:1.5;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}</style></head><body><p><i>Hey there, beautiful! 👋 I'm Mya, your</i> <span class='highlight'>MYAVANA Hair AI</span> guide! I'm here to help you understand your hair and get the best recommendations. How can I assist you today?</p></body></html>";

    const buildWelcomeMessage = (text) => {
        if (!text) return defaultWelcomeMessage;
        const safeText = String(text).replace(/\n/g, '<br />');
        
        return `<html><head><style>body{font-family:'Archivo',sans-serif;}h3{font-size:1.0em;font-weight:600;color:#222323;}p{color:#222323;font-size:0.9em;line-height:1.5;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}</style></head><body><p>${safeText}</p></body></html>`;
    };

    const normalizeImages = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter(Boolean);
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
            } catch (error) {
                return [];
            }
        }
        return [];
    };

    let welcomeSettings = null;
    try {
        welcomeSettings = await getChatbotWelcomeSettings();
    } catch (error) {
        console.warn('⚠️ Failed to load welcome settings:', error.message);
    }

    const welcomeImages = normalizeImages(welcomeSettings?.image_urls);
    const welcomeText = welcomeSettings?.welcome_text || null;

    const headerImage = welcomeImages[0] || "https://cdn.shopify.com/s/files/1/0890/7956/files/IMG_4043.webp";
    const fallbackImages = [
        "https://cdn.shopify.com/s/files/1/0890/7956/files/pic13.jpg",
        "https://cdn.shopify.com/s/files/1/0890/7956/files/Consultation.jpg",
        "https://cdn.shopify.com/s/files/1/0890/7956/files/image-asset_10.png",
        "https://pbs.twimg.com/media/E0-9K5kWQAEDTuG.jpg",
        "https://cdn.shopify.com/s/files/1/0890/7956/files/image-asset_10.png"
    ];

    const getImage = (index) => welcomeImages[index + 1] || fallbackImages[index];

    const welcome = [{
        "messageType": "html",
        "metadata": {
            "templateId": "7",
            "payload": {
                "headerImgSrc": headerImage,
                "elements": [
                    {
                        "imgSrc": getImage(0),
                        "title": "MYAVANA Company",
                        "description": "Learn about the company’s mission, vision, core values and Team MYAVANA. Explore to view MYAVANA Moments.",
                        "action": {
                            "type": "quick_reply",
                            "text": "What is MYAVANA?"
                        }
                    },
                    {
                        "imgSrc": getImage(1),
                        "action": {
                            "text": "What is MYAVANA SI?",
                            "type": "quick_reply"
                        },
                        "description": "Learn about our Scientific Intelligence Analysis Lab. We analyze your hair strands providing you with a personalized healthy hair care plan with the best products for your unique hair texture, type & condition. We also analyze product ingredients, quality and best usage. Explore here for MYAVANA Case Studies.",
                        "title": "MYAVANA SI"
                    },
                    {
                        "imgSrc": getImage(2),
                        "action": {
                            "type": "quick_reply",
                            "text": "What is MYAVANA HAIR AI Technology?"
                        },
                        "title": "MYAVANA AI",
                        "description": "Learn about your current hair texture & type and receive instant results in a few seconds including product recommendations through HAIR AI Technology. Explore here to experience MYAVANA HAIR AI with Instant Results."
                    },
                    {
                        "imgSrc": getImage(3),
                        "description": "Learn about your journey to hair nirvana …. Because We C.A.R.E. We Consult. Analyze. Recommend. Educate. Beginning with a digital assessment, or you can book a virtual consultation. Explore here for MYAVANA Healthy Hair Tips.",
                        "action": {
                            "type": "quick_reply",
                            "text": "What is the MYAVANA C.A.R.E System?"
                        },
                        "title": "MYAVANA C.A.R.E. System"
                    },
                    {
                        "imgSrc": getImage(4),
                        "title": "Ask my own question",
                        "action": {
                            "text": "Ask my own question",
                            "type": "quick_reply"
                        },
                        "description": "Got a burning question about your hair? Candace is here to help!"
                    }
                ],
                "headerText": "Myavana Menu"
            },
            "contentType": "300"
        },
        "message": buildWelcomeMessage(welcomeText),
        "platform": "kommunicate"
    }];
    res.json(welcome);
    return core.ai.createSession({
        initialState: {
            userId: userId,
        },
        store: new core.DatabaseSessionStore(),
        sessionId: userId
    });
};



const handleImageMessage1 = async (eventName, metadata, userId, conversationId, chatHistory, res, message) => {
    const mediaType = metadata?.KM_CHAT_CONTEXT?.attachments[0]?.type || '';
    if (mediaType.startsWith("image/")) {
        const fileUrl = metadata?.KM_CHAT_CONTEXT?.attachments[0]?.payload?.url || '';
        if (fileUrl) {
            try {
                if (!openai) {
                    console.warn('⚠️ OpenAI client not available, skipping image analysis');
                    return false; // Skip image processing
                }
                
                const analysisPrompt = imageAnalysisPrompt();
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: `${analysisPrompt} \n\n User's Text Input: ${message}` }, // Combine prompt with user's text
                                {
                                    type: "image_url",
                                    image_url: {
                                        "url": fileUrl,
                                    },
                                },
                            ],
                        },
                    ],
                    store: true,
                });

                //console.log(response.choices[0].message.content);
                const analysisText = response.choices[0].message.content;
                console.log('image analysis output:', analysisText)
                const resp = [ {
                    "messageType": "html",
                    "message": analysisText
                    //"message": `<html><head><link href='https://db.onlinewebfonts.com/c/79e533eca247728ccfc8113ddc2c56ca?family=Archivo+Expanded+Medium' rel='stylesheet' type='text/css'><link href='https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&display=swap' rel='stylesheet'><style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}i{font-style:italic;color:#4a4d68;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}</style></head><body><p>${analysisText}</p></body></html>`
                }
                ]
                // Send response to user
                res.json(resp);
                // Add user and bot messages to chat history
                chatHistory.push({ role: 'user', content: `User uploaded an image: ${fileUrl}, and said: ${message}` });
                chatHistory.push({ role: 'assistant', content: analysisText });
                const postProcessData = await postProcessConversation(chatHistory, message);
                console.log("Post-processed data:", JSON.stringify(postProcessData));

                if (postProcessData.user_profile_updates) {
                    await updateUserProfile(userId, postProcessData.user_profile_updates);
                }

                if (postProcessData.hair_issue_extractions && postProcessData.hair_issue_extractions.hair_issues_reported && postProcessData.hair_issue_extractions.hair_issues_reported.length > 0) {
                    for (const issue of postProcessData.hair_issue_extractions.hair_issues_reported) {
                        await saveHairIssue(userId, issue, analysisText); // Or refine advice from output
                        console.log(`Hair issue reported and saved: ${issue}`);
                    }
                }

                // Save updated chat history
                await saveConversation(conversationId, userId, chatHistory, await generateConversationSummary(chatHistory));


                return true;
            } catch (imageError) {
                console.error("Error analyzing image with Gemini:", imageError);
                res.status(500).json({ message: "Sorry, I couldn't analyze your image. Please try again." });
                return true; // Indicate that the image event was handled
            }
        }
    }

    return false; // Not an image event
};
function removeHtmlCodeBlocks(text) {
    if (!text) {
      return ""; // Handle null or undefined input
    }
  
    let result = text;
  
    // Remove ```html and ``` at the beginning
    if (result.startsWith("```html")) {
      result = result.substring(7).trimStart();
    } else if (result.startsWith("```")) {
      result = result.substring(3).trimStart();
    }
  
    // Remove ``` at the end
    if (result.endsWith("```")) {
      result = result.substring(0, result.length - 3).trimEnd();
    }
  
    return result;
}
function extractHtmlFromMarkdownCodeBlock(markdownHtmlString) {
  // Check if the string starts with '```html\n'
  if (markdownHtmlString.startsWith('```html\n')) {
    // Remove '```html\n' from the beginning
    let htmlContent = markdownHtmlString.substring('```html\n'.length);

    // Check if the string ends with '```\n' or '```'
    if (htmlContent.endsWith('```\n')) {
      // Remove '```\n' from the end
      htmlContent = htmlContent.slice(0, -('```\n'.length));
    } else if (htmlContent.endsWith('```')) {
      // Remove '```' from the end
      htmlContent = htmlContent.slice(0, -('```'.length));
    }

    // Remove any trailing newline if it exists after removing the backticks
    if (htmlContent.endsWith('\n')) {
        htmlContent = htmlContent.slice(0, -1);
    }
    
    return htmlContent;
  } else {
    // If it doesn't start with the expected delimiter, return the original string
    // or handle the error as appropriate for your application
    console.warn("The provided string does not start with '```html\\n'. Returning original string.");
    return markdownHtmlString;
  }
}
const handleImageMessage = async (eventName, metadata, userId, conversationId, chatHistory, res, message, userInfo, session) => {
    console.log('🖼️ ===== IMAGE MESSAGE HANDLER START =====');
    
    const mediaType = metadata?.KM_CHAT_CONTEXT?.attachments[0]?.type || '';
    
    if (mediaType.startsWith("image/")) {
        const fileUrl = metadata?.KM_CHAT_CONTEXT?.attachments[0]?.payload?.url || '';
        
        if (fileUrl) {
            console.log('📸 Image detected:', {
                mediaType: mediaType,
                fileUrl: fileUrl.substring(0, 100) + '...',
                userId: userId
            });
            
            try {
                console.log('🔍 Fetching user hair issues...');
                const recentHairIssues = await getHairIssuesForUser(userId);
                const issueSummary = recentHairIssues.length > 0
                    ? `Recent Hair Issues: ${JSON.stringify(recentHairIssues)}`
                    : 'No recent hair issues reported.';
                
                console.log('✅ Hair issues fetched:', {
                    issueCount: recentHairIssues.length,
                    hasIssues: recentHairIssues.length > 0
                });
                
                console.log('🧠 Generating image analysis prompt...');
                const analysisPrompt = imageAnalysisPrompt(userInfo, issueSummary);
                console.log('✅ Analysis prompt generated:', {
                    promptLength: analysisPrompt.length,
                    estimatedTokens: Math.ceil(analysisPrompt.length / 4)
                });

                // ===== NEW: CACHE MANAGEMENT FOR IMAGE ANALYSIS =====
                console.log('🗄️ ===== IMAGE ANALYSIS CACHE MANAGEMENT =====');
                const cacheStartTime = performance.now();
                
                // Get database connection
                
                // Use a different cache key pattern for image analysis
                const imageCacheUserId = `${userId}_image_analysis`;
                const cacheResult = await core.cacheManager.getOrCreateCache(imageCacheUserId, analysisPrompt);
                const cacheEndTime = performance.now();
                
                console.log('📊 Image Analysis Cache Summary:', {
                    cacheName: cacheResult.cacheName,
                    isNewCache: cacheResult.isNewCache,
                    hasError: !!cacheResult.error,
                    cacheTime: (cacheEndTime - cacheStartTime).toFixed(2) + 'ms'
                });
                console.log('🗄️ ===== IMAGE ANALYSIS CACHE COMPLETE =====');

                // Use Gemini model for image analysis with caching
                console.log('🤖 Initializing Gemini for image analysis with caching...');
                const modelStartTime = performance.now();
                
                let chat;
                if (cacheResult.cacheName) {
                    console.log('✅ Using cached analysis prompt:', cacheResult.cacheName);
                    
                    chat = session.chat({
                        model: 'gemini-3.7-flash',
                        cache: cacheResult.cacheName, // Use cached system instructions
                        config: {
                            temperature: 0.9,
                        },
                        image: { url: fileUrl },
                    });
                } else {
                    console.log('⚠️ Cache unavailable, using standard chat for image analysis');
                    
                    chat = session.chat({
                        model: 'gemini-3.7-flash',
                        system: analysisPrompt, // Fallback to regular system prompt
                        config: {
                            temperature: 0.9,
                        },
                        image: { url: fileUrl },
                    });
                }
                
                const modelInitTime = performance.now() - modelStartTime;
                console.log('✅ Image analysis model initialized in', modelInitTime.toFixed(2), 'ms');
                console.log('📊 Analysis Configuration:', {
                    model: 'gemini-3.7-flash',
                    temperature: 0.9,
                    hasImage: true,
                    imageUrl: fileUrl.substring(0, 100) + '...',
                    usedCache: !!cacheResult.cacheName,
                    userMessage: message
                });
                
                console.log('📤 Sending image to Gemini for analysis...');
                const analysisStartTime = performance.now();
                
                const { text } = await chat.send(
                    `${analysisPrompt} \n\n User's Text Input: ${message}. Provided image url: ${fileUrl}`
                );
                
                const analysisTime = performance.now() - analysisStartTime;
                console.log('✅✅✅ IMAGE ANALYSIS COMPLETE!');
                console.log('📊 Analysis Stats:', {
                    analysisTime: analysisTime.toFixed(2) + 'ms',
                    responseLength: text.length,
                    estimatedTokens: Math.ceil(text.length / 4),
                    usedCache: !!cacheResult.cacheName,
                    costSavings: cacheResult.cacheName ? 'Significant (cached prompt)' : 'None'
                });

                // TASK_HJ_024: Hairstyle Inference via Gemini Multimodal Vision
                console.log('💈 [MyaOS Hairstyle Tracker] Inferring hairstyle from media pixels...');
                let inferredStyleObj = { hairstyle: 'Natural Curls', confidence: 0.90 };
                try {
                    const geminiAdapter = require('myavana-bot-test-core/src/intelligence/geminiAdapter');
                    const inferencePrompt = "Analyze this hair image and classify the active hairstyle with confidence level. Choose from: 'Box Braids', 'Natural Curls', 'Silk Press', 'Crochet Locs', 'Wig', 'Twist Out', 'Sleek Ponytail', 'Afro', 'Unknown'. Respond with a valid JSON matching the schema.";
                    const schema = {
                        type: 'object',
                        properties: {
                            hairstyle: { type: 'string' },
                            confidence: { type: 'number' }
                        },
                        required: ['hairstyle', 'confidence']
                    };
                    const inferenceRes = await geminiAdapter.generateContent(inferencePrompt, {
                        model: 'gemini-1.5-flash',
                        responseSchema: schema,
                        image: { url: fileUrl }
                    });
                    if (inferenceRes.ok) {
                        const parsed = JSON.parse(inferenceRes.text);
                        if (parsed && parsed.hairstyle) {
                            inferredStyleObj = parsed;
                            console.log('   ✅ Successfully inferred hairstyle:', inferredStyleObj);
                        }
                    }
                } catch (e) {
                    console.warn('   ⚠️ Hairstyle inference failed, using fallback:', e.message);
                }

                // Persist the inferred hairstyle in social_posts as a Hair Journey update
                try {
                    const { execFileSync } = require('child_process');
                    const path = require('path');
                    const DB_PATH = path.resolve(__dirname, '../../../../data/myaos.db');
                    
                    const postContent = `Myavana Hair Journey Update: Inferred active hairstyle is **${inferredStyleObj.hairstyle}** (Confidence: ${Math.round(inferredStyleObj.confidence * 100)}%) from uploaded hair media.`;
                    
                    const sqliteEsc = (val) => String(val).replace(/'/g, "''");
                    
                    execFileSync('sqlite3', [DB_PATH, `
                        INSERT INTO social_posts (channel, author_identity, content, ts)
                        VALUES ('hair_journey', 'user_${userId}', '${sqliteEsc(postContent)}', datetime('now'));
                    `]);
                    console.log('   ✅ Successfully persisted hairstyle update to social_posts table.');
                } catch (e) {
                    console.warn('   ⚠️ Failed to persist hairstyle to social_posts:', e.message);
                }

                console.log('🎨 Formatting HTML response...');
                const resp = [{
                    "messageType": "html",
                    "message": format(extractHtmlFromMarkdownCodeBlock(text))
                }];
                console.log('✅ Response formatted');

                console.log('📤 Sending response to user...');
                res.json(resp);
                console.log('✅ Response sent successfully');

                console.log('💾 Updating chat history...');
                chatHistory.push({ 
                    role: 'user', 
                    content: `User uploaded an image: ${fileUrl}, and said: ${message}` 
                });
                chatHistory.push({ 
                    role: 'assistant', 
                    content: text 
                });
                console.log('✅ Chat history updated');

                // Post-processing
                console.log('🔄 Starting post-processing...');
                const postProcessStartTime = performance.now();
                
                const postProcessData = await postProcessConversation(chatHistory, message);
                console.log("📊 Post-processed data:", JSON.stringify(postProcessData).substring(0, 200) + '...');

                if (postProcessData.user_profile_updates) {
                    console.log('👤 Updating user profile...');
                    await updateUserProfile(userId, postProcessData.user_profile_updates);
                    console.log('✅ User profile updated');
                }

                if (postProcessData.hair_issue_extractions && 
                    postProcessData.hair_issue_extractions.hair_issues_reported && 
                    postProcessData.hair_issue_extractions.hair_issues_reported.length > 0) {
                    
                    console.log('🔍 Saving hair issues...');
                    for (const issue of postProcessData.hair_issue_extractions.hair_issues_reported) {
                        await saveHairIssue(userId, issue, text);
                        console.log(`✅ Hair issue saved: ${issue}`);
                    }
                }

                console.log('💾 Saving conversation...');
                await saveConversation(
                    conversationId, 
                    userId, 
                    chatHistory, 
                    await generateConversationSummary(chatHistory)
                );
                
                const postProcessTime = performance.now() - postProcessStartTime;
                console.log('✅ Post-processing completed in', postProcessTime.toFixed(2), 'ms');
                
                console.log('🎉 ===== IMAGE MESSAGE HANDLER COMPLETE =====');
                console.log('📊 Total Image Processing Summary:', {
                    totalTime: (performance.now() - cacheStartTime).toFixed(2) + 'ms',
                    cacheUsed: !!cacheResult.cacheName,
                    cacheStatus: cacheResult.isNewCache ? 'Created new' : (cacheResult.cacheName ? 'Used existing' : 'Not available'),
                    analysisTime: analysisTime.toFixed(2) + 'ms',
                    postProcessTime: postProcessTime.toFixed(2) + 'ms',
                    success: true
                });

                return true;
                
            } catch (imageError) {
                console.error("❌❌❌ IMAGE ANALYSIS ERROR!");
                console.error("❌ Error details:", {
                    message: imageError.message,
                    stack: imageError.stack,
                    userId: userId,
                    imageUrl: fileUrl.substring(0, 100) + '...'
                });
                
                res.status(500).json({ 
                    message: "Sorry, I couldn't analyze your image. Please try again." 
                });
                
                console.log('🏁 ===== IMAGE MESSAGE HANDLER FAILED =====');
                return true;
            }
        }
    }

    console.log('ℹ️ Not an image event, returning false');
    return false;
};

module.exports = {
    handleWelcomeEvent,
    handleImageMessage
};