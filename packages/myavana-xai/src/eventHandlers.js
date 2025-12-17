// eventHandlers.js
const { DatabaseSessionStore } = require("myavana-bot-test-core");
const core = require('myavana-bot-test-core');
const { saveConversation, generateConversationSummary, getHairIssuesForUser, postProcessConversation, updateUserProfile, saveHairIssue } = require("myavana-bot-test-core");
const { imageAnalysisPrompt } = require("./constructPrompt");
const format = require("html-format");
require('dotenv').config();

const handleWelcomeEvent = async (res, userId) => {
    const welcome = [{
        "messageType": "html",
        "message": "<html><head><style>body{font-family:'Archivo',sans-serif;}h3{font-size:1.0em;font-weight:600;color:#222323;}p{color:#222323;font-size:0.9em;line-height:1.5;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}</style></head><body><p><i>Hey there, beautiful! 👋 I'm Mya, your</i> <span class='highlight'>MYAVANA Hair AI</span> guide. I'm here to help you understand your hair and get the best recommendations. How can I assist you today?</p></body></html>"
    }];
    res.json(welcome);
    return core.ai.createSession({
        initialState: { userId },
        store: new DatabaseSessionStore(),
        sessionId: userId
    });
};

const handleWelcomeEvent_old = async (res, userId) => {
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
        "message": "<html><head><style>body{font-family:'Archivo',sans-serif;}h3{font-size:1.0em;font-weight:600;color:#222323;}p{color:#222323;font-size:0.9em;line-height:1.5;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}</style></head><body><p><i>Hey there, beautiful! 👋 I'm Mya, your</i> <span class='highlight'>MYAVANA Hair AI</span> guide. I'm here to help you understand your hair and get the best recommendations. How can I assist you today?</p></body></html>"
    }];
    res.json(welcome);
    return core.ai.createSession({
        initialState: { userId },
        store: new DatabaseSessionStore(),
        sessionId: userId
    });
};

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

const handleImageMessage = async (eventName, metadata, userId, conversationId, chatHistory, res, message, userInfo, session, xai) => {
    const mediaType = metadata?.KM_CHAT_CONTEXT?.attachments[0]?.type || '';
    if (mediaType.startsWith("image/")) {
        const fileUrl = metadata?.KM_CHAT_CONTEXT?.attachments[0]?.payload?.url || '';
        if (fileUrl) {
            try {
                const recentHairIssues = await getHairIssuesForUser(userId);
                const issueSummary = recentHairIssues.length > 0
                    ? `Recent Hair Issues: ${JSON.stringify(recentHairIssues)}`
                    : 'No recent hair issues reported.';
                const analysisPrompt = imageAnalysisPrompt(userInfo, issueSummary, chatHistory);

                // Use xAI Grok 3 for image analysis
                const response = await xai.chat.completions.create({
                    model: 'grok-2-vision-latest',
                    messages: [
                        { role: 'system', content: analysisPrompt },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: `User's Text Input: ${message}` },
                                { type: 'image_url', image_url: { url: fileUrl } },
                            ],
                        },
                    ],
                });

                const text = response.choices[0].message.content;
                console.log('image response:', text)
                const resp = [{
                    "messageType": "html",
                    "message": format(extractHtmlFromMarkdownCodeBlock(text)) // Assume Grok 3 returns HTML-compatible text
                }];

                res.json(resp);
                chatHistory.push({ role: 'user', content: `User uploaded an image: ${fileUrl}, and said: ${message}` });
                chatHistory.push({ role: 'assistant', content: text });

                const postProcessData = await postProcessConversation(chatHistory, message);
                console.log("Post-processed data:", JSON.stringify(postProcessData));

                if (postProcessData.user_profile_updates) {
                    await updateUserProfile(userId, postProcessData.user_profile_updates);
                }

                if (postProcessData.hair_issue_extractions && postProcessData.hair_issue_extractions.hair_issues_reported?.length > 0) {
                    for (const issue of postProcessData.hair_issue_extractions.hair_issues_reported) {
                        await saveHairIssue(userId, issue, text);
                        console.log(`Hair issue reported and saved: ${issue}`);
                    }
                }

                await saveConversation(conversationId, userId, chatHistory, await generateConversationSummary(chatHistory));
                return true;
            } catch (imageError) {
                console.error("Error analyzing image with xAI:", imageError);
                res.status(500).json({ message: "Sorry, I couldn't analyze your image. Please try again." });
                return true;
            }
        }
    }
    return false;
};

module.exports = {
    handleWelcomeEvent,
    handleImageMessage,
};