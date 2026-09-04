/**
 * Experience Context Service
 *
 * Ingests and normalizes client surface context from the Web Widget,
 * WordPress Plugin, Customer Portal, or React Native Mobile App.
 * Injects concise, highly relevant situation awareness into Mya's prompt context.
 */

class ExperienceContextService {
  /**
   * Normalizes raw experience context received in the chat request
   * @param {object} rawContext
   * @returns {object}
   */
  static normalizeContext(rawContext = {}) {
    if (!rawContext || typeof rawContext !== 'object') {
      return {
        surface: 'web',
        page: '/',
        entity: null,
        state: null,
        userName: null,
        firstName: null,
        streak: null,
        recentActions: []
      };
    }

    return {
      surface: String(rawContext.surface || 'myhairjourney.ai'),
      page: String(rawContext.page || '/'),
      entity: rawContext.entity || null,
      state: rawContext.state || null,
      userName: rawContext.userName || rawContext.firstName || null,
      firstName: rawContext.firstName || rawContext.userName || null,
      streak: rawContext.streak || null,
      recentActions: Array.isArray(rawContext.recentActions)
        ? rawContext.recentActions.slice(-5)
        : []
    };
  }

  /**
   * Builds a concise prompt context string to prepend to the user message
   * @param {object} context
   * @returns {string}
   */
  static buildPromptSnippet(context) {
    const norm = this.normalizeContext(context);
    const parts = [];

    parts.push(`Surface: ${norm.surface}`);
    parts.push(`Page: ${norm.page}`);

    if (norm.userName) {
      parts.push(`User: ${norm.userName}`);
    }

    if (norm.streak) {
      parts.push(`Streak: ${norm.streak} days`);
    }

    if (norm.entity) {
      parts.push(`Active Entity: ${JSON.stringify(norm.entity)}`);
    }

    if (norm.state) {
      parts.push(`Page State: ${JSON.stringify(norm.state)}`);
    }

    if (norm.recentActions.length > 0) {
      parts.push(`Recent Actions: ${norm.recentActions.join(', ')}`);
    }

    // Determine intuitive context hint based on page and user
    let contextualHint = '';
    const pageLower = norm.page.toLowerCase();
    if (pageLower.includes('goal')) {
      contextualHint = 'The user is actively viewing their Hair Goals. Frame advice around their active targets and length retention.';
    } else if (pageLower.includes('routine')) {
      contextualHint = 'The user is actively reviewing their Hair Care Routine / Wash Day steps. Frame advice around regimen consistency.';
    } else if (pageLower.includes('today')) {
      contextualHint = 'The user is on the Today Hub checking daily habits. Offer quick encouragement and checklist guidance.';
    } else if (pageLower.includes('journal')) {
      contextualHint = 'The user is in the Hair Journey Journal. Encourage them to reflect on hair moisture, scalp health, and recent changes.';
    }

    if (norm.userName) {
      contextualHint = (contextualHint ? contextualHint + ' ' : '') + `Address ${norm.userName} by name warmly and conversationally.`;
    }

    return [
      '📍 [CURRENT USER EXPERIENCE CONTEXT]',
      parts.join(' | '),
      contextualHint ? `💡 Guidance: ${contextualHint}` : ''
    ].filter(Boolean).join('\n');
  }
}

module.exports = { ExperienceContextService };
