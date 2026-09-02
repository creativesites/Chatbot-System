// postResponseProcessing.js
const ai = require("./ai");
const { googleAI } = require('@genkit-ai/google-genai');
const DatabaseSessionStore = require("./session");
const { pgClient, redisClient } = require('./database');
const {generateAndSaveSummary, saveConversationSummary, saveConversation} = require("./conversation");
const {saveHairIssue} = require("./hairIssues");
const {getProductByName, addProductRecommendation} = require("./utils");
const { classifyAndSavePersona } = require("./personaClassifier");

const postProcessingPrompt = (chatHistory, message) => {
    return `
    You are a hair expert AI assistant designed to analyze user conversations and user's name and extract structured information related to hair care.

    **Task:** Analyze the following conversation history and the user's latest message to:

    1.  **Extract User Profile Parameters:** Identify any mentions of the user's name, hair characteristics, concerns, goals, habits, and preferences. Extract these as structured parameters based on the provided Zod schema for UserProfileUpdateSchema. If a parameter is not mentioned or cannot be inferred, leave it as null or optional as defined in the schema.  **Specifically, try to identify and extract the user's name if they mention it during the conversation.**

    2.  **Extract Hair Issues:** Identify any specific hair issues the user mentions in their latest message. List these issues as an array of strings in the "hair_issues_reported" field, as defined in the HairIssueExtractionSchema. If no issues are mentioned, return an empty array or null for this field as defined in the schema.

    **Conversation History:**
    ${JSON.stringify(chatHistory)}

    **User's Latest Message:**
    "${message}"
    
    **Response Schema**
    {
  "type": "OBJECT",
  "properties": {
    "user_profile_updates": {
      "type": "OBJECT",
      "properties": {
        "name": {
          "type": "STRING",
          "nullable": true
        },
        "hair_type": {
          "type": "STRING",
          "nullable": true
        },
        "hair_texture": {
          "type": "STRING",
          "nullable": true
        },
        "porosity": {
          "type": "STRING",
          "nullable": true
        },
        "elasticity": {
          "type": "STRING",
          "nullable": true
        },
        "density": {
          "type": "STRING",
          "nullable": true
        },
        "curl_pattern": {
          "type": "STRING",
          "nullable": true
        },
        "hair_color_natural": {
          "type": "STRING",
          "nullable": true
        },
        "hair_color_treated": {
          "type": "STRING",
          "nullable": true
        },
        "hair_concerns": {
          "type": "ARRAY",
          "items": {
            "type": "STRING"
          },
          "nullable": true
        },
        "hair_goals": {
          "type": "ARRAY",
          "items": {
            "type": "STRING"
          },
          "nullable": true
        },
        "hair_history_treatments": {
          "type": "ARRAY",
          "items": {
            "type": "STRING"
          },
          "nullable": true
        },
        "hair_styling_habits": {
          "type": "STRING",
          "nullable": true
        },
        "product_preferences_brands": {
          "type": "ARRAY",
          "items": {
            "type": "STRING"
          },
          "nullable": true
        },
        "product_preferences_ingredients": {
          "type": "STRING",
          "nullable": true
        },
        "journey_stage_intent": {
          "type": "STRING",
          "nullable": true
        },
        "damage_level_self_reported": {
          "type": "STRING",
          "nullable": true
        },
        "experimenting_interest": {
          "type": "BOOLEAN",
          "nullable": true
        },
        "boredom_expression": {
          "type": "BOOLEAN",
          "nullable": true
        },
        "confidence_level_inferred": {
          "type": "STRING",
          "nullable": true
        },
        "desperation_level_inferred": {
          "type": "STRING",
          "nullable": true
        }
      },
      "nullable": true
    },
    "hair_issue_extractions": {
      "type": "OBJECT",
      "properties": {
        "hair_issues_reported": {
          "type": "ARRAY",
          "items": {
            "type": "STRING"
          },
          "nullable": true
        }
      },
      "nullable": true
    }
  }
}
    `;
};


