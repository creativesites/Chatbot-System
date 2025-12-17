// eventHandlers.js
const {DatabaseSessionStore} = require("myavana-bot-test-core");
const core = require('myavana-bot-test-core');
const OpenAI = require('openai');
const {saveConversation, generateConversationSummary, getHairIssuesForUser} = require("myavana-bot-test-core");
const {imageAnalysisPrompt} = require("./constructPrompt");
const {postProcessConversation, updateUserProfile} = require("myavana-bot-test-core");
const {saveHairIssue} = require("myavana-bot-test-core");
const {gemini15Flash} = require("@genkit-ai/googleai");
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
    //get username if available
    const welcome = [{
        "messageType": "html",
        "metadata": {
            "templateId": "7",
            "payload": {
                "headerImgSrc": "https://cdn.shopify.com/s/files/1/0890/7956/files/IMG_4043.webp",
                "elements": [
                    {
                        "imgSrc": "https://cdn.shopify.com/s/files/1/0890/7956/files/pic13.jpg",
                        "title": "MYAVANA Company",
                        "description": "Learn about the company’s mission, vision, core values and Team MYAVANA. Explore to view MYAVANA Moments.",
                        "action": {
                            "type": "quick_reply",
                            "text": "What is MYAVANA?"
                        }
                    },
                    {
                        "imgSrc": "https://cdn.shopify.com/s/files/1/0890/7956/files/Consultation.jpg",
                        "action": {
                            "text": "What is MYAVANA SI?",
                            "type": "quick_reply"
                        },
                        "description": "Learn about our Scientific Intelligence Analysis Lab. We analyze your hair strands providing you with a personalized healthy hair care plan with the best products for your unique hair texture, type & condition. We also analyze product ingredients, quality and best usage. Explore here for MYAVANA Case Studies.",
                        "title": "MYAVANA SI"
                    },
                    {
                        "imgSrc": "https://cdn.shopify.com/s/files/1/0890/7956/files/image-asset_10.png",
                        "action": {
                            "type": "quick_reply",
                            "text": "What is MYAVANA HAIR AI Technology?"
                        },
                        "title": "MYAVANA AI",
                        "description": "Learn about your current hair texture & type and receive instant results in a few seconds including product recommendations through HAIR AI Technology. Explore here to experience MYAVANA HAIR AI with Instant Results."
                    },
                    {
                        "imgSrc": "https://pbs.twimg.com/media/E0-9K5kWQAEDTuG.jpg",
                        "description": "Learn about your journey to hair nirvana …. Because We C.A.R.E. We Consult. Analyze. Recommend. Educate. Beginning with a digital assessment, or you can book a virtual consultation. Explore here for MYAVANA Healthy Hair Tips.",
                        "action": {
                            "type": "quick_reply",
                            "text": "What is the MYAVANA C.A.R.E System?"
                        },
                        "title": "MYAVANA C.A.R.E. System"
                    },
                    {
                        "imgSrc": "https://cdn.shopify.com/s/files/1/0890/7956/files/image-asset_10.png",
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
        "message": "<html><head><style>body{font-family:'Archivo',sans-serif;}h3{font-size:1.0em;font-weight:600;color:#222323;}p{color:#222323;font-size:0.9em;line-height:1.5;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}</style></head><body><p><i>Hey there, beautiful! 👋 I'm Mya, your</i> <span class='highlight'>MYAVANA Hair AI</span> guide! I'm here to help you understand your hair and get the best recommendations. How can I assist you today?</p></body></html>",
        "platform": "kommunicate"
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
    const mediaType = metadata?.KM_CHAT_CONTEXT?.attachments[0]?.type || '';
    if (mediaType.startsWith("image/")) {
        const fileUrl = metadata?.KM_CHAT_CONTEXT?.attachments[0]?.payload?.url || '';
        if (fileUrl) {
            try {
                const recentHairIssues = await getHairIssuesForUser(userId);
                const issueSummary = recentHairIssues.length > 0
                    ? `Recent Hair Issues: ${JSON.stringify(recentHairIssues)}`
                    : 'No recent hair issues reported.';
                const analysisPrompt = imageAnalysisPrompt(userInfo, issueSummary);

                // Use GenKit's Gemini model for image analysis
//                const chat = core.ai.chat({
//                    model: gemini15Flash, // or gemini20FlashExp
//                    config: {
//                        temperature: 0.9,
//                    },
//                    image: { url: fileUrl },
//                });
                const chat = session.chat({
                    model: gemini15Flash,
                    config: {
                        temperature: 0.9,
                    },
                    image: { url: fileUrl },
                });
                const { text } = await chat.send(`${analysisPrompt} \n\n User's Text Input: ${message}. Provided image url: ${fileUrl}`,);
                
                // console.log('Image analysis output:', {data: text});

                // Format the response as JSON
                const resp = [{
                    "messageType": "html",
                    "message": format(extractHtmlFromMarkdownCodeBlock(text))
                    //"message": `<html><head><link href='https://db.onlinewebfonts.com/c/79e533eca247728ccfc8113ddc2c56ca?family=Archivo+Expanded+Medium' rel='stylesheet' type='text/css'>
                    // <link href='https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&display=swap' rel='stylesheet'>
                    // <style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}
                    // .highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}
                    // i{font-style:italic;color:#4a4d68;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}</style></head><body><p>${text}</p></body></html>`
                }];

                // Send response to user
                res.json(resp);

                // Add user and bot messages to chat history
                chatHistory.push({ role: 'user', content: `User uploaded an image: ${fileUrl}, and said: ${message}` });
                chatHistory.push({ role: 'assistant', content: text });

                // Post-process the conversation
                const postProcessData = await postProcessConversation(chatHistory, message);
                console.log("Post-processed data:", JSON.stringify(postProcessData));

                // Update user profile if needed
                if (postProcessData.user_profile_updates) {
                    await updateUserProfile(userId, postProcessData.user_profile_updates);
                }

                // Save hair issues if reported
                if (postProcessData.hair_issue_extractions && postProcessData.hair_issue_extractions.hair_issues_reported && postProcessData.hair_issue_extractions.hair_issues_reported.length > 0) {
                    for (const issue of postProcessData.hair_issue_extractions.hair_issues_reported) {
                        await saveHairIssue(userId, issue, analysisText);
                        console.log(`Hair issue reported and saved: ${issue}`);
                    }
                }

                // Save updated chat history
                await saveConversation(conversationId, userId, chatHistory, await generateConversationSummary(chatHistory));

                return true;
            } catch (imageError) {
                console.error("Error analyzing image with GenKit:", imageError);
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