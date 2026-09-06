/**
 * MyaMobileClient
 *
 * Headless mobile client managing conversational state, device telemetry attribution,
 * and streaming NDJSON communication with the MYAVANA Cloud Run backend.
 */

import {
  ChatAction,
  ChatBlock,
  ChatMessage,
  DeviceTelemetryPayload,
  MyaClientOptions,
  MyaPlatformAdapter,
  ScreenContext,
  SendMessageOptions,
  StorageAdapter
} from '../types';
import { createId } from '../types';
import { createDefaultStorage } from '../storage/StorageAdapter';
import { enrichExperienceContext, getDeviceTelemetry } from '../telemetry/deviceTelemetry';
import { streamFetch } from './StreamAdapter';

const STORAGE_KEYS = {
  USER_ID: 'myavana_mobile_user_id',
  CONVERSATION_ID: 'myavana_mobile_conversation_id'
};

export class MyaMobileClient {
  public readonly apiBase: string;
  private userId: string;
  private conversationId: string;
  private authToken?: string;
  private telemetryOverrides?: Partial<DeviceTelemetryPayload>;
  private storage: StorageAdapter;
  private customHeaders: Record<string, string>;
  private activeAbortController: AbortController | null = null;
  private platformAdapter?: MyaPlatformAdapter;
  private screenContext?: ScreenContext;

  constructor(options: MyaClientOptions) {
    if (!options.apiBase) {
      throw new Error('MyaMobileClient requires apiBase');
    }
    // Clean trailing slash
    this.apiBase = options.apiBase.replace(/\/+$/, '');
    this.userId = options.userId || createId('usr');
    this.conversationId = options.conversationId || createId('conv');
    this.authToken = options.authToken;
    this.telemetryOverrides = options.telemetry;
    this.storage = createDefaultStorage(options.storage);
    this.customHeaders = options.headers || {};
    this.platformAdapter = options.platformAdapter;
    this.screenContext = options.screenContext;
  }

  /**
   * Initializes client state from mobile storage.
   */
  public async init(): Promise<void> {
    try {
      const storedUserId = await this.storage.getItem(STORAGE_KEYS.USER_ID);
      if (storedUserId) {
        this.userId = storedUserId;
      } else {
        await this.storage.setItem(STORAGE_KEYS.USER_ID, this.userId);
      }

      const storedConvId = await this.storage.getItem(STORAGE_KEYS.CONVERSATION_ID);
      if (storedConvId) {
        this.conversationId = storedConvId;
      } else {
        await this.storage.setItem(STORAGE_KEYS.CONVERSATION_ID, this.conversationId);
      }
    } catch (err: any) {
      console.warn('[MyaMobileClient] Storage init warning:', err.message);
    }
  }

  public getUserId(): string {
    return this.userId;
  }

  public async setUserId(newUserId: string): Promise<void> {
    this.userId = newUserId;
    await this.storage.setItem(STORAGE_KEYS.USER_ID, newUserId);
  }

  public getConversationId(): string {
    return this.conversationId;
  }

  public async setConversationId(newConvId: string): Promise<void> {
    this.conversationId = newConvId;
    await this.storage.setItem(STORAGE_KEYS.CONVERSATION_ID, newConvId);
  }

  /**
   * Resets and provisions a fresh conversation thread.
   */
  public async createNewConversation(): Promise<string> {
    const newId = createId('conv');
    await this.setConversationId(newId);
    return newId;
  }

  public getStorage(): StorageAdapter {
    return this.storage;
  }

  /**
   * Registers a platform adapter for native host integration (mirrors web registerPlatformAdapter).
   */
  public registerPlatformAdapter(adapter: MyaPlatformAdapter): void {
    this.platformAdapter = adapter;
  }

  public getPlatformAdapter(): MyaPlatformAdapter | undefined {
    return this.platformAdapter;
  }

  /**
   * Sets the active screen/route context for screen awareness.
   */
  public setScreenContext(context: ScreenContext): void {
    this.screenContext = context;
  }

  public getScreenContext(): ScreenContext | undefined {
    return this.screenContext;
  }

  /**
   * Aborts any currently active streaming request.
   */
  public abort(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }

  /**
   * Sends a user chat message to /chat/stream and parses the NDJSON response.
   */
  public async sendMessage(options: SendMessageOptions): Promise<{
    content: string;
    blocks: ChatBlock[];
    actions: ChatAction[];
  }> {
    this.abort(); // Cancel previous stream if in flight
    this.activeAbortController = new AbortController();

    const targetConvId = options.conversationId || this.conversationId;
    const streamUrl = `${this.apiBase}/chat/stream`;

    // 1. Enrich experience context with active screen context and device platform metadata
    const mergedExpContext = {
      ...(this.screenContext ? { screenContext: this.screenContext } : {}),
      ...options.experienceContext
    };

    const experienceContext = enrichExperienceContext(
      mergedExpContext,
      this.telemetryOverrides
    );

    // 2. Build canonical request payload
    const requestPayload = {
      message: options.message,
      from: this.userId,
      userId: this.userId,
      groupId: targetConvId,
      conversationId: targetConvId,
      format: 'ndjson',
      experienceContext
    };

    const headers: Record<string, string> = {
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
      const result = await streamFetch(
        streamUrl,
        {
          method: 'POST',
          headers,
          body: requestPayload,
          signal: options.signal || this.activeAbortController.signal
        },
        {
          onFrame: options.onFrame,
          onDelta: options.onDelta,
          onBlock: options.onBlock,
          onAction: (action) => {
            // Forward action to caller callback
            options.onAction?.(action);
            // Optionally forward action to registered native platform adapter
            this.platformAdapter?.onActionDispatched?.(action);
          },
          onDone: options.onDone,
          onError: options.onError
        }
      );

      return {
        content: result.accumulatedText,
        blocks: result.blocks,
        actions: result.actions
      };
    } finally {
      this.activeAbortController = null;
    }
  }

  /**
   * Fetches conversation history from backend.
   */
  public async fetchConversationHistory(conversationId?: string): Promise<ChatMessage[]> {
    const targetId = conversationId || this.conversationId;
    const url = `${this.apiBase}/conversations/${targetId}?userId=${encodeURIComponent(this.userId)}`;

    const headers: Record<string, string> = {
      'X-User-Id': this.userId,
      ...this.customHeaders
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch history: HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !Array.isArray(data.chatHistory)) {
      return [];
    }

    return data.chatHistory.map((item: any) => ({
      id: item.id || createId('msg'),
      role: (item.role === 'assistant' || item.role === 'model') ? 'assistant' : 'user',
      content: item.content || item.message || '',
      timestamp: item.timestamp || new Date().toISOString(),
      blocks: item.blocks || [],
      actions: item.actions || []
    }));
  }

  /**
   * Returns current telemetry payload.
   */
  public getTelemetry(): DeviceTelemetryPayload {
    return getDeviceTelemetry(this.telemetryOverrides);
  }
}