const processBotResponse = (botResponse) => {
    if (!botResponse || !Array.isArray(botResponse) || botResponse.length === 0) {
        return "No bot response received.";
    }

    let processedResponse = "";
    for (const responseItem of botResponse) {
        const messageType = responseItem.messageType;
        const message = responseItem.message;
        const metadata = responseItem.metadata;

        if (messageType === 'html') {
            // Extract plain text from HTML message (basic - can be improved for complex HTML)
            const plainText = message ? message.replace(/<[^>]*>?/gm, '').trim() : '';
            processedResponse += `Text Response: ${plainText}\n`;
        } else if (metadata && metadata.templateId) {
            const templateId = metadata.templateId;
            if (templateId === '10') { // card
                const payload = metadata.payload && metadata.payload[0];
                if (payload) {
                    processedResponse += `Service Card: ${payload.title || 'No Title'}, ${payload.subtitle || 'No Subtitle'}, URL: ${payload.buttons && payload.buttons[0] && payload.buttons[0].action && payload.buttons[0].action.payload ? payload.buttons[0].action.payload.url : 'No URL'}\n`;
                } else {
                    processedResponse += "Service Card: (No details extracted)\n";
                }
            } else if (templateId === '9') { // Image carousel
                const payload = metadata.payload;
                if (payload && Array.isArray(payload)) {
                    processedResponse += "Image Carousel: ";
                    payload.forEach((image, index) => {
                        processedResponse += `Image ${index + 1} - Caption: ${image.caption || 'No Caption'}, URL: ${image.url || 'No URL'}; `;
                    });
                    processedResponse += "\n";
                } else {
                    processedResponse += "Image Carousel: (No images extracted)\n";
                }
            } else if (templateId === '3') { // Button template
                const payload = metadata.payload && metadata.payload[0];
                if (payload) {
                    processedResponse += `Button: ${payload.name || 'No Name'}, URL: ${payload.url || 'No URL'}\n`;
                } else {
                    processedResponse += "Button: (No button details extracted)\n";
                }
            } else if (templateId === '6') { // Suggested replies
                const payload = metadata.payload;
                if (payload && Array.isArray(payload)) {
                    processedResponse += "Suggested Replies: ";
                    payload.forEach((reply, index) => {
                        processedResponse += `${reply.title || 'Reply ' + (index + 1)}; `;
                    });
                    processedResponse += "\n";
                } else {
                    processedResponse += "Suggested Replies: (No replies extracted)\n";
                }
            } else if (templateId === '7') { // List template (Welcome message)
                processedResponse += "Welcome Message Card (List Template)\n"; // Simplified for brevity
            }
            else {
                processedResponse += `Unknown Card Template (ID: ${templateId}): Message: ${message}\n`;
            }
        }
        else if (message) { // Fallback for any other message type (or just plain text if no html)
            processedResponse += `Raw Message: ${message}\n`;
        }
        else {
            processedResponse += `Unknown Response Type: No message content found.\n`;
        }
    }

    return processedResponse.trim(); // Remove trailing newline and whitespace
};

/**
 * Uses Gemini to extract structured user profile updates and reported hair issues
 * from the current conversation. Run non-blocking after sending the response.
 *
 * @param {Array<{role:string, content:string}>} chatHistory
 * @param {string} message - User's latest message
 * @returns {Promise<{user_profile_updates, hair_issue_extractions}>} Empty object on failure
 */
const postProcessConversation = async (chatHistory, message) => {


    const extractionPrompt = await postProcessingPrompt(chatHistory, message);
    //console.log('Extraction prompt: ', extractionPrompt);
    try {
        const chat = ai.chat({
            model: googleAI.model('gemini-3.6-flash'),
            config: {
                temperature: 1.1,
            },

        });
        const { output } = await chat.send(extractionPrompt);
        //console.log("Raw post-processing output:", JSON.stringify(output));

        if (!output) {
            console.warn("Post-processing output is empty. Returning default empty JSON.");
            return {}; // Or return a default empty JSON object based on your schema if needed
        }

        return output;
    } catch (error) {
        console.error("Error in postProcessConversation:", error);
        return {}; // Return empty object in case of error
    }
};

