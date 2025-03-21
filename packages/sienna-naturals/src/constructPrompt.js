//constructPrompt.js
const systemPrompt = require("./system");
const {getHairIssuesForUser} = require("myavana-bot-test-core");
const { getAllProducts, getAllFaqs, getAllYoutubeVideos, getAllTestimonials, getAdditionalInstructions } = require('myavana-bot-test-core');


async function constructPrompt(userId, userDetails, chatHistory, allConversationsSummary, onError) {
    try {
        const userInfo = userDetails ? JSON.stringify(userDetails) : 'New User';
        const summary = allConversationsSummary || 'No previous conversations.';
        const recentHairIssues = await getHairIssuesForUser(userId);
        const issueSummary = recentHairIssues.length > 0
            ? `Recent Hair Issues: ${JSON.stringify(recentHairIssues)}`
            : 'No recent hair issues reported.';

        // --- Fetch ALL products ---
        const allProducts = await getAllProducts();
        const productRecommendations = allProducts.length > 0
            ? `Sienna Naturals Products:\n${JSON.stringify(allProducts, null, 2)}`
            : 'No products found. DO NOT RECOMMEND PRODUCTS.';

        // --- Fetch ALL FAQs ---
        const allFaqs = await getAllFaqs(); // Get ALL FAQs
        const faqsSummary = allFaqs.length > 0
            ? `FAQs:\n${JSON.stringify(allFaqs, null, 2)}`
            : 'No FAQs found.';

        // --- Fetch ALL YouTube Videos ---
        const allYoutubeVideos = await getAllYoutubeVideos();
        const youtubeVideosSummary = allYoutubeVideos.length > 0
            ? `YouTube Videos:\n${JSON.stringify(allYoutubeVideos, null, 2)}`
            : 'No YouTube videos available.';

        // --- Fetch ALL Testimonials ---
        const allTestimonials = await getAllTestimonials();
        const testimonialsSummary = allTestimonials.length > 0
            ? `Testimonials:\n${JSON.stringify(allTestimonials, null, 2)}`
            : 'No testimonials available.';

        // --- Fetch Additional Bot Instructions ---
        const additionalInstructions = await getAdditionalInstructions();
        const instructionsSummary = additionalInstructions.length > 0
            ? `Additional Bot Instructions:\n${JSON.stringify(additionalInstructions, null, 2)}`
            : 'No additional bot instructions defined.';


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

        if (onError) {
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
        }
        //console.log("userDetailsString: ", userDetailsString)
        return `
            ${systemPrompt.systemInstruction.parts[0].text}
            ${userDetailsString}
        `;
    } catch (error) {
        console.error("Error in constructPrompt:", error);
        return "An error occurred while generating the prompt.";
    }
}
const postProcessingPrompt = (chatHistory, message) => {
    return `
    You are a Sienna Naturals expert AI assistant designed to analyze user conversations and user's name and extract structured information related to hair care.

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

const imageAnalysisPrompt = async () => {
  const allProducts = await getAllProducts();
  const productRecommendations = allProducts.length > 0
            ? `Sienna Naturals Products:\n${JSON.stringify(allProducts, null, 2)}`
            : 'No products found. DO NOT RECOMMEND PRODUCTS.';
    return `
You are an AI assistant for Sienna Naturals, specializing in analyzing hair and providing personalized haircare advice.

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
    *   **Product Recommendations (Sienna Naturals-focused):**  Recommend relevant Sienna Naturals products.*
    *   **Tips for Addressing any Issues:** If you identified any apparent hair issues (dryness, damage, frizz, etc.), provide specific tips to address these concerns.

**Important Considerations:**

*   **Visual Analysis Only:**  Emphasize that your analysis is based *solely* on the visual information in the image and may not capture the full picture of the user's hair health. Encourage users to consider a more in-depth analysis like MYAVANA HairSI™ for a scientific assessment.
*   **Empathetic and Helpful Tone:** Maintain a helpful, empathetic, and encouraging tone throughout your response, aligning with the MYAVANA brand.
*   **Avoid Medical Diagnoses:** Do not provide medical diagnoses or treatments for scalp conditions. If you observe concerning scalp issues, gently suggest consulting a dermatologist.
**Response Format Instructions:**

Your ENTIRE response MUST be valid HTML code, styled to match Sienna Naturals branding.  Use semantic HTML elements (like \`<p>\`, \`<ul>\`, \`<li>\`, \`<h3>\`, etc.) to structure your analysis and recommendations logically.

For visual styling and emphasis, please utilize the following CSS classes and inline styles *as you deem appropriate* to enhance readability and highlight key information:

*   **Highlight Key Phrases:** Use \`<span class='highlight'>[text to highlight]</span>\` to emphasize important terms or phrases, like service names, key hair characteristics, or crucial advice points. Use this sparingly for impactful highlighting.
*   **Italics for Emphasis or Nuance:** Use \`<i>[text in italics]</i>\` for adding emphasis, providing nuanced explanations, or for disclaimers.

ONLY reccommend Sienna Naturals products:
${productRecommendations}
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