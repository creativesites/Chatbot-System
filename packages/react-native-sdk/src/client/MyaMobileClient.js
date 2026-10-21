/**
 * MyaMobileClient (JavaScript implementation)
 */

const { createId } = require('../types');
const { createDefaultStorage } = require('../storage/StorageAdapter');
const { getDeviceTelemetry, enrichExperienceContext } = require('../telemetry/deviceTelemetry');
const streamAdapter = require('./StreamAdapter');
const { normalizeAttachments } = require('./attachments');
const { makeError, toMyaError } = require('./errors');

const STORAGE_KEYS = {
  USER_ID: 'myavana_mobile_user_id',
  CONVERSATION_ID: 'myavana_mobile_conversation_id'
};

class MyaMobileClient {
  constructor(options = {}) {
    if (!options.apiBase) {
      throw new Error('MyaMobileClient requires apiBase');
    }
    this.apiBase = options.apiBase.replace(/\/+$/, '');
    // A userId passed by the host app always wins over whatever is in storage.
    this.userIdExplicit = Boolean(options.userId);
    this.conversationIdExplicit = Boolean(options.conversationId);
    this.userId = options.userId || createId('usr');
    this.conversationId = options.conversationId || createId('conv');
    this.authToken = options.authToken;
    this.telemetryOverrides = options.telemetry;
    this.storage = createDefaultStorage(options.storage);
    this.customHeaders = options.headers || {};
    this.activeAbortController = null;
    this.entitlements = Array.isArray(options.entitlements) ? options.entitlements : [];
    this.timeoutMs = options.timeoutMs || 45000; // max silence on a chat stream
    this.fetchTimeoutMs = options.fetchTimeoutMs || 15000; // history / journal calls
  }

  async init() {
    try {
      const storedUserId = await this.storage.getItem(STORAGE_KEYS.USER_ID);
      const storedConvId = await this.storage.getItem(STORAGE_KEYS.CONVERSATION_ID);

      if (this.userIdExplicit) {
        // Host identity wins. If storage held a different user, that user's
        // conversation must not carry over to this one.
        const switched = Boolean(storedUserId) && storedUserId !== this.userId;
        await this.storage.setItem(STORAGE_KEYS.USER_ID, this.userId);
        if (switched && !this.conversationIdExplicit) {
          this.conversationId = createId('conv');
          await this.storage.setItem(STORAGE_KEYS.CONVERSATION_ID, this.conversationId);
        } else if (!this.conversationIdExplicit && storedConvId) {
          this.conversationId = storedConvId;
        } else {
          await this.storage.setItem(STORAGE_KEYS.CONVERSATION_ID, this.conversationId);
        }
      } else {
        if (storedUserId) {
          this.userId = storedUserId;
        } else {
          await this.storage.setItem(STORAGE_KEYS.USER_ID, this.userId);
        }
        if (storedConvId && !this.conversationIdExplicit) {
          this.conversationId = storedConvId;
        } else {
          await this.storage.setItem(STORAGE_KEYS.CONVERSATION_ID, this.conversationId);
        }
      }
    } catch (err) {
      console.warn('[MyaMobileClient] Storage init warning:', err.message);
    }
  }

  /**
   * Logout: forget the stored user and conversation so the next login starts
   * clean. The host calls this (via the hook) before signing another user in.
   */
  async clearSession() {
    this.abort();
    try {
      await this.storage.removeItem(STORAGE_KEYS.USER_ID);
      await this.storage.removeItem(STORAGE_KEYS.CONVERSATION_ID);
    } catch (err) {
      console.warn('[MyaMobileClient] clearSession warning:', err.message);
    }
    this.userIdExplicit = false;
    this.conversationIdExplicit = false;
    this.userId = createId('usr');
    this.conversationId = createId('conv');
  }