const updateUserProfile = async (userId, updates) => {
    if (!updates || Object.keys(updates).length === 0) {
        console.log("No user profile updates to apply.");
        return null; // No updates to apply
    }

    // Filter out null or undefined values from updates
    const validUpdates = Object.entries(updates)
        .filter(([key, value]) => value !== null && value !== undefined)
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});

    if (Object.keys(validUpdates).length === 0) {
        console.log("No valid user profile updates to apply (all values were null or undefined).");
        return null; // No valid updates to apply
    }
    // Update chat session state here
   try {
       const session = await ai.loadSession(userId, {
           store: new DatabaseSessionStore(),
       });

       // Update the session state
       await session.updateState({
           userProfile: validUpdates,
           lastInteractionTime: new Date().toISOString(),
           // ... any other state properties you need to update
       });

   }catch (e){
        console.log(e)
   }

    const updateKeys = Object.keys(validUpdates);
    const updateValues = updateKeys.map(key => validUpdates[key]);

    const setClauses = updateKeys.map((key, index) => `${key} = $${index + 2}`).join(', '); // Start parameter index from 2

    const query = {
        text: `
            UPDATE users
            SET ${setClauses}, updated_at = NOW()
            WHERE user_id = $1
            RETURNING *;
        `,
        values: [userId, ...updateValues], // userId is $1, updates are $2, $3, ...
    };

    try {
        const res = await pgClient.query(query);
        if (res.rows.length > 0) {
            // Update Redis cache with the updated user profile
            await redisClient.set(`user:${userId}`, JSON.stringify(res.rows[0]));
            console.log(`User profile updated successfully for user ${userId} with fields: ${updateKeys.join(', ')}`);
            return res.rows[0]; // Return the updated user object
        } else {
            console.warn(`User profile update failed for user ${userId}: User not found.`);
            return null; // User not found or update failed
        }
    } catch (err) {
        console.error(`Error updating user profile for user ${userId}:`, err);
        throw err; // Propagate the error
    }
};

/**
 * Persists all post-response data: profile updates, hair issues, product recommendations,
 * and conversation history. Run non-blocking via setImmediate after sending the response.
 *
 * @param {{user_profile_updates, hair_issue_extractions}} postProcessData - Output of postProcessConversation()
 * @param {string} userId
 * @param {any} output - Raw AI output
 * @param {string|null} allchatsSummary - Existing summary (skips generation if truthy)
 * @param {string} conversationId
 * @param {Array} chatHistory - Full history including latest turn
 * @param {string} botMessage - JSON-stringified AI output (used for product check)
 */
const postResponseProcessing = async (postProcessData, userId, output, allchatsSummary, conversationId, chatHistory, botMessage )=>{
    if (postProcessData.user_profile_updates) {
        await updateUserProfile(userId, postProcessData.user_profile_updates);
    }

    // Classify and persist user persona from the latest signals — non-blocking, best-effort
    try {
        await classifyAndSavePersona(userId, {
            profileUpdates: postProcessData.user_profile_updates || {},
            chatHistory,
        });
    } catch (err) {
        console.error('Persona classification failed (non-fatal):', err.message);
    }

    if (postProcessData.hair_issue_extractions && postProcessData.hair_issue_extractions.hair_issues_reported && postProcessData.hair_issue_extractions.hair_issues_reported.length > 0) {
        for (const issue of postProcessData.hair_issue_extractions.hair_issues_reported) {
            await saveHairIssue(userId, issue, JSON.stringify(output)); // Or refine advice from output
            console.log(`Hair issue reported and saved: ${issue}`);
        }
    }


    if (!allchatsSummary) {
        await generateAndSaveSummary(userId, conversationId, chatHistory);
    }
    const recommendedProductsData = await postResponseProductCheck(chatHistory, botMessage); // Get array of product objects
    console.log("Recommended Products (with reasons):", JSON.stringify(recommendedProductsData));

    if (recommendedProductsData && recommendedProductsData.length > 0) {
        // --- Loop through recommended products and save to DB (Corrected for reasons) ---
        for (const productRecommendation of recommendedProductsData) { // Loop through objects
            const { productName, reason } = productRecommendation; // Extract productName and reason
            const product = await getProductByName(productName); // Lookup product by name

            if (product) {
                await addProductRecommendation(userId, conversationId, product.product_id, reason); // Pass the reason to addProductRecommendation
            } else {
                console.warn(`Product "${productName}" not found in database, cannot save recommendation.`);
            }
        }
    }

    await saveConversationSummary(conversationId, userId, allchatsSummary);
    return await saveConversation(conversationId, userId, chatHistory, allchatsSummary);
};

