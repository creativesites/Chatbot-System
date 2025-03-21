// eventHandlers.js
const DatabaseSessionStore = require("myavana-bot-test-core");
const ai = require('myavana-bot-test-core');
const OpenAI = require('openai');
const {saveConversation, generateConversationSummary} = require("myavana-bot-test-core");
const {imageAnalysisPrompt} = require("./constructPrompt");
const {postProcessConversation, updateUserProfile} = require("myavana-bot-test-core");
const {saveHairIssue} = require("myavana-bot-test-core");
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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
    return ai.createSession({
        initialState: {
            userId: userId,
        },
        store: new DatabaseSessionStore(),
        sessionId: userId
    });
};

const handleImageMessage = async (eventName, metadata, userId, conversationId, chatHistory, res, message) => {
    const mediaType = metadata?.KM_CHAT_CONTEXT?.attachments[0]?.type || '';
    if (mediaType.startsWith("image/")) {
        const fileUrl = metadata?.KM_CHAT_CONTEXT?.attachments[0]?.payload?.url || '';
        if (fileUrl) {
            try {
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
                const resp = [ {
                    "messageType": "html",
                    "message": `<html><head><link href='https://db.onlinewebfonts.com/c/79e533eca247728ccfc8113ddc2c56ca?family=Archivo+Expanded+Medium' rel='stylesheet' type='text/css'><link href='https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&display=swap' rel='stylesheet'><style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}i{font-style:italic;color:#4a4d68;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}</style></head><body><p>${analysisText}</p></body></html>`
                }
                ]
                // Send response to user
                res.json(resp);
                // Add user and bot messages to chat history
                chatHistory.push({ role: 'user', content: `User uploaded an image: ${fileUrl}, and said: ${message}` });
                chatHistory.push({ role: 'assistant', content: analysisText });
                const postProcessData = await postProcessConversation(chatHistory, message);
                console.log("Post-processed data:", postProcessData);

                if (postProcessData.user_profile_updates) {
                    // TODO: Update user profile in database based on postProcessData.user_profile_updates
                    console.log("User profile updates to be applied:", postProcessData.user_profile_updates);
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

module.exports = {
    handleWelcomeEvent,
    handleImageMessage
};