/**
 * HairJourneyService
 *
 * Orchestrates Hair Journey operations between the Mya Conversational AI,
 * PostgreSQL platform identity mappings, and the WordPress system of record.
 * Generates canonical NDJSON ChatBlocks ready for streaming to clients.
 */

const { BlockType, ActionType, createBlockId } = require('../../../chat-protocol/src');
const { WordPressHairJourneyProvider } = require('./wordPressHairJourneyProvider');
const { pgClient } = require('../database');

class HairJourneyService {
  /**
   * @param {object} [options]
   * @param {import('./hairJourneyProvider').HairJourneyProvider} [options.provider]
   */
  constructor(options = {}) {
    this.provider = options.provider || new WordPressHairJourneyProvider();
  }

  /**
   * Resolve platform user ID to WordPress user ID via identity_links
   * @param {string} myavanaUserId
   * @returns {Promise<string|number>}
   */
  async resolveWordPressUserId(myavanaUserId) {
    if (!myavanaUserId) return 1;
    try {
      if (pgClient && pgClient._connected) {
        const res = await pgClient.query(
          `SELECT external_id FROM identity_links
           WHERE (myavana_user_id = $1 OR external_id = $1)
             AND provider = 'wordpress'
           LIMIT 1`,
          [myavanaUserId]
        );
        if (res.rows.length > 0) {
          return res.rows[0].external_id;
        }
      }
    } catch (err) {
      // Proceed with fallback on DB error or disconnected client
    }
    return myavanaUserId;
  }

  /**
   * Formats a goal into a canonical goal_card block
   * @param {object} goal
   * @returns {object} ChatBlock
   */
  buildGoalCardBlock(goal) {
    return {
      id: createBlockId('goal'),
      type: BlockType.GOAL_CARD,
      data: {
        id: goal.id,
        title: goal.title || 'Hair Goal',
        category: goal.category || 'Length & Health',
        progressPercent: Number(goal.progressPercent || 0),
        targetMetric: goal.targetMetric || '',
        targetDate: goal.targetDate || '',
        status: goal.status || 'in_progress'
      },
      actions: [
        {
          type: ActionType.UPDATE_GOAL,
          label: 'Update Target',
          payload: { goalId: goal.id }
        },
        {
          type: ActionType.LOG_ENTRY,
          label: 'Log Progress',
          payload: { goalId: goal.id }
        }
      ]
    };
  }

  /**
   * Formats today's checklist into a canonical today_checklist block
   * @param {object} todayData
   * @returns {object} ChatBlock
   */
  buildTodayChecklistBlock(todayData) {
    const rawSteps = todayData.checklist || todayData.steps || [];
    const steps = rawSteps.map((s, idx) => ({
      id: s.id || `step_${idx + 1}`,
      title: s.title || s.name || `Step ${idx + 1}`,
      completed: Boolean(s.completed),
      duration: s.duration || null
    }));

    return {
      id: createBlockId('today'),
      type: BlockType.TODAY_CHECKLIST,
      data: {
        date: todayData.date || new Date().toISOString().split('T')[0],
        streakDays: todayData.streakDays || 0,
        milestone: todayData.milestone || null,
        title: "Today's Hair Care Steps",
        steps
      },
      actions: [
        {
          type: ActionType.COMPLETE_STEP,
          label: 'Mark Done',
          payload: {}
        }
      ]
    };
  }

  /**
   * Formats a routine into a canonical routine_checklist block
   * @param {object} routine
   * @returns {object} ChatBlock
   */
  buildRoutineChecklistBlock(routine) {
    const steps = (routine.steps || []).map((s, idx) => ({
      id: s.id || `step_${idx + 1}`,
      title: s.title || `Step ${idx + 1}`,
      completed: Boolean(s.completed),
      duration: s.duration || null
    }));

    return {
      id: createBlockId('routine'),
      type: BlockType.ROUTINE_CHECKLIST,
      data: {
        id: routine.id,
        title: routine.title || 'Routine Steps',
        frequency: routine.frequency || 'Weekly',
        steps
      },
      actions: [
        {
          type: ActionType.COMPLETE_STEP,
          label: 'Complete Step',
          payload: { routineId: routine.id }
        }
      ]
    };
  }

  /**
   * Formats verified strand profile into hair_profile_summary block
   * @param {object} profile
   * @returns {object} ChatBlock
   */
  buildHairProfileBlock(profile) {
    return {
      id: createBlockId('profile'),
      type: BlockType.HAIR_PROFILE_SUMMARY,
      data: {
        hairType: profile.hairType || profile.hair_type || 'Type 4 (Coily)',
        porosity: profile.porosity || 'Normal Porosity',
        elasticity: profile.elasticity || 'Medium',
        concerns: profile.hairConcerns || profile.hair_concerns || [],
        regimen: profile.currentRegimen || profile.regimen || 'Personalized HHCP'
      }
    };
  }

