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

const USER_SAID_PREFIX_RE = /^\s*\d{4}-\d{2}-\d{2}T[^\s]+\s*-\s*User(?:\s*\(Voice\))?(?:\s*Said)?:\s*/i;
const FENCE_RE = /```(?:json|mya-blocks|mya|blocks)?\s*\n?([\s\S]*?)\n?```/gi;
const UNCLOSED_FENCE_RE = /```(?:json|mya-blocks|mya|blocks)?\s*\n?([\s\S]*)$/i;

function normalizeBlockType(rawType) {
  if (!rawType || typeof rawType !== 'string') return 'text';
  const t = rawType.trim().toLowerCase().replace(/-/g, '_');
  switch (t) {
    case 'goal':
    case 'goal_card':
      return 'goal_card';
    case 'goal_progress':
      return 'goal_progress';
    case 'goal_list':
    case 'goals':
      return 'goal_list';
    case 'routine':
    case 'routine_card':
      return 'routine_card';
    case 'routine_checklist':
      return 'routine_checklist';
    case 'today':
    case 'today_checklist':
    case 'checklist':
      return 'today_checklist';
    case 'journal':
    case 'journal_entry':
      return 'journal_entry';
    case 'journey_progress':
    case 'progress':
      return 'journey_progress';
    case 'hair_profile_card':
    case 'profile_card':
      return 'hair_profile_card';
    case 'hair_profile':
    case 'hair_profile_summary':
    case 'strand_dna':
      return 'hair_profile_summary';
    case 'consultation':
    case 'consultation_card':
    case 'stylist_triage':
      return 'consultation_card';
    case 'service':
    case 'service_card':
      return 'service_card';
    case 'service_offer':
      return 'service_offer';
    case 'product':
    case 'product_card':
      return 'product';
    case 'product_list':
    case 'products':
      return 'product_list';
    case 'media':
    case 'media_card':
      return 'media_card';
    case 'hairstyle':
    case 'hairstyle_card':
      return 'hairstyle_card';
    case 'community':
    case 'community_post':
    case 'community_card':
      return 'community_post';
    case 'quick_reply':
    case 'quick_replies':
    case 'suggestions':
      return 'quick_replies';
    case 'markdown':
      return 'markdown';
    case 'divider':
      return 'divider';
    case 'confirmation':
      return 'confirmation';
    case 'navigation':
      return 'navigation';
    case 'text':
    default:
      return t || 'text';
  }
}

function normalizeParsedBlock(rawBlock, index = 0) {
  if (!rawBlock || typeof rawBlock !== 'object') return null;
  const rawType =
    rawBlock.type === 'component' && rawBlock.component
      ? rawBlock.component.type
      : rawBlock.type;
  const type = normalizeBlockType(rawType);
  const data =
    rawBlock.type === 'component' && rawBlock.component
      ? rawBlock.component.data || {}
      : rawBlock.data || rawBlock;
  const id = rawBlock.id || `hist_${type}_${index}`;

  if (type === 'quick_replies') {
    const rawOpts = Array.isArray(data.options)
      ? data.options
      : Array.isArray(data.replies)
      ? data.replies
      : Array.isArray(rawBlock.options)
      ? rawBlock.options
      : [];
    const replies = rawOpts
      .map((r) => {
        if (typeof r === 'string') return { type: 'quick_reply', label: r, payload: r };
        if (r && typeof r === 'object') {
          const label = r.label || r.title || r.text || r.message || '';
          if (!label) return null;
          const payload = r.payload || r.message || r.prompt || r.value || label;
          return {
            type: r.type || 'quick_reply',
            label,
            payload: typeof payload === 'string' ? payload : payload?.text || payload?.prompt || label,
          };
        }
        return null;
      })
      .filter(Boolean);
    return { id, type: 'quick_replies', data: { ...data, replies, options: replies } };
  }

  return {
    id,
    type,
    data,
    actions: Array.isArray(rawBlock.actions) ? rawBlock.actions : [],
    ...(typeof rawBlock.position === 'number' ? { position: rawBlock.position } : {}),
  };
}

function parseKommunicateArray(arr) {
  const texts = [];
  const blocks = [];
  const actions = [];

  arr.forEach((entry, idx) => {
    if (!entry) return;
    if (typeof entry === 'string') {
      texts.push(entry);
      return;
    }
    if (typeof entry !== 'object') return;
    if (entry.message && typeof entry.message === 'string') {
      texts.push(entry.message.trim());
    }
    const meta = entry.metadata || {};
    const templateId = String(meta.templateId || '');
    const payload = Array.isArray(meta.payload) ? meta.payload : [];
    if (templateId === '6' && payload.length > 0) {
      // Kommunicate quick replies
      const replies = payload
        .map((p) => {
          const label = p?.title || p?.label || p?.name || '';
          if (!label) return null;
          return {
            type: 'quick_reply',
            label,
            payload: p?.message || p?.payload || label,
          };
        })
        .filter(Boolean);
      if (replies.length > 0) {
        blocks.push({
          id: `km_qr_${idx}`,
          type: 'quick_replies',
          data: { replies, options: replies },
        });
      }
    } else if ((templateId === '10' || templateId === '9' || templateId === '2') && payload.length > 0) {
      // Kommunicate generic card / carousel
      payload.forEach((card, cIdx) => {
        if (!card || typeof card !== 'object') return;
        const imageUrl =
          card.header?.imgSrc ||
          card.imgSrc ||
          card.imageUrl ||
          card.image ||
          null;
        const title = card.title || card.header?.overlayText || '';
        const description = card.description || card.subtitle || '';
        if (imageUrl) {
          blocks.push({
            id: `km_media_${idx}_${cIdx}`,
            type: 'media_card',
            data: {
              title: title || 'Hair Care Reference',
              caption: description,
              imageUrl,
            },
          });
        } else if (title || description) {
          blocks.push({
            id: `km_card_${idx}_${cIdx}`,
            type: 'service_card',
            data: { title, description },
          });
        }
      });
    }
  });

  return {
    text: texts.filter(Boolean).join('\n\n'),
    blocks,
    actions,
  };
}

function deterministicMessageId(role, timestamp, rawContent) {
  const str = `${role}|${timestamp || ''}|${typeof rawContent === 'string' ? rawContent.slice(0, 120) : ''}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return `msg_${role}_${(hash >>> 0).toString(36)}`;
}

