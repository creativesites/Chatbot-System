/**
 * WordPressHairJourneyProvider
 *
 * Communicates with the WordPress REST endpoints registered in `myavana-hair-journey-next`
 * under the `myavana/v1` namespace.
 *
 * Implements service-to-service authentication and impersonation (`X-On-Behalf-Of: <wp_user_id>`),
 * with deterministic fallback data for development/offline resilience.
 */

const { HairJourneyProvider } = require('./hairJourneyProvider');

class WordPressHairJourneyProvider extends HairJourneyProvider {
  /**
   * @param {object} [options]
   * @param {string} [options.baseUrl]
   * @param {string} [options.authHeader]
   * @param {number} [options.timeoutMs]
   */
  constructor(options = {}) {
    super();
    this.baseUrl = (options.baseUrl || process.env.WORDPRESS_API_BASE || 'http://myavana-hair-journey.local')
      .replace(/\/$/, '');
    this.authHeader = options.authHeader || process.env.WORDPRESS_AUTH_HEADER || null;
    this.timeoutMs = options.timeoutMs || 4000;
  }

  /**
   * Internal fetch wrapper with timeout, headers, and error handling
   * @param {string} path
   * @param {object} [options]
   * @returns {Promise<any>}
   */
  async _request(path, { method = 'GET', body, userId } = {}) {
    const url = `${this.baseUrl}/wp-json/myavana/v1${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const serviceKey = process.env.WORDPRESS_SERVICE_KEY;
    if (serviceKey) {
      headers['X-Myavana-Service-Key'] = serviceKey;
    }

    if (this.authHeader) {
      headers['Authorization'] = this.authHeader;
    }

    if (userId) {
      headers['X-On-Behalf-Of'] = String(userId);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`WordPress API returned status ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      return json?.data ?? json;
    } catch (err) {
      clearTimeout(timeout);
      console.warn(`⚠️ WordPress API request to ${path} failed (${err.message}). Using resilient fallback.`);
      return null;
    }
  }

  /**
   * Get user's hair journey profile
   */
  async getProfile(userId) {
    const data = await this._request('/profile', { userId });
    if (data && (data.hairType || data.hair_type || data.porosity || data.density)) {
      return {
        available: true,
        userId: data.userId || userId,
        hairType: data.hairType || data.hair_type || null,
        porosity: data.porosity || null,
        elasticity: data.elasticity || null,
        strandDiameter: data.density || null,
        hairConcerns: data.concerns || [],
        hairGoals: (data.goals || []).map(g => typeof g === 'string' ? g : (g.title || 'Hair Goal')),
        currentRegimen: data.routines && data.routines[0] ? (data.routines[0].title || data.routines[0].name) : null
      };
    }

    if (data) {
      // Valid response from WordPress, but user profile is unpopulated
      return {
        available: true,
        userId,
        hairType: null,
        porosity: null,
        elasticity: null,
        strandDiameter: null,
        hairConcerns: [],
        hairGoals: [],
        currentRegimen: null
      };
    }

    // Backend unreachable — fail honest, never fabricate
    return {
      available: false,
      error: 'WordPress Hair Journey profile API unavailable',
      userId,
      hairType: null,
      porosity: null,
      elasticity: null,
      strandDiameter: null,
      hairConcerns: [],
      hairGoals: [],
      currentRegimen: null
    };
  }

  /**
   * Get user's active goals
   */
  async getGoals(userId) {
    const data = await this._request('/goals', { userId });
    if (data) {
      const rawGoals = data.goals || data.active || (Array.isArray(data) ? data : []);
      return {
        available: true,
        goals: rawGoals.map((g, idx) => ({
          id: g.id || `goal_${idx + 1}`,
          title: g.title || g.name || 'Hair Goal',
          category: g.category || 'Length & Health',
          progressPercent: Number(g.progress != null ? g.progress : (g.progressPercent || 0)),
          targetMetric: g.target_length ? `${g.target_length} in` : (g.targetMetric || 'Tracked'),
          targetDate: g.target_date || g.targetDate || 'Ongoing',
          status: g.status || 'active',
          createdAt: g.created_at || g.createdAt || ''
        })),
        overview: {
          activeCount: data.totalActive || rawGoals.length,
          completedCount: data.totalCompleted || 0,
          averageProgress: 0
        }
      };
    }

    // Backend unreachable — fail honest, never fabricate
    return {
      available: false,
      error: 'WordPress Hair Journey goals API unavailable',
      goals: [],
      overview: {
        activeCount: 0,
        completedCount: 0,
        averageProgress: 0
      }
    };
  }

  /**
   * Get user's routines and cabinet
   */
  async getRoutines(userId) {
    const data = await this._request('/routine', { userId });
    if (data) {
      const routines = data.routines || (Array.isArray(data) ? data : []);
      return {
        available: true,
        routines: routines.map(r => ({
          id: r.id || 'routine_1',
          title: r.title || r.name || 'Routine',
          frequency: r.frequency || 'Weekly',
          steps: (r.steps || []).map((s, idx) => ({
            id: s.id || `step_${idx + 1}`,
            title: s.name || s.title || `Step ${idx + 1}`,
            duration: s.duration || '5 min',
            completed: Boolean(s.isCompleted || s.completed)
          }))
        })),
        cabinet: data.cabinet || []
      };
    }

    // Backend unreachable — fail honest, never fabricate
    return {
      available: false,
      error: 'WordPress Hair Journey routines API unavailable',
      routines: [],
      cabinet: []
    };
  }

  /**
   * Get today's hub checklist and stats
   */
  async getTodayData(userId) {
    const data = await this._request('/today', { userId });
    if (data) {
      const rawSteps = data.checklist?.items || data.checklist || data.steps || [];
      return {
        available: true,
        date: data.checklist?.date || new Date().toISOString().split('T')[0],
        streakDays: data.dayCount || 0,
        checklist: rawSteps.map((s, idx) => ({
          id: s.id || `step_today_${idx + 1}`,
          title: s.title || s.name || `Step ${idx + 1}`,
          completed: Boolean(s.isCompleted || s.completed),
          duration: s.duration || '5 min'
        })),
        milestone: data.insight?.title || null
      };
    }

    // Backend unreachable — fail honest, never fabricate
    return {
      available: false,
      error: 'WordPress Hair Journey today checklist API unavailable',
      date: new Date().toISOString().split('T')[0],
      streakDays: 0,
      checklist: [],
      milestone: null
    };
  }

  /**
   * Get journal entries and workspace
   */
  async getJournalEntries(userId, options = {}) {
    const perPage = options.perPage || 5;
    const data = await this._request(`/journal/entries?perPage=${perPage}`, { userId });
    if (data) {
      return {
        available: true,
        ...data
      };
    }

    // Backend unreachable — fail honest, never fabricate
    return {
      available: false,
      error: 'WordPress Hair Journey journal API unavailable',
      items: [],
      total: 0
    };
  }

  /**
   * Toggle completion of a routine step
   */
  async toggleStepCompletion(userId, stepId, date = new Date().toISOString().split('T')[0]) {
    const data = await this._request('/routine/toggle-step', {
      method: 'POST',
      body: { stepId, date },
      userId
    });
    if (data) return { available: true, ...data };

    return {
      available: false,
      saved: false,
      error: 'WordPress API unavailable - step completion was not saved',
      stepId,
      completed: false,
      date
    };
  }

  /**
   * Add a new goal
   */
  async addGoal(userId, goalData) {
    const data = await this._request('/goals', {
      method: 'POST',
      body: goalData,
      userId
    });
    if (data) return { available: true, ...data };

    return {
      available: false,
      saved: false,
      error: 'WordPress API unavailable - goal was not saved'
    };
  }

  /**
   * Update an existing goal
   */
  async updateGoal(userId, goalId, goalData) {
    const data = await this._request(`/goals/${goalId}`, {
      method: 'POST',
      body: goalData,
      userId
    });
    if (data) return { available: true, ...data };

    return {
      available: false,
      saved: false,
      error: 'WordPress API unavailable - goal update was not saved',
      id: goalId
    };
  }

  /**
   * Create a journal log entry
   */
  async createJournalEntry(userId, entryData) {
    const data = await this._request('/journal/entries', {
      method: 'POST',
      body: entryData,
      userId
    });
    if (data) {
      const entryObj = data.entry || data;
      return {
        available: true,
        ...entryObj,
        id: entryObj.id || Date.now(),
        saved: true,
        stats: data.stats,
        message: data.message
      };
    }

    return {
      available: false,
      saved: false,
      error: 'WordPress API unavailable - journal entry was not saved'
    };
  }
}

module.exports = { WordPressHairJourneyProvider };