  getUserId() {
    return this.userId;
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  getAuthToken() {
    return this.authToken;
  }

  setCustomHeaders(headers) {
    this.customHeaders = Object.assign({}, this.customHeaders, headers);
  }

  /** Services the member already owns, sent every turn so Mya never re-offers them. */
  setEntitlements(list) {
    this.entitlements = Array.isArray(list) ? list.slice() : [];
  }

  /** Funnel event (offer_shown, purchase_completed, ...). Fire and report; never throws into the UI. */
  async trackEvent(eventType, metadata = {}) {
    const headers = { 'Content-Type': 'application/json', 'X-User-Id': this.userId, ...this.customHeaders };
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
    const res = await this._fetchWithTimeout(`${this.apiBase}/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: this.userId,
        conversationId: this.conversationId,
        eventType,
        metadata,
      }),
    });
    if (!res.ok) throw new Error(`Failed to log event: HTTP ${res.status}`);
  }

  async setUserId(newUserId) {
    this.userId = newUserId;
    await this.storage.setItem(STORAGE_KEYS.USER_ID, newUserId);
  }

  getConversationId() {
    return this.conversationId;
  }

  async setConversationId(newConvId) {
    this.conversationId = newConvId;
    await this.storage.setItem(STORAGE_KEYS.CONVERSATION_ID, newConvId);
  }

  async createNewConversation() {
    const newId = createId('conv');
    await this.setConversationId(newId);
    return newId;
  }

  getStorage() {
    return this.storage;
  }

  registerPlatformAdapter(adapter) {
    this.platformAdapter = adapter;
  }

  getPlatformAdapter() {
    return this.platformAdapter;
  }

  setScreenContext(context) {
    this.screenContext = context;
  }

  getScreenContext() {
    return this.screenContext;
  }

  abort() {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }

  async sendMessage(options = {}) {
    this.abort();

    // Never forward a photo the server would silently drop. Fail before any
    // request so the UI cannot claim a photo was sent.
    let attachments;
    if (Array.isArray(options.attachments) && options.attachments.length) {
      const { ready, rejected } = normalizeAttachments(options.attachments);
      if (rejected.length) {
        throw makeError('attachment', undefined, { rejected });
      }
      attachments = ready.map((a) => ({ url: a.url, mimeType: a.mimeType }));
    }

    this.activeAbortController = new AbortController();
    const controller = this.activeAbortController;
    let timedOut = false;
    let timer = null;
    const armTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, this.timeoutMs);
    };
    armTimer();

    const targetConvId = options.conversationId || this.conversationId;
    const streamUrl = `${this.apiBase}/chat/stream`;

    const baseScreen = this.screenContext || {};
    const mergedExpContext = Object.assign(
      {},
      baseScreen.page ? { page: baseScreen.page } : {},
      baseScreen.screen ? { screen: baseScreen.screen } : {},
      this.screenContext ? { screenContext: this.screenContext } : {},
      options.experienceContext
    );

    // Entitlements ride on every turn so the server can stop re-offering owned services.
    mergedExpContext.entitlements = this.entitlements;

    const experienceContext = enrichExperienceContext(
      mergedExpContext,
      this.telemetryOverrides
    );

    const requestPayload = {
      message: options.message,
      from: this.userId,
      userId: this.userId,
      groupId: targetConvId,
      conversationId: targetConvId,
      format: 'ndjson',
      experienceContext,
      ...(attachments ? { attachments } : {})
    };

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/x-ndjson, text/plain;q=0.9',
      'X-User-Id': this.userId,
      'X-Platform': experienceContext.platform,
      ...this.customHeaders
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const result = await streamAdapter.streamFetch(
        streamUrl,
        {
          method: 'POST',
          headers,
          body: requestPayload,
          signal: options.signal || controller.signal
        },
        {
          onFrame: (frame) => {
            armTimer(); // the stream is alive; restart the silence timer
            options.onFrame && options.onFrame(frame);
          },
          onDelta: options.onDelta,
          onBlock: options.onBlock,
          onAction: (action) => {
            if (this.platformAdapter && typeof this.platformAdapter.onActionDispatched === 'function') {
              try {
                this.platformAdapter.onActionDispatched(action);
              } catch (e) {
                console.warn('[MyaMobileClient] platformAdapter.onActionDispatched error:', e.message);
              }
            }
            if (options.onAction) options.onAction(action);
          },
          onDone: options.onDone,
          onError: options.onError
        }
      );

      if (timedOut) throw makeError('timeout');

      return {
        content: result.accumulatedText,
        blocks: result.blocks,
        actions: result.actions
      };
    } catch (err) {
      if (timedOut) throw makeError('timeout');
      throw toMyaError(err);
    } finally {
      if (timer) clearTimeout(timer);
      if (this.activeAbortController === controller) this.activeAbortController = null;
    }
  }

  /** fetch with an abort timer, so history/journal calls cannot hang forever. */
  async _fetchWithTimeout(url, init = {}) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.fetchTimeoutMs);
    try {
      return await fetch(url, Object.assign({}, init, { signal: controller.signal }));
    } catch (err) {
      if (timedOut) throw makeError('timeout');
      throw toMyaError(err);
    } finally {
      clearTimeout(timer);
    }
  }

  async fetchConversationHistory(conversationId) {
    const targetId = conversationId || this.conversationId;
    const url = `${this.apiBase}/conversations/${targetId}?userId=${encodeURIComponent(this.userId)}`;

    const headers = {
      'X-User-Id': this.userId,
      ...this.customHeaders
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const res = await this._fetchWithTimeout(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch history: HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !Array.isArray(data.chatHistory)) {
      return [];
    }

    return data.chatHistory.map((item) => ({
      id: item.id || createId('msg'),
      role: (item.role === 'assistant' || item.role === 'model') ? 'assistant' : 'user',
      content: item.content || item.message || '',
      timestamp: item.timestamp || new Date().toISOString(),
      blocks: item.blocks || [],
      actions: item.actions || []
    }));
  }

  async fetchUserConversations() {
    const url = `${this.apiBase}/conversations?userId=${encodeURIComponent(this.userId)}`;

    const headers = {
      'X-User-Id': this.userId,
      ...this.customHeaders
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const res = await this._fetchWithTimeout(url, { headers });
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      if (!data.success || !Array.isArray(data.conversations)) {
        return [];
      }
      return data.conversations;
    } catch (e) {
      console.warn('[MyaMobileClient] fetchUserConversations error:', e.message);
      return [];
    }
  }

  getTelemetry() {
    return getDeviceTelemetry(this.telemetryOverrides);
  }

  /**
   * Real Hair Journey journal entries, direct - not through chat/stream.
   *
   * Conversational tool-calling for journal reads/writes was found to be
   * unreliable (the model can claim success on a create with nothing
   * actually persisted - see TASK_HJ_025). These call the same
   * HairJourneyService the chat tools use, but as a direct request, so a
   * timeline screen gets real data and a real write confirmation rather
   * than depending on the model choosing to call the right tool.
   */
  async fetchJournalEntries(options = {}) {
    const url = new URL(`${this.apiBase}/journal/entries`);
    url.searchParams.set('userId', this.userId);
    if (options.perPage) url.searchParams.set('perPage', String(options.perPage));

    const headers = { 'X-User-Id': this.userId, ...this.customHeaders };
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;

    const res = await this._fetchWithTimeout(url.toString(), { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch journal entries: HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch journal entries');
    }

    return { result: data.result, blocks: data.blocks || [] };
  }

  async createJournalEntry(entryData) {
    const url = `${this.apiBase}/journal/entries`;
    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': this.userId,
      ...this.customHeaders
    };
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;

    const res = await this._fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId: this.userId, ...entryData })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || `Failed to create journal entry: HTTP ${res.status}`);
    }

    return { result: data.result, blocks: data.blocks || [] };
  }
}

module.exports = {
  MyaMobileClient,
  STORAGE_KEYS
};
