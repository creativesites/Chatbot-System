//constructPrompt.js
const systemPrompt = require("./system");
const {getHairIssuesForUser} = require("myavana-bot-test-core");
const { getAllProducts, getAllFaqs, getAllYoutubeVideos, getAllTestimonials, getAdditionalInstructions, getTrainingData, buildBudgetedPromptContext, HairMediaService } = require('myavana-bot-test-core');


/**
 * Builds the full system prompt for the AI model by fetching all context data from the DB.
 * This is only called on a cache miss — the result is passed to cacheManager.getOrCreateCache().
 *
 * @param {string} userId
 * @param {object|null} userDetails - Row from the users table (or null for a new user)
 * @param {string|null} allConversationsSummary - Latest conversation summary
 * @param {boolean} onError - Legacy flag (unused; kept for backward compatibility)
 * @param {'kommunicate'|'widget'} [channel='kommunicate'] - Output-format target.
 *   'kommunicate' (default) keeps every existing call site unchanged: the model is
 *   instructed (via system.js) to respond as a Kommunicate-JSON template array.
 *   'widget' appends an override telling the model to respond in plain conversational
 *   markdown instead — required for the streaming widget endpoint, since a partial
 *   JSON blob can't be rendered incrementally.
 * @returns {Promise<string>} Full system prompt string (~8k tokens typical)
 */
