/**
 * MyaMobileClient
 *
 * Headless mobile client managing conversational state, device telemetry attribution,
 * and streaming NDJSON communication with the MYAVANA Cloud Run backend.
 */
import { ChatAction, ChatBlock, ChatMessage, DeviceTelemetryPayload, MyaClientOptions, MyaPlatformAdapter, ScreenContext, SendMessageOptions, StorageAdapter } from '../types';
export declare class MyaMobileClient {
    readonly apiBase: string;
    private userId;
    private conversationId;
    private authToken?;
    private telemetryOverrides?;
    private storage;
    private customHeaders;
    private activeAbortController;
    private platformAdapter?;
    private screenContext?;
    constructor(options: MyaClientOptions);
    /**
     * Initializes client state from mobile storage.
     */
    init(): Promise<void>;
    getUserId(): string;
    setUserId(newUserId: string): Promise<void>;
    getConversationId(): string;
    setConversationId(newConvId: string): Promise<void>;
    /**
     * Resets and provisions a fresh conversation thread.
     */
    createNewConversation(): Promise<string>;
    getStorage(): StorageAdapter;
    /**
     * Registers a platform adapter for native host integration (mirrors web registerPlatformAdapter).
     */
    registerPlatformAdapter(adapter: MyaPlatformAdapter): void;
    getPlatformAdapter(): MyaPlatformAdapter | undefined;
    /**
     * Sets the active screen/route context for screen awareness.
     */
    setScreenContext(context: ScreenContext): void;
    getScreenContext(): ScreenContext | undefined;
    /**
     * Aborts any currently active streaming request.
     */
    abort(): void;
    /**
     * Sends a user chat message to /chat/stream and parses the NDJSON response.
     */
    sendMessage(options: SendMessageOptions): Promise<{
        content: string;
        blocks: ChatBlock[];
        actions: ChatAction[];
    }>;
    /**
     * Fetches conversation history from backend.
     */
    fetchConversationHistory(conversationId?: string): Promise<ChatMessage[]>;
    /**
     * Returns current telemetry payload.
     */
    getTelemetry(): DeviceTelemetryPayload;
}
//# sourceMappingURL=MyaMobileClient.d.ts.map