const postResponseProductCheckPrompt = async (chatHistory, message) => {
    return `
    Analyze the following chatbot conversation history and the bot's last response to identify if any specific products were recommended to the user.

    Chat History:
    ${JSON.stringify(chatHistory, null, 2)}

    Bot's Last Response:
    ${JSON.stringify(message, null, 2)}

    Identify and list the names of the products recommended in the bot's last response AND provide a brief reason for each recommendation based on the conversation.
    If no products were explicitly recommended, return an empty list.

    IMPORTANT: Your response must be ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. 
    
    Expected Response Format (JSON only):
    [
      { "productName": "Product Name 1", "reason": "Reason for recommendation 1" },
      { "productName": "Product Name 2", "reason": "Reason for recommendation 2" }
    ]

    If no products were recommended, respond with:
    []
    `;
};

const postResponseProductCheck = async (chatHistory, message) => {
    const extractionPrompt = await postResponseProductCheckPrompt(chatHistory, message);
    //console.log('Extraction prompt for product check (with reason): ', extractionPrompt); // Updated log message
    
    // Try Gemini first
    try {
        const chat = ai.chat({
            model: googleAI.model('gemini-3.6-flash'),
            config: {
                temperature: 0.3, // Reduced temperature for more consistent JSON formatting
            },
        });
        const { output } = await chat.send(extractionPrompt);
        console.log("Raw post-processing output for product check (with reason):", JSON.stringify(output)); // Enable logging to debug

        if (!output) {
            console.warn("Post-processing output for product check (with reason) is empty. Returning default empty array."); // Updated log
            return [];
        }

        // Clean the output to handle markdown code blocks and extra whitespace
        let cleanOutput = output.toString().trim();
        
        // Remove markdown code blocks if present
        if (cleanOutput.startsWith('```json') && cleanOutput.endsWith('```')) {
            cleanOutput = cleanOutput.slice(7, -3).trim();
        } else if (cleanOutput.startsWith('```') && cleanOutput.endsWith('```')) {
            cleanOutput = cleanOutput.slice(3, -3).trim();
        }

        // Handle case where AI returns just "[]" without quotes
        if (cleanOutput === '[]' || cleanOutput === '') {
            return [];
        }

        try {
            // Attempt to parse the output as JSON (array of product objects)
            const recommendedProductsData = JSON.parse(cleanOutput); // Renamed variable
            if (Array.isArray(recommendedProductsData)) {
                return recommendedProductsData; // Return the array of product objects
            } else {
                console.warn("Post-processing output is not an array. Returning empty array.");
                console.warn("Parsed data:", recommendedProductsData);
                return [];
            }
        } catch (jsonError) {
            console.error("Error parsing post-processing JSON output:", jsonError);
            console.error("Raw output was:", JSON.stringify(output));
            console.error("Cleaned output was:", cleanOutput);
            console.warn("Returning default empty array due to JSON parsing error.");
            return [];
        }

    } catch (error) {
        console.error("Gemini model failed in postResponseProductCheck:", error);
        console.warn("Returning default empty array due to API call error - skipping xAI fallback for post-processing to avoid additional costs.");
        return [];
        
        // Note: We're not adding xAI fallback here to avoid extra API costs for post-processing
        // The main conversation flow is more critical than product extraction
    }
};


module.exports = {
    postResponseProcessing,
    postProcessConversation,
    processBotResponse,
    updateUserProfile,
    postResponseProductCheckPrompt,
    postResponseProductCheck
}