  /**
   * Formats a consultation referral card
   * @param {object} [info]
   * @returns {object} ChatBlock
   */
  buildConsultationCardBlock(info = {}) {
    return {
      id: createBlockId('consult'),
      type: BlockType.CONSULTATION_CARD,
      data: {
        title: info.title || '1-on-1 Virtual Hair Care Consultation',
        description: info.description ||
          'Because your hair concern has persisted across wash days, a certified MYAVANA Pro Stylist can examine your hair history and tailor a restorative regimen.',
        duration: info.duration || '30 Minutes',
        bookingUrl: info.bookingUrl || '/consultations'
      },
      actions: [
        {
          type: ActionType.OPEN_URL,
          label: 'Book Consultation',
          payload: { url: info.bookingUrl || '/consultations' }
        }
      ]
    };
  }

  /**
   * Fetch goals and return blocks + text summary for Mya
   */
  async getGoalsWithBlocks(myavanaUserId) {
    const wpUserId = await this.resolveWordPressUserId(myavanaUserId);
    const result = await this.provider.getGoals(wpUserId);
    const goals = result.goals || [];
    const blocks = goals.map(g => this.buildGoalCardBlock(g));
    return { result, blocks };
  }

  /**
   * Fetch today's hub checklist and return blocks
   */
  async getTodayWithBlocks(myavanaUserId) {
    const wpUserId = await this.resolveWordPressUserId(myavanaUserId);
    const result = await this.provider.getTodayData(wpUserId);
    const block = this.buildTodayChecklistBlock(result);
    return { result, blocks: [block] };
  }

  /**
   * Fetch routines and return blocks
   */
  async getRoutinesWithBlocks(myavanaUserId) {
    const wpUserId = await this.resolveWordPressUserId(myavanaUserId);
    const result = await this.provider.getRoutines(wpUserId);
    const routines = result.routines || [];
    const blocks = routines.map(r => this.buildRoutineChecklistBlock(r));
    return { result, blocks };
  }

  /**
   * Fetch profile and return blocks
   */
  async getProfileWithBlocks(myavanaUserId) {
    const wpUserId = await this.resolveWordPressUserId(myavanaUserId);
    const result = await this.provider.getProfile(wpUserId);
    const block = this.buildHairProfileBlock(result);
    return { result, blocks: [block] };
  }

  /**
   * Mark a step complete in WordPress
   */
  async completeStep(myavanaUserId, stepId, date) {
    const wpUserId = await this.resolveWordPressUserId(myavanaUserId);
    return this.provider.toggleStepCompletion(wpUserId, stepId, date);
  }

  /**
   * Update goal in WordPress
   */
  async updateGoal(myavanaUserId, goalId, goalData) {
    const wpUserId = await this.resolveWordPressUserId(myavanaUserId);
    return this.provider.updateGoal(wpUserId, goalId, goalData);
  }

  /**
   * Add goal in WordPress
   */
  async addGoal(myavanaUserId, goalData) {
    const wpUserId = await this.resolveWordPressUserId(myavanaUserId);
    return this.provider.addGoal(wpUserId, goalData);
  }

  /**
   * Formats a journal entry into a canonical journal_entry block with photo upload action
   * @param {object} entry
   * @returns {object} ChatBlock
   */
  buildJournalEntryBlock(entry) {
    return {
      id: createBlockId('journal'),
      type: BlockType.JOURNAL_ENTRY,
      data: {
        id: entry.id,
        title: entry.title || 'Hair Journey Journal Entry',
        notes: entry.notes || '',
        date: entry.date || new Date().toISOString().split('T')[0],
        entryType: entry.entryType || 'quick_checkin',
        moistureLevel: entry.moistureLevel || 4,
        scalpState: entry.scalpState || 'Healthy',
        hairLength: entry.hairLength || null,
        photos: Array.isArray(entry.photos) ? entry.photos : (entry.photoUrl ? [entry.photoUrl] : [])
      },
      actions: [
        {
          type: ActionType.UPLOAD_PHOTO,
          label: '📸 Add Progress Photo',
          payload: { entryId: entry.id }
        },
        {
          type: ActionType.NAVIGATE,
          label: 'View in Journal',
          payload: { route: '/journal' }
        }
      ]
    };
  }

  /**
   * Fetch journal entries and return blocks
   */
  async getJournalEntriesWithBlocks(myavanaUserId, options = {}) {
    const wpUserId = await this.resolveWordPressUserId(myavanaUserId);
    const result = await this.provider.getJournalEntries(wpUserId, options);
    const items = result.items || [];
    const blocks = items.map(item => this.buildJournalEntryBlock(item));
    return { result, blocks };
  }

  /**
   * Create a journal entry and return block
   */
  async createJournalEntryWithBlock(myavanaUserId, entryData) {
    const wpUserId = await this.resolveWordPressUserId(myavanaUserId);
    const result = await this.provider.createJournalEntry(wpUserId, entryData);
    const block = this.buildJournalEntryBlock(result);
    return { result, blocks: [block] };
  }
}

module.exports = { HairJourneyService };
