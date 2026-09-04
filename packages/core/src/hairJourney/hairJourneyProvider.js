/**
 * HairJourneyProvider Interface
 *
 * Base class defining the contract for hair journey data sources
 * (WordPress REST, Mock/Local, or enterprise CRM).
 */

class HairJourneyProvider {
  /**
   * Get user's hair journey profile
   * @param {string|number} userId
   * @returns {Promise<object>}
   */
  async getProfile(userId) {
    throw new Error('getProfile not implemented');
  }

  /**
   * Get user's active goals
   * @param {string|number} userId
   * @returns {Promise<object>}
   */
  async getGoals(userId) {
    throw new Error('getGoals not implemented');
  }

  /**
   * Get user's routines and cabinet
   * @param {string|number} userId
   * @returns {Promise<object>}
   */
  async getRoutines(userId) {
    throw new Error('getRoutines not implemented');
  }

  /**
   * Get today's hub checklist and stats
   * @param {string|number} userId
   * @returns {Promise<object>}
   */
  async getTodayData(userId) {
    throw new Error('getTodayData not implemented');
  }

  /**
   * Get journal entries and workspace
   * @param {string|number} userId
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async getJournalEntries(userId, options = {}) {
    throw new Error('getJournalEntries not implemented');
  }

  /**
   * Toggle completion of a routine step
   * @param {string|number} userId
   * @param {string} stepId
   * @param {string} [date]
   * @returns {Promise<object>}
   */
  async toggleStepCompletion(userId, stepId, date) {
    throw new Error('toggleStepCompletion not implemented');
  }

  /**
   * Create or add a hair goal
   * @param {string|number} userId
   * @param {object} goalData
   * @returns {Promise<object>}
   */
  async addGoal(userId, goalData) {
    throw new Error('addGoal not implemented');
  }

  /**
   * Update an existing hair goal
   * @param {string|number} userId
   * @param {string} goalId
   * @param {object} goalData
   * @returns {Promise<object>}
   */
  async updateGoal(userId, goalId, goalData) {
    throw new Error('updateGoal not implemented');
  }

  /**
   * Create a journal log entry
   * @param {string|number} userId
   * @param {object} entryData
   * @returns {Promise<object>}
   */
  async createJournalEntry(userId, entryData) {
    throw new Error('createJournalEntry not implemented');
  }
}

module.exports = { HairJourneyProvider };