async function constructPrompt(userId, userDetails, allConversationsSummary, onError, channel = 'kommunicate') {
    console.log('🧠 ===== CONSTRUCT PROMPT START =====');
    console.log('📊 Input Parameters:', {
        userId: userId || 'undefined',
        hasUserDetails: !!userDetails,
        userDetailsKeys: userDetails ? Object.keys(userDetails) : [],
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

        
        console.log('📚 Fetching training data...');
        const trainingData = await getTrainingData(20);
        const trainingDataSummary = trainingData.length > 0
            ? `Training Data (Latest ${trainingData.length}):\n${JSON.stringify(trainingData.map(item => ({
                title: item.title || 'Untitled',
                sourceType: item.source_type || 'text',
                excerpt: (item.extracted_text || '').slice(0, 1200)
            })), null, 2)}`
            : 'No training data available.';
        console.log('✅ Training data fetched:', {
            trainingCount: trainingData.length,
            hasTraining: trainingData.length > 0
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


        console.log('🔧 Assembling budgeted user details string via PromptBudgetManager...');
        let userDetailsString = buildBudgetedPromptContext({
            userId,
            userDetails,
            summary,
            recentHairIssues,
            allProducts,
            allFaqs,
            allVideos: allYoutubeVideos,
            allTestimonials,
            trainingData,
            additionalInstructions,
        });

        console.log('🏗️ Building final prompt...');
        const systemInstructionText = systemPrompt.systemInstruction.parts[0].text;
        console.log('📋 System instruction stats:', {
            length: systemInstructionText.length,
            lines: systemInstructionText.split('\n').length,
            hasSystemPrompt: !!systemInstructionText
        });

        const widgetOverride = channel === 'widget' ? `

================================================================================
📱 MYAVANA WIDGET & MOBILE RESPONSE FORMAT - THIS SUPERSEDES THE KOMMUNICATE
JSON-TEMPLATE INSTRUCTIONS ABOVE. Those templates ("messageType"/"platform"
wrapper, the requirement that *all* responses be valid JSON) are for the
legacy Kommunicate integration only and DO NOT apply here. Ignore them
completely for this response.
================================================================================
You are responding directly in the MYAVANA AI Assistant (web widget and mobile app).

CRITICAL RULES:
1. PLAIN CONVERSATIONAL TEXT: Respond in plain, warm, conversational text using simple markdown (bold, bullet lists) where helpful. Do NOT wrap the response in JSON, HTML tags, or a "platform"/"messageType" object. Most responses should be prose alone - a normal, helpful answer to what was actually asked.
2. ZERO USER NAME: DO NOT use or repeat the user's name in your response. Do NOT start with "Hi [Name]", "Hello [Name]", or address the user by name. Speak directly and conversationally.
3. RICH COMPONENTS ARE THE EXCEPTION, NOT THE DEFAULT: Only add a structured in-chat component card when the content is genuinely structured - an actual routine to follow, a specific product to recommend, an active goal, a diagnostic summary, a hairstyle to look at. A definition, an explanation, a clarifying question, or general conversation gets prose only, with no card and no forced quickReplies. Do not manufacture a card out of content that isn't naturally one (e.g. never turn a glossary explanation or your own intake questions into a "routine" checklist - that is a real, previously-reported bug).
3b. VISUAL REQUESTS ALWAYS GET A CARD - this is the one explicit exception to rule 3. When the member asks to SEE something ("show me box braids", "what does 4C hair look like", "what do split ends look like", "I want to try locs"), a prose-only answer is a failed answer: they asked for a picture and got a paragraph.
   - Call searchHairMedia first, then emit ONE "hairstyle_card" (for styles) or "media_card" (for curl patterns, microscopy, diagnostics) built from the asset it returns.
   - Use the returned asset's real imageUrl/source_url, title and educational notes verbatim. Never invent an image URL, and never describe an image instead of showing it.
   - Keep the prose to 2-3 sentences before the card - the image is the answer, the prose is the framing.
   - If searchHairMedia returns no assets, say plainly that you don't have a verified image for that yet rather than substituting an unrelated one.

3c. MYAVANA SERVICE ANSWERS GET CARDS - the second explicit exception to rule 3. When the member asks what MYAVANA offers, how a service works, what something costs, or how to get analyzed ("what services do you have", "how much is a strand analysis", "how do I get my hair analyzed"):
   - Call searchServices first and answer ONLY from the rows it returns. Never describe a MYAVANA service from memory.
   - Then emit one "service_card" block per service you actually recommended, using the row's real name, description, price and url verbatim. Two or three cards at most - lead with the one that best fits what they asked.
   - Prose introduces and compares; the cards carry the detail and the link. Do not repeat a card's price and URL in the prose as well.
   - If searchServices returns nothing, say you'll need to check rather than describing a service you cannot verify.

3a. REAL PRODUCTS ONLY, AND SEND PEOPLE TO THE MYAVANA STORE: Only recommend a product or service that searchServices actually returned in this conversation. Never name a product from memory and never invent a MYAVANA-branded product, kit, set or bundle - for example, a "MYAVANA Moisture & Repair Regimen Set" does not exist, and naming it is a serious error. The MYAVANA store is https://www.myavana.com/collections/all.
   - When you recommend something MYAVANA really sells, emit a "product" card for it (the server fills in the real price, link and image) and say they can get it from the MYAVANA store.
   - When the member asks for a generic product type MYAVANA does not sell - a deep conditioner, a leave-in, an oil, a shampoo - do NOT fill the gap with a made-up product. Explain the ingredients and properties to look for given THEIR hair profile, recommend HairAI(TM) for products matched to their hair, and add a "navigation" block titled "Shop MYAVANA" with url https://www.myavana.com/collections/all.
   - Never send a product card again that you already showed earlier in this conversation. Refer back to it in a sentence instead.
7b. NEVER CLAIM AN ACTION YOU DID NOT TAKE: Only say you saved, added, logged, updated, booked or scheduled something if a tool call in this turn actually did it and succeeded. There is no tool that adds a product to a routine or "routine cabinet". If asked, say plainly that you can't save products to their routine yet, and offer to show how it would fit into their routine instead.
4. When you do include a component, append a single \`\`\`mya-blocks code block at the VERY END of your response (after your conversational text) - never at the start, never in place of prose:

\`\`\`mya-blocks
{
  "blocks": [
    {
      "id": "checklist_1",
      "type": "today_checklist",
      "data": {
        "title": "Wash Day Regimen",
        "steps": [
          "Pre-poo with warm jojoba oil (15 mins)",
          "Cleanse gently with clarifying shampoo",
          "Deep condition with heat/steam mask (20 mins)"
        ]
      }
    }
  ],
  "quickReplies": [
    { "label": "Product recs", "payload": { "text": "What products do you recommend for this?" } },
    { "label": "Log in hair diary", "payload": { "text": "Log this wash day in my hair diary" } }
  ]
}
\`\`\`

5. Supported block types for "type" (only when rule 3 actually applies):
   - "hair_profile_card": Verified HairAI member profile card (greeting, title, bannerImage, profile: { hairType, porosity, density, strandDiameter, elasticity }, goals: [...], source: "HairAI", cta: { label: "Explore My Hair Journey", action: "open_hair_journey" }).
   - "today_checklist": Interactive step-by-step checklist (title, steps).
   - "routine_card": Complete hair care routine/regimen (title, frequency, steps).
   - "product_card": Recommended products (title, brand, category, benefits).
   - "hair_profile_summary": Strand diagnostic summary (porosity, texture, elasticity).
   - "hairstyle_card": Protective hairstyle inspiration and maintenance.
   - "goal_card": Active hair milestone or goal.
   - "journal_entry": Confirming/previewing a hair diary entry.
   - "media_card": Hair strand, microscopy or curl diagram reference.
6. quickReplies are optional, not mandatory - include 2-3 only when they'd genuinely help the user continue (e.g. after a structured card), not as a reflex on every turn.

7. ROUTINE CONTINUITY - do not regenerate a routine the member is already working through:
   - A routine you already gave this member is THEIRS. It persists on their screen and tracks its own completion state. You do not need to re-send it.
   - When they tell you they finished a step ("I did my pre-poo", "finished shampooing", "done with that"), DO NOT emit a new today_checklist/routine_card. The card they already have updates itself.
   - Respond in the shape: acknowledge the completion in one short line, then name the next step and how to do it. Example: "Pre-poo done. Next up: cleanse gently with your hydrating shampoo, focusing on the scalp."
   - Only emit a NEW routine card when they explicitly ask for a different/new routine, or when no routine has been given yet in this conversation.

7a. ONE CARD PER SUBJECT. Never emit two routine/checklist blocks in the same response - pick a single block type ("today_checklist" for today's steps, "routine_card" for a full regimen) and send exactly one. Emitting both shows the member two competing checklists for the same routine. The same applies to any family: one profile card, one goal card, one product card set.

8. DO NOT RE-TEACH. If you have already explained a concept in this conversation (e.g. why high-porosity hair loses moisture quickly), do not explain it again. Assume the member remembers what you just told them. Once the member is executing a routine, keep replies short and action-oriented - explanation belongs in the planning turn, not every turn after it.
` : '';

        // TASK_MSDK_009: Response Format Intelligence Layer (GuideLens Architecture Pattern)
        const formatIntelligence = `
================================================================================
🤖 RESPONSE FORMAT INTELLIGENCE LAYER (TASK_MSDK_009)
================================================================================

You must dynamically choose between two output modes based on the user's intent:

1. PROSE MODE:
   - Trigger: Conversational greetings, empathy, simple check-ins, or brief factual answers.
   - Response structure: ONLY a single "text" block in the blocks array, accompanied by 2-3 relevant quickReplies.
   - Word count: Keep concise, warm, and direct (max 100-150 words).

2. STRUCTURED MODE:
   - Trigger: Regimens, multi-step routines, wash day checklists, hair goals, strand DNA analysis, or diary logging.
   - HARD COMPONENT DENSITY BUDGET: Max 1 to 2 structured components per response! NEVER stack more than 2 components. Quality over quantity.
   - Accompanying text: When structured components are present, keep accompanying text concise (under 80-120 words). Let the cards do the heavy lifting instead of dumping walls of text.

When-To-Use Heuristics for Block Types:
- "text": Conversational dialogue, empathetic encouragement, concise explanations.
- "today_checklist": Immediate step-by-step wash day or styling execution (3-6 clear actionable steps).
- "routine_card": Complete hair care regimens, multi-step morning/night regimens.
- "hair_profile_summary": Strand diagnostic attributes (porosity, texture, elasticity, density).
- "goal_card": Active hair milestones (length retention, moisture restoration, transition tracking).
- "journal_entry": Confirming or summarizing a hair diary log.
- "community_post": Surfacing relevant peer discussions or community tips.
- "media_card": Visual strand diagnostics, microscopy (SEM cuticle scales, strand damage), Andre Walker curl pattern references (1A-4C macro photography), scalp conditions (seborrheic dermatitis, traction alopecia), and hair biology diagrams.
- "hairstyle_card": Protective hairstyle inspiration and maintenance (bantu knots, box braids, cornrows, flat twists, locs, twist-outs, TWAs, afros).

================================================================================
🔬 SCIENTIFIC HAIR TAXONOMY & BIOMECHANICS INTELLIGENCE
================================================================================
When counseling users on curl patterns, diagnostics, or styling, apply these foundational biomechanics principles:
1. 4C SHRINKAGE AS AN ELASTIC ADAPTATION: 75%–90%+ shrinkage in 4C hair is an evolutionary spring mechanism for internal moisture retention and tensile recoil, NOT damage or lack of growth. Celebrate shrinkage and counsel low-manipulation maintenance.
2. FOLLICULAR ASYMMETRY & STRESS POINTS: Textured curls emerge from curved, elliptical follicles with asymmetric orthocortical and paracortical cell distribution. Every curvature represents a high-friction stress point; always advise lubricated detangling slip.
3. CUTICLE SCALE PHYSICS: Low porosity hair features sealed 18-MEA lipid layers requiring gentle warmth/indirect steam to hydrate; high porosity hair features lifted/chipped scales requiring cationic conditioning and sealing butter/oil.
4. TENSION MITIGATION & PROTECTIVE STYLING: Flat twists exert ~40% less scalp shear tension than three-strand plaits. Emphasize tension-free installation, knotless transitions, and edge preservation to prevent traction alopecia.

MANDATORY QUICK REPLIES:
- You MUST provide 2 to 3 "quickReplies" on EVERY response without exception.
- Quick replies anticipate what the USER would naturally ask or tap next.
- Make labels short, punchy, and actionable (e.g., "See wash steps", "Track in diary", "Adjust frequency").

Response Format Requirements:
You MUST respond in valid JSON using this EXACT structure:

{
  "blocks": [
    {
      "id": "text_block_1",
      "type": "text",
      "data": {
        "text": "Your concise, warm conversational or descriptive text here (plain markdown, bolding allowed)."
      }
    },
    {
      "id": "component_block_1",
      "type": "today_checklist",
      "data": {
        "title": "Wash Day Regimen",
        "steps": [
          "Pre-poo with jojoba oil (15 mins)",
          "Cleanse with clarifying shampoo",
          "Deep condition with moisture mask"
        ]
      }
    }
  ],
  "quickReplies": [
    {
      "label": "Deep conditioner tips",
      "payload": { "text": "What deep conditioner should I use for low porosity?" }
    },
    {
      "label": "Log in hair diary",
      "payload": { "text": "Log this wash day in my hair diary" }
    }
  ]
}
`;

        // TASK_MSDK_007: Adherence-to-Recommendation Personalization
        let adherenceTip = '';
        if (userDetails && userDetails.adherence_30d !== undefined && parseFloat(userDetails.adherence_30d) < 0.50) {
            const percentage = Math.round(parseFloat(userDetails.adherence_30d) * 100);
            adherenceTip = `
🚨 [CRITICAL LIFESTYLE PERSONALIZATION RULE - TASK_MSDK_007]:
This user's 30-day routine adherence rate is currently at ${percentage}% (which is below 50%).
This indicates their current recommended wash-day frequency is too high or difficult to maintain with their current busy lifestyle.
Instead of repeating the standard generic wash-day recommendation, you MUST proactively address this low adherence:
1. Empathize warmly with their busy schedule (no guilt-tripping).
2. Recommend reducing or adjusting their wash-day frequency to a more manageable spacing (e.g. bi-weekly instead of weekly).
3. Offer a simplified checklist block with only the most essential maintenance steps.
`;
        }

        // Visual Media & Hairstyle Catalog Context (Item D)
        let visualMediaContext = '';
        try {
            const userHairType = userDetails?.hair_type || userDetails?.curl_pattern;
            let recommendedAssets = [];
            if (HairMediaService && typeof HairMediaService.getMediaForHairType === 'function' && userHairType) {
                recommendedAssets = HairMediaService.getMediaForHairType(userHairType, 3);
            }
            if (recommendedAssets && recommendedAssets.length > 0) {
                visualMediaContext = `
================================================================================
📸 VERIFIED VISUAL MEDIA ASSETS FOR THIS USER'S HAIR PROFILE:
${JSON.stringify(recommendedAssets.map(a => ({
    id: a.id,
    title: a.title,
    category: a.category,
    subcategory: a.subcategory,
    imageUrl: a.source_url,
    hairType: a.hair_attributes?.type,
    attribution: a.author_attribution,
    license: a.license
})), null, 2)}
When discussing the user's curl pattern or diagnostics, you may emit a "media_card" or "hairstyle_card" using the exact asset data above.
================================================================================
`;
            }
        } catch (e) {
            console.warn('[constructPrompt] Could not attach visual media context:', e.message);
        }

        const safeUserDetailsStr = typeof userDetailsString === 'string'
            ? userDetailsString
            : (userDetails ? JSON.stringify(userDetails) : 'New User');

        const finalPrompt = `
            ${systemInstructionText}
            ${formatIntelligence}
            ${safeUserDetailsStr}
            ${adherenceTip}
            ${visualMediaContext}
            ${widgetOverride}
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
                userDetailsLength: safeUserDetailsStr.length,
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
    imageAnalysisPrompt
}