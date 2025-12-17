//constructPrompt.js
const systemPrompt = require("./system");
const {getHairIssuesForUser} = require("myavana-bot-test-core");
const { getAllProducts, getAllFaqs, getAllYoutubeVideos, getAllTestimonials, getAdditionalInstructions } = require('myavana-bot-test-core');


async function constructPrompt(userId, userDetails, chatHistory, allConversationsSummary, onError) {
    console.log('🧠 ===== CONSTRUCT PROMPT START =====');
    console.log('📊 Input Parameters:', {
        userId: userId || 'undefined',
        hasUserDetails: !!userDetails,
        userDetailsKeys: userDetails ? Object.keys(userDetails) : [],
        chatHistoryLength: chatHistory ? chatHistory.length : 0,
        hasSummary: !!allConversationsSummary,
        summaryLength: allConversationsSummary ? allConversationsSummary.length : 0,
        onError: typeof onError
    });
    
    try {
        const startTime = Date.now();
        
        console.log('📝 Processing user information...');
        const userInfo = userDetails ? JSON.stringify(userDetails) : 'New User';
        const summary = allConversationsSummary || 'No previous conversations.';
        console.log('✅ User info processed:', {
            userInfoLength: userInfo.length,
            isNewUser: !userDetails,
            summaryLength: summary.length
        });

        console.log('🔍 Fetching user hair issues...');
        const recentHairIssues = await getHairIssuesForUser(userId);
        const issueSummary = recentHairIssues.length > 0
            ? `Recent Hair Issues: ${JSON.stringify(recentHairIssues)}`
            : 'No recent hair issues reported.';
        console.log('✅ Hair issues fetched:', {
            issueCount: recentHairIssues.length,
            hasIssues: recentHairIssues.length > 0,
            issueSummaryLength: issueSummary.length
        });

        console.log('🛍️ Fetching products/services...');
        const allProducts = await getAllProducts();
        const productRecommendations = allProducts.length > 0
            ? `Myavana Services:\n${JSON.stringify(allProducts, null, 2)}`
            : 'No services found.';
        console.log('✅ Products fetched:', {
            productCount: allProducts.length,
            productsDataSize: JSON.stringify(allProducts).length,
            hasProducts: allProducts.length > 0
        });

        console.log('❓ Fetching FAQs...');
        const allFaqs = await getAllFaqs();
        const faqsSummary = allFaqs.length > 0
            ? `Myavana Responses and FAQs:\n${JSON.stringify(allFaqs, null, 2)}`
            : 'No Myavana Responses and  FAQs found.';
        console.log('✅ FAQs fetched:', {
            faqCount: allFaqs.length,
            faqsDataSize: JSON.stringify(allFaqs).length,
            hasFaqs: allFaqs.length > 0
        });

        console.log('🎥 Fetching YouTube videos...');
        const allYoutubeVideos = await getAllYoutubeVideos();
        const youtubeVideosSummary = allYoutubeVideos.length > 0
            ? `YouTube Videos:\n${JSON.stringify(allYoutubeVideos, null, 2)}`
            : 'No YouTube videos available.';
        console.log('✅ YouTube videos fetched:', {
            videoCount: allYoutubeVideos.length,
            videosDataSize: JSON.stringify(allYoutubeVideos).length,
            hasVideos: allYoutubeVideos.length > 0
        });

        console.log('⭐ Fetching testimonials...');
        const allTestimonials = await getAllTestimonials();
        const testimonialsSummary = allTestimonials.length > 0
            ? `Testimonials:\n${JSON.stringify(allTestimonials, null, 2)}`
            : 'No testimonials available.';
        console.log('✅ Testimonials fetched:', {
            testimonialCount: allTestimonials.length,
            testimonialsDataSize: JSON.stringify(allTestimonials).length,
            hasTestimonials: allTestimonials.length > 0
        });

        console.log('📋 Fetching additional instructions...');
        const additionalInstructions = await getAdditionalInstructions();
        const instructionsSummary = additionalInstructions.length > 0
            ? `Additional Bot Instructions:\n${JSON.stringify(additionalInstructions, null, 2)}`
            : 'No additional bot instructions defined.';
        console.log('✅ Additional instructions fetched:', {
            instructionCount: additionalInstructions.length,
            instructionsDataSize: JSON.stringify(additionalInstructions).length,
            hasInstructions: additionalInstructions.length > 0
        });

        const dataFetchTime = Date.now() - startTime;
        console.log('⏱️ Data fetching completed in', dataFetchTime, 'ms');


        console.log('🔧 Assembling user details string...');
        let userDetailsString =  `
            User Information: ${userInfo}
            Previous Conversations Summary: ${summary}
            Previous hair issues: ${issueSummary}
            ${productRecommendations}
            ${faqsSummary}
            ${youtubeVideosSummary}
            ${testimonialsSummary}
            ${instructionsSummary}
        `;
        
        console.log('📊 Initial user details string stats:', {
            length: userDetailsString.length,
            lines: userDetailsString.split('\n').length,
            onErrorMode: !!onError
        });

        if (onError) {
            console.log('⚠️ On-error mode detected - including full chat history');
            userDetailsString =  `
                User Information: ${userInfo}
                Previous Conversations Summary: ${summary}
                Previous hair issues: ${issueSummary}
                Chat History: ${JSON.stringify(chatHistory)}
                ${productRecommendations}
                ${faqsSummary}
                ${youtubeVideosSummary}
                ${testimonialsSummary}
                ${instructionsSummary}
            `;
            console.log('📊 Enhanced user details string stats (with chat history):', {
                length: userDetailsString.length,
                lines: userDetailsString.split('\n').length,
                chatHistorySize: JSON.stringify(chatHistory).length
            });
        }

        console.log('🏗️ Building final prompt...');
        const systemInstructionText = systemPrompt.systemInstruction.parts[0].text;
        console.log('📋 System instruction stats:', {
            length: systemInstructionText.length,
            lines: systemInstructionText.split('\n').length,
            hasSystemPrompt: !!systemInstructionText
        });

        const finalPrompt = `
            ${systemInstructionText}
            ${userDetailsString}
        `;

        const finalTime = Date.now() - startTime;
        console.log('✅ Prompt construction completed!');
        console.log('📊 Final prompt statistics:', {
            totalLength: finalPrompt.length,
            totalLines: finalPrompt.split('\n').length,
            estimatedTokens: Math.ceil(finalPrompt.length / 4),
            constructionTimeMs: finalTime,
            components: {
                systemInstructionLength: systemInstructionText.length,
                userDetailsLength: userDetailsString.length,
                userInfoLength: userInfo.length,
                summaryLength: summary.length,
                issueSummaryLength: issueSummary.length,
                productDataSize: JSON.stringify(allProducts).length,
                faqDataSize: JSON.stringify(allFaqs).length,
                videoDataSize: JSON.stringify(allYoutubeVideos).length,
                testimonialDataSize: JSON.stringify(allTestimonials).length,
                instructionDataSize: JSON.stringify(additionalInstructions).length
            }
        });

        console.log('📝 ===== GENERATED PROMPT PREVIEW =====');
        console.log('📝 First 500 characters:');
        console.log('📝', finalPrompt.substring(0, 500));
        console.log('📝 ...');
        console.log('📝 Last 300 characters:');
        console.log('📝', finalPrompt.substring(finalPrompt.length - 300));
        console.log('📝 ===== END PROMPT PREVIEW =====');
        
        console.log('🧠 ===== CONSTRUCT PROMPT COMPLETE =====');
        return finalPrompt;
    } catch (error) {
        const errorTime = Date.now();
        console.error('❌❌❌ CRITICAL ERROR IN CONSTRUCT PROMPT!');
        console.error('❌ Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            userId: userId || 'undefined',
            hasUserDetails: !!userDetails,
            hasChatHistory: !!chatHistory,
            hasSummary: !!allConversationsSummary,
            errorTime: new Date(errorTime).toISOString()
        });
        
        console.log('🚨 Returning emergency fallback prompt...');
        const fallbackPrompt = `
            You are Mya, a Myavana hair care assistant. 
            User: ${userId || 'Unknown User'}
            Please provide helpful hair care advice and be friendly and supportive.
            ERROR: Full context unavailable due to system error.
        `;
        
        console.log('📊 Fallback prompt stats:', {
            length: fallbackPrompt.length,
            estimatedTokens: Math.ceil(fallbackPrompt.length / 4)
        });
        
        console.log('🧠 ===== CONSTRUCT PROMPT FAILED =====');
        return fallbackPrompt;
    }
}
const postProcessingPrompt = (chatHistory, message) => {
    return `
    You are a Myavana expert AI assistant designed to analyze user conversations and user's name and extract structured information related to hair care.

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

const imageAnalysisPrompt =  (userInfo, issueSummary) => {
    return `
You are an AI assistant for Myavana, specializing in analyzing hair and providing personalized haircare advice.

**Task:** Analyze the user's hair as depicted in the uploaded image. Based on your visual analysis, provide a comprehensive assessment and personalized recommendations.

**Specifically, focus on analyzing the following aspects of the hair in the image:**

*   **Hair Texture:** Is it fine, medium, or coarse? Describe the visual texture you observe.
*   **Hair Type/Curl Pattern:** Identify the hair type (straight, wavy, curly, coily) and, if applicable, the specific curl pattern (e.g., 2A, 3B, 4C).
*   **Hair Condition:** Assess the apparent condition of the hair. Does it appear healthy, dry, damaged, frizzy, oily, dull, or shiny? Look for visual cues like split ends, lack of shine, excessive frizz, or signs of dryness.
*   **Hair Density (Apparent):** Estimate the hair density as low, medium, or high based on the image.
*   **Scalp Condition (if visible):** If the scalp is visible, note any apparent conditions like dryness, flakiness, or redness.

**Based on your analysis, provide the following in your response:**

1.  **Hair Analysis Summary:** Briefly summarize your visual analysis of the user's hair based on the points above (texture, type, condition, density, scalp).
2.  **Personalized Haircare Advice:** Provide actionable and personalized haircare advice tailored to the user's hair as seen in the image. This should include:
    *   **Recommendations for Haircare Practices:** Suggest specific haircare practices that would benefit their hair type and condition (e.g., moisturizing routines, protein treatments, gentle cleansing, protective styling, etc.).
    *   **Recommendations (Myavana-focused):**  Recommend relevant Myavana service.*
    *   **Tips for Addressing any Issues:** If you identified any apparent hair issues (dryness, damage, frizz, etc.), provide specific tips to address these concerns.

**Important Considerations:**

*   **Visual Analysis Only:**  Emphasize that your analysis is based *solely* on the visual information in the image and may not capture the full picture of the user's hair health. Encourage users to consider a more in-depth analysis like MYAVANA HairSI™ for a scientific assessment.
*   **Empathetic and Helpful Tone:** Maintain a helpful, empathetic, and encouraging tone throughout your response, aligning with the MYAVANA brand.
*   **Avoid Medical Diagnoses:** Do not provide medical diagnoses or treatments for scalp conditions. If you observe concerning scalp issues, gently suggest consulting a dermatologist.
**Response Format Instructions:**

Here are the user details:
User Information: ${userInfo}
 Previous hair issues: ${issueSummary}

Your ENTIRE response MUST be valid HTML code, styled to match Myavana branding.  Use semantic HTML elements (like \`<p>\`, \`<ul>\`, \`<li>\`, \`<h3>\`, etc.) to structure your analysis and recommendations logically.

For visual styling and emphasis, please utilize the following CSS classes and inline styles *as you deem appropriate* to enhance readability and highlight key information:

*   **Highlight Key Phrases:** Use \`<span class='highlight'>[text to highlight]</span>\` to emphasize important terms or phrases, like service names, key hair characteristics, or crucial advice points. Use this sparingly for impactful highlighting.
*   **Italics for Emphasis or Nuance:** Use \`<i>[text in italics]</i>\` for adding emphasis, providing nuanced explanations, or for disclaimers.

Maintain a clear and logical flow in your HTML structure, using headings, paragraphs, and lists as needed to present the hair analysis and advice in an easy-to-understand format.

Enclose your ENTIRE response within the following basic HTML boilerplate structure, including the provided CSS styles in the \`<head>\` section:


    html
    < html >
    < head >
    < link
    href = 'https://db.onlinewebfonts.com/c/79e533eca247728ccfc8113ddc2c56ca?family=Archivo+Expanded+Medium'
    rel = 'stylesheet'
    type = 'text/css' >
        < link
    href = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&display=swap'
    rel = 'stylesheet' >
        < style >
        body
    {
        font - family
    :
        'Archivo', sans - serif;
        background - color
    :
        #f5f5f7;
        color:#
        222323;
        font - size
    :
        15
        px;
        line - height
    :
        1.5;
    }
.
    highlight
    {
        font - family
    :
        'Archivo Expanded Black', sans - serif;
        font - size
    :
        14
        px;
        text - transform
    :
        uppercase;
        background - color
    :
        #fce5d7;
        color:#
        222323;
        padding:2
        px
        6
        px;
        border - radius
    :
        4
        px;
    }
    i
    {
        font - style
    :
        italic;
        color:#
        4
        a4d68;
    }
    span
    {
        font - weight
    :
        600;
        letter - spacing
    :
        -0.04
        em;
        color:#
        222323;
    }
</style>
</head>
    <body>
    <!--  YOUR GENERATED HTML CONTENT GOES HERE -->
    </body>
</html>
           
`
}
module.exports = {
    constructPrompt,
    postProcessingPrompt,
    imageAnalysisPrompt
}