function markDeserialized(obj) {
  if (obj && typeof obj === 'object') {
    Object.defineProperty(obj, '_deserialized', {
      value: true,
      enumerable: false,
      configurable: true,
    });
  }
  return obj;
}

/**
 * Unified message deserializer so historical turns and cached turns pass through
 * the exact same block/action extraction pipeline as live streaming turns.
 * Reference-idempotent: already-deserialized message objects are returned as-is.
 */
function deserializeHistoryMessage(item = {}) {
  if (item && item._deserialized === true) {
    return item;
  }
  const role = item.role === 'assistant' || item.role === 'model' ? 'assistant' : 'user';
  const timestamp = item.timestamp || item.createdAt || '';
  const rawContent = item.content !== undefined ? item.content : item.message !== undefined ? item.message : '';
  const id = item.id || deterministicMessageId(role, timestamp, rawContent);
  const attachments = Array.isArray(item.attachments) ? item.attachments : [];

  let blocks = Array.isArray(item.blocks) ? item.blocks.map((b, i) => normalizeParsedBlock(b, i)).filter(Boolean) : [];
  let actions = Array.isArray(item.actions) ? [...item.actions] : [];

  if (role === 'user') {
    const cleanUserText =
      typeof rawContent === 'string' ? rawContent.replace(USER_SAID_PREFIX_RE, '').trim() : String(rawContent || '');
    return markDeserialized({
      ...item,
      id,
      role,
      content: cleanUserText,
      timestamp: timestamp || new Date().toISOString(),
      attachments,
      blocks: [],
      actions: [],
    });
  }

  // Assistant turn: handle object/array payloads directly if stored unstringified
  if (Array.isArray(rawContent)) {
    const km = parseKommunicateArray(rawContent);
    return markDeserialized({
      ...item,
      id,
      role,
      content: km.text,
      timestamp: timestamp || new Date().toISOString(),
      attachments,
      blocks: [...blocks, ...km.blocks],
      actions: [...actions, ...km.actions],
    });
  }

  if (rawContent && typeof rawContent === 'object') {
    const parsedBlocks = Array.isArray(rawContent.blocks)
      ? rawContent.blocks.map((b, i) => normalizeParsedBlock(b, i)).filter(Boolean)
      : [];
    const inlineText = parsedBlocks
      .filter((b) => b.type === 'text' || b.type === 'markdown')
      .map((b) => b.data?.text || b.data?.content || '')
      .filter(Boolean)
      .join('\n\n');
    const richBlocks = parsedBlocks.filter((b) => b.type !== 'text' && b.type !== 'markdown');
    return markDeserialized({
      ...item,
      id,
      role,
      content: String(rawContent.text || rawContent.message || inlineText || '').trim(),
      timestamp: timestamp || new Date().toISOString(),
      attachments,
      blocks: [...blocks, ...richBlocks],
      actions,
    });
  }

  let text = typeof rawContent === 'string' ? rawContent.trim() : String(rawContent || '');

  // Unwrap double-stringified JSON if needed
  if (text.startsWith('"') && text.endsWith('"') && (text.includes('\\"blocks\\"') || text.includes('\\"message\\"'))) {
    try {
      const unwrapped = JSON.parse(text);
      if (typeof unwrapped === 'string') text = unwrapped.trim();
    } catch {}
  }

  // Extract fenced JSON blocks (```mya-blocks ... ``` or ```json ... ```)
  const candidates = [];
  let match;
  FENCE_RE.lastIndex = 0;
  while ((match = FENCE_RE.exec(text)) !== null) {
    if (match[1]) candidates.push(match[1].trim());
  }

  // Strip fences from visible prose
  let prose = text
    .replace(FENCE_RE, '')
    .replace(UNCLOSED_FENCE_RE, '')
    .trim();

  // Also check if the whole string (or trailing JSON) is a JSON object/array without fences
  if (candidates.length === 0) {
    if ((prose.startsWith('{') && prose.endsWith('}')) || (prose.startsWith('[') && prose.endsWith(']'))) {
      candidates.push(prose);
    } else {
      const lastFenceIdx = prose.search(/\{\s*"blocks"\s*:/);
      if (lastFenceIdx !== -1) {
        candidates.push(prose.slice(lastFenceIdx));
        prose = prose.slice(0, lastFenceIdx).trim();
      }
    }
  }

  for (const jsonCandidate of candidates) {
    try {
      const parsed = JSON.parse(jsonCandidate);
      if (Array.isArray(parsed)) {
        const km = parseKommunicateArray(parsed);
        if (!prose || prose === jsonCandidate) prose = km.text;
        blocks.push(...km.blocks);
        actions.push(...km.actions);
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.blocks)) {
          const inlineTexts = [];
          parsed.blocks.forEach((rawB, idx) => {
            const norm = normalizeParsedBlock(rawB, idx);
            if (!norm) return;
            if (norm.type === 'text' || norm.type === 'markdown') {
              const t = norm.data?.text || norm.data?.content || '';
              if (t) inlineTexts.push(t);
            } else {
              blocks.push(norm);
            }
          });
          if ((!prose || prose === jsonCandidate) && (parsed.text || inlineTexts.length > 0)) {
            prose = String(parsed.text || inlineTexts.join('\n\n')).trim();
          }
        } else if (parsed.type) {
          const single = normalizeParsedBlock(parsed, 0);
          if (single && single.type !== 'text' && single.type !== 'markdown') {
            blocks.push(single);
            if (prose === jsonCandidate) prose = '';
          }
        } else if (parsed.message && typeof parsed.message === 'string') {
          const km = parseKommunicateArray([parsed]);
          if (!prose || prose === jsonCandidate) prose = km.text;
          blocks.push(...km.blocks);
          actions.push(...km.actions);
        }

        if (Array.isArray(parsed.quickReplies) && parsed.quickReplies.length > 0 && !blocks.some((b) => b.type === 'quick_replies')) {
          const qrNorm = normalizeParsedBlock({ type: 'quick_replies', data: { replies: parsed.quickReplies } }, 99);
          if (qrNorm && Array.isArray(qrNorm.data?.replies) && actions.length === 0) {
            actions.push(...qrNorm.data.replies);
          }
        }
      }
    } catch {
      // Not valid JSON; keep prose as-is
    }
  }

  return markDeserialized({
    ...item,
    id,
    role,
    content: prose,
    timestamp: timestamp || new Date().toISOString(),
    attachments,
    blocks,
    actions,
  });
}

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

    return data.chatHistory.map((item) => deserializeHistoryMessage(item));
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
  STORAGE_KEYS,
  deserializeHistoryMessage
};
