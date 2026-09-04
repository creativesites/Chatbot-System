// packages/core/src/context/promptBudgetManager.js
// Enforces a strict 12,000 token budget for the system prompt,
// replacing the unbounded dump of 57.5k tokens.

const MAX_PROMPT_TOKENS = 12000;
const CHARS_PER_TOKEN = 4;
const MAX_PROMPT_CHARS = MAX_PROMPT_TOKENS * CHARS_PER_TOKEN; // 48,000 chars

function truncate(str, maxLen) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '... [truncated]';
}

/**
 * Prioritizes and budgets system prompt components into a strictly bounded context.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {object|null} params.userDetails
 * @param {string|null} params.summary
 * @param {Array} params.recentHairIssues
 * @param {Array} params.allProducts
 * @param {Array} params.allFaqs
 * @param {Array} params.allVideos
 * @param {Array} params.allTestimonials
 * @param {Array} params.trainingData
 * @param {Array} params.additionalInstructions
 * @returns {string} Budgeted context string
 */
function buildBudgetedPromptContext({
    userId,
    userDetails,
    summary,
    recentHairIssues = [],
    allProducts = [],
    allFaqs = [],
    allVideos = [],
    allTestimonials = [],
    trainingData = [],
    additionalInstructions = [],
}) {
    // 1. User Info & Conversation Summary (~1,500 tokens / 6,000 chars)
    const userInfoClean = userDetails
        ? Object.fromEntries(
              Object.entries(userDetails).filter(([_, v]) => v !== null && v !== undefined && v !== '')
          )
        : 'New User';
    const userInfoStr = `User Information: ${JSON.stringify(userInfoClean)}`;
    const summaryStr = `Previous Conversations Summary: ${truncate(summary || 'No previous conversations.', 3000)}`;

    // 2. Recent Hair Issues (capped to 5 latest, ~500 tokens / 2,000 chars)
    const topIssues = recentHairIssues.slice(0, 5);
    const issuesStr = topIssues.length > 0
        ? `Recent Hair Issues (Latest ${topIssues.length}): ${JSON.stringify(topIssues)}`
        : 'No recent hair issues reported.';

    // 3. Products & Services (concise representation, top 12 items, ~1,500 tokens / 6,000 chars)
    const cleanProducts = allProducts.slice(0, 12).map(p => ({
        id: p.id || p.product_id,
        name: p.product_name || p.name,
        category: p.category,
        description: truncate(p.description, 120),
        price: p.price,
    }));
    const productsStr = cleanProducts.length > 0
        ? `Myavana Core Services & Products:\n${JSON.stringify(cleanProducts, null, 1)}`
        : 'No services found.';

    // 4. FAQs (top 10 canonical FAQs, ~2,000 tokens / 8,000 chars)
    const cleanFaqs = allFaqs.slice(0, 10).map(f => ({
        q: f.question,
        a: truncate(f.answer, 200),
    }));
    const faqsStr = cleanFaqs.length > 0
        ? `Myavana Key FAQs:\n${JSON.stringify(cleanFaqs, null, 1)}`
        : '';

    // 5. Training Data & Additional Instructions (capped at 2,000 tokens / 8,000 chars)
    const cleanTraining = trainingData.slice(0, 5).map(t => ({
        title: t.title || 'Guide',
        text: truncate(t.extracted_text || '', 400),
    }));
    const trainingStr = cleanTraining.length > 0
        ? `Expert Hair Knowledge Base:\n${JSON.stringify(cleanTraining, null, 1)}`
        : '';

    const instructionsStr = additionalInstructions.length > 0
        ? `Bot Guidelines:\n${JSON.stringify(additionalInstructions.slice(0, 5), null, 1)}`
        : '';

    // 6. Testimonials & Videos (lightweight, top 3 each)
    const cleanVideos = allVideos.slice(0, 3).map(v => ({
        title: v.title || v.video_title,
        url: v.url || v.video_url,
    }));
    const videosStr = cleanVideos.length > 0 ? `Helpful Videos: ${JSON.stringify(cleanVideos)}` : '';

    const cleanTestimonials = allTestimonials.slice(0, 3).map(t => ({
        author: t.author || t.name,
        quote: truncate(t.testimonial || t.text, 100),
    }));
    const testimonialsStr = cleanTestimonials.length > 0 ? `Client Testimonials: ${JSON.stringify(cleanTestimonials)}` : '';

    const sections = [
        userInfoStr,
        summaryStr,
        issuesStr,
        productsStr,
        faqsStr,
        trainingStr,
        instructionsStr,
        videosStr,
        testimonialsStr,
    ].filter(Boolean);

    let budgetedContext = sections.join('\n\n');

    // Hard safety cap at 48,000 characters
    if (budgetedContext.length > MAX_PROMPT_CHARS) {
        console.warn(`⚠️ Prompt budget exceeded (${budgetedContext.length} chars). Truncating to ${MAX_PROMPT_CHARS} chars.`);
        budgetedContext = budgetedContext.slice(0, MAX_PROMPT_CHARS);
    }

    const estimatedTokens = Math.ceil(budgetedContext.length / CHARS_PER_TOKEN);
    console.log(`📊 [PromptBudgetManager] System prompt context built: ${budgetedContext.length} chars (~${estimatedTokens} tokens, limit: ${MAX_PROMPT_TOKENS}).`);

    return budgetedContext;
}

module.exports = {
    MAX_PROMPT_TOKENS,
    buildBudgetedPromptContext,
};
