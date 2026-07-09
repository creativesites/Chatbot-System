// eventHandlers.js - Enhanced for Sienna Naturals
const {DatabaseSessionStore} = require("myavana-bot-test-core");
const core = require('myavana-bot-test-core');
const OpenAI = require('openai');
const {saveConversation, generateConversationSummary, getHairIssuesForUser} = require("myavana-bot-test-core");
const {imageAnalysisPrompt} = require("./constructPrompt");
const {postProcessConversation, updateUserProfile} = require("myavana-bot-test-core");
const {saveHairIssue} = require("myavana-bot-test-core");
const { googleAI } = require('@genkit-ai/google-genai');
require('dotenv').config();

// Simple HTML formatter function (replacement for html-format)
function formatHtml(html) {
    if (!html || typeof html !== 'string') {
        return html;
    }
    // Basic HTML formatting - just ensure it's clean
    return html.trim();
}

let openai;
try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ OpenAI client initialized for Sienna Naturals event handlers');
    } else {
        console.warn('⚠️ WARNING: OPENAI_API_KEY not found, image analysis may be limited');
    }
} catch (error) {
    console.error('❌ Failed to initialize OpenAI client for Sienna Naturals event handlers:', error);
}
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
    console.warn("The provided string does not start with '```html\\n'. Returning original string.");
    return markdownHtmlString;
  }
}

function cleanText(text) {
    if (!text) {
      return ""; // Handle null or undefined input
    }
  
    // Remove ```html or ``` at the start and ``` at the end using regex
    text = text.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/, "");
  
    // Remove excessive newlines (more than two consecutive)
    text = text.replace(/\n{3,}/g, "\n\n");
  
    // Trim leading and trailing spaces
    return text.trim();
}

const handleWelcomeEvent = async (res, userId) => {
    //get username if available
    const welcome = [{
        "metadata": {
            "templateId": "10",
            "contentType": "300",
            "payload": [
                {
                    "subtitle": "Clean Haircare for Textured Hair",
                    "description": "Ready for your best hair day?",
                    "header": {
                        "imgSrc": "https://thekingdomeconomy.com/wp-content/uploads/2024/07/DNA_desktop_1600x.png.webp"
                    },
                    "title": "Welcome!",
                    "buttons": [
                        {
                            "name": "Best Sellers",
                            "action": {
                                "type": "quickReply",
                                "payload": {
                                    "message": "Discover Our Best Sellers",
                                    "title": "Best Sellers"
                                }
                            }
                        },
                        {
                            "name": "Get a Discount",
                            "action": {
                                "type": "quickReply",
                                "payload": {
                                    "message": "How can I get a discount?",
                                    "title": "Get a Discount"
                                }
                            }
                        },
                        {
                            "action": {
                                "type": "quickReply",
                                "payload": {
                                    "message": "View our Rewards program",
                                    "title": "Rewards Program"
                                }
                            },
                            "name": "Rewards Program"
                        }
                    ]
                }
            ]
        },
        "messageType": "html",
        "platform": "kommunicate",
        "message": "<html><head><style>p, li, span { font-weight: 400; font-size: 12px; line-height: 18px; letter-spacing: 0; font-family: Gotham, sans-serif; color: #20312e; } h3 { letter-spacing: 1.12px; color: #20312e; font-size: 14px; line-height: 18px; margin: 30px 0 26px; font-family: Consolas, monospace; }</style></head><body><h3>Hey there, gorgeous! 👋</h3><p>Welcome to <strong>Sienna Naturals</strong> – your go-to for clean, dermatologist-tested haircare that loves your textured hair as much as you do! Whether you're here to explore our bestsellers, get personalized tips, or just geek out about clean beauty, we’ve got you covered. How can we make your hair day even better?</p></body></html>"
    }];
    res.json(welcome);
    return core.ai.createSession({
        initialState: {
            userId: userId,
        },
        store: new DatabaseSessionStore(),
        sessionId: userId
    });
};


const handleImageMessage = async (eventName, metadata, userId, conversationId, chatHistory, res, message, userInfo, session) => {
    const mediaType = metadata?.KM_CHAT_CONTEXT?.attachments[0]?.type || '';
    if (mediaType.startsWith("image/")) {
        const fileUrl = metadata?.KM_CHAT_CONTEXT?.attachments[0]?.payload?.url || '';
        if (fileUrl) {
            try {
                // Get recent hair issues for context
                const recentHairIssues = await getHairIssuesForUser(userId);
                const issueSummary = recentHairIssues.length > 0
                    ? `Recent Hair Issues: ${JSON.stringify(recentHairIssues)}`
                    : 'No recent hair issues reported.';
                
                const analysisPrompt = imageAnalysisPrompt(userInfo, issueSummary);

                // Use GenKit's Gemini model for image analysis with session
                const chat = session.chat({
                    model: googleAI.model('gemini-3-flash-preview'),
                    config: {
                        temperature: 0.9,
                    },
                    image: { url: fileUrl },
                });
                const { text } = await chat.send(`${analysisPrompt} \n\n User's Text Input: ${message}. Provided image url: ${fileUrl}`);
                
                console.log('Sienna Naturals image analysis output:', {data: text});

                // Format the response as JSON with enhanced HTML formatting
                const resp = [{
                    "messageType": "html",
                    "message": formatHtml(extractHtmlFromMarkdownCodeBlock(text))
                }];

                // Send response to user
                res.json(resp);

                // Add user and bot messages to chat history
                chatHistory.push({ role: 'user', content: `User uploaded an image: ${fileUrl}, and said: ${message}` });
                chatHistory.push({ role: 'assistant', content: text });

                // Post-process the conversation
                const postProcessData = await postProcessConversation(chatHistory, message);
                console.log("Sienna Naturals post-processed data:", JSON.stringify(postProcessData));

                // Update user profile if needed
                if (postProcessData.user_profile_updates) {
                    await updateUserProfile(userId, postProcessData.user_profile_updates);
                }

                // Save hair issues if reported
                if (postProcessData.hair_issue_extractions && postProcessData.hair_issue_extractions.hair_issues_reported && postProcessData.hair_issue_extractions.hair_issues_reported.length > 0) {
                    for (const issue of postProcessData.hair_issue_extractions.hair_issues_reported) {
                        await saveHairIssue(userId, issue, text);
                        console.log(`Sienna Naturals hair issue reported and saved: ${issue}`);
                    }
                }

                // Save updated chat history
                await saveConversation(conversationId, userId, chatHistory, await generateConversationSummary(chatHistory));

                return true;
            } catch (imageError) {
                console.error("Error analyzing image with GenKit for Sienna Naturals:", imageError);
                res.status(500).json({ message: "Sorry, I couldn't analyze your image. Please try again." });
                return true; // Indicate that the image event was handled
            }
        }
    }

    return false; // Not an image event
};

module.exports = {
    handleWelcomeEvent,
    handleImageMessage
};