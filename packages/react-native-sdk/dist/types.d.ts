/**
 * Types & Protocol Contracts for MYAVANA React Native SDK
 *
 * Grounded in the canonical chat protocol (packages/chat-protocol)
 * with zero DOM assumptions.
 */
export declare const FrameType: {
    readonly DELTA: 'delta';
    readonly TEXT_DELTA: 'text_delta';
    readonly BLOCK: 'block';
    readonly ACTION: 'action';
    readonly METADATA: 'metadata';
    readonly TOOL_CALL: 'tool_call';
    readonly DONE: 'done';
    readonly ERROR: 'error';
};
export type FrameTypeValue = typeof FrameType[keyof typeof FrameType];
export declare const BlockType: {
    readonly TEXT: 'text';
    readonly MARKDOWN: 'markdown';
    readonly DIVIDER: 'divider';
    readonly QUICK_REPLIES: 'quick_replies';
    readonly CONFIRMATION: 'confirmation';
    readonly NAVIGATION: 'navigation';
    readonly GOAL_CARD: 'goal_card';
    readonly GOAL_PROGRESS: 'goal_progress';
    readonly GOAL_LIST: 'goal_list';
    readonly ROUTINE_CARD: 'routine_card';
    readonly ROUTINE_CHECKLIST: 'routine_checklist';
    readonly TODAY_CHECKLIST: 'today_checklist';
    readonly JOURNAL_ENTRY: 'journal_entry';
    readonly JOURNEY_PROGRESS: 'journey_progress';
    readonly HAIR_PROFILE_SUMMARY: 'hair_profile_summary';
    readonly CONSULTATION_CARD: 'consultation_card';
    readonly SERVICE_CARD: 'service_card';
};
export type BlockTypeValue = typeof BlockType[keyof typeof BlockType];
export declare const ActionType: {
    readonly NAVIGATE: 'navigate';
    readonly COMPLETE_STEP: 'complete_step';
    readonly CREATE_GOAL: 'create_goal';
    readonly UPDATE_GOAL: 'update_goal';
    readonly LOG_ENTRY: 'log_entry';
    readonly UPLOAD_PHOTO: 'upload_photo';
    readonly QUICK_REPLY: 'quick_reply';
    readonly OPEN_URL: 'open_url';
};
export type ActionTypeValue = typeof ActionType[keyof typeof ActionType];
export interface ChatBlock {
    id: string;
    type: BlockTypeValue | string;
    title?: string;
    data?: Record<string, any>;
    [key: string]: any;
}
export interface ChatAction {
    type: ActionTypeValue | string;
    label: string;
    payload?: any;
    [key: string]: any;
}
export interface ChatFrame {
    t?: FrameTypeValue | string;
    type?: FrameTypeValue | string;
    text?: string;
    delta?: string;
    block?: ChatBlock;
    actions?: ChatAction[];
    meta?: Record<string, any>;
    metadata?: Record<string, any>;
    tool?: string;
    toolCall?: Record<string, any>;
    code?: string;
    message?: string;
    [key: string]: any;
}
export type MessageRole = 'user' | 'assistant' | 'system';
export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: string;
    blocks?: ChatBlock[];
    actions?: ChatAction[];
    isStreaming?: boolean;
    error?: boolean;
    metadata?: Record<string, any>;
}
export type MobilePlatform = 'react-native-ios' | 'react-native-android' | 'react-native-unknown';
export interface DeviceTelemetryPayload {
    platform: MobilePlatform;
    appVersion?: string;
    sdkVersion: string;
    deviceModel?: string;
    osVersion?: string;
    locale?: string;
    networkType?: string;
    [key: string]: any;
}
export interface ScreenContext {
    surface: 'myavana-mobile-app' | string;
    screen: string;
    title?: string;
    routeParams?: Record<string, any>;
    activeTab?: string;
    [key: string]: any;
}
export interface MyaPlatformAdapter {
    name: string;
    platform: MobilePlatform | 'react-native' | string;
    getJourney?: () => Promise<any>;
    getHairProfile?: () => Promise<HairStrandData | null>;
    openCamera?: (options?: {
        mode?: 'strand' | 'scalp' | 'face';
    }) => void;
    openEntryComposer?: () => void;
    navigate?: (route: string, params?: Record<string, any>) => void;
    onActionDispatched?: (action: ChatAction) => boolean | void;
}
export interface MyaClientOptions {
    apiBase: string;
    userId?: string;
    conversationId?: string;
    authToken?: string;
    telemetry?: Partial<DeviceTelemetryPayload>;
    storage?: StorageAdapter;
    timeoutMs?: number;
    headers?: Record<string, string>;
    platformAdapter?: MyaPlatformAdapter;
    screenContext?: ScreenContext;
}
export interface SendMessageOptions {
    message: string;
    conversationId?: string;
    experienceContext?: Record<string, any>;
    onDelta?: (delta: string, accumulated: string) => void;
    onBlock?: (block: ChatBlock) => void;
    onAction?: (action: ChatAction) => void;
    onFrame?: (frame: ChatFrame) => void;
    onDone?: (meta: Record<string, any>) => void;
    onError?: (error: Error) => void;
    signal?: AbortSignal;
}
import type { StorageAdapter } from './storage/StorageAdapter';
export type { StorageAdapter };
export interface BlockFrame {
    id?: string;
    type: string;
    block_type?: string;
    data: any;
    [key: string]: any;
}
export interface UseMyaChatOptions {
    apiBase?: string;
    initialUserId?: string;
    initialConversationId?: string;
    telemetry?: Partial<DeviceTelemetryPayload>;
    storage?: StorageAdapter;
    client?: any;
    persistMessages?: boolean;
    persistKey?: string;
    onStreamComplete?: (message: ChatMessage) => void;
    onError?: (error: Error) => void;
}
export interface UseMyaChatReturn {
    messages: ChatMessage[];
    isStreaming: boolean;
    isThinking: boolean;
    error: Error | null;
    activeBlocks: ChatBlock[];
    activeActions: ChatAction[];
    conversationId: string;
    userId: string;
    sendMessage: (text: string, customContext?: Record<string, any>) => Promise<void>;
    abortStream: () => void;
    restartConversation: () => Promise<string>;
    setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    clearCachedMessages: () => Promise<void>;
}
export interface HairStrandData {
    hairType?: string;
    porosity?: 'Low' | 'Medium' | 'High' | string;
    density?: 'Low' | 'Medium' | 'High' | string;
    elasticity?: 'Low' | 'Normal' | 'High' | string;
    curlPattern?: string;
    strandThickness?: 'Fine' | 'Medium' | 'Coarse' | string;
    overallHealthScore?: number;
    recommendedProducts?: Array<{
        id: string;
        name: string;
        brand?: string;
        url?: string;
    }>;
}
export interface RoutineStep {
    id: string;
    title: string;
    description?: string;
    durationMinutes?: number;
    isCompleted?: boolean;
    productRecommendation?: string;
}
export interface RoutineData {
    id: string;
    title: string;
    frequency?: string;
    steps: RoutineStep[];
}
export declare function createId(prefix?: string): string;
//# sourceMappingURL=types.d.ts.map