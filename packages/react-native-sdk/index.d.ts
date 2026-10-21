/**
 * TypeScript Type Definitions for @myavana/react-native-sdk
 */

export interface FrameType {
  DELTA: 'delta';
  TEXT_DELTA: 'text_delta';
  BLOCK: 'block';
  ACTION: 'action';
  METADATA: 'metadata';
  TOOL_CALL: 'tool_call';
  DONE: 'done';
  ERROR: 'error';
}

export interface BlockType {
  TEXT: 'text';
  MARKDOWN: 'markdown';
  DIVIDER: 'divider';
  QUICK_REPLIES: 'quick_replies';
  CONFIRMATION: 'confirmation';
  NAVIGATION: 'navigation';
  GOAL_CARD: 'goal_card';
  GOAL_PROGRESS: 'goal_progress';
  GOAL_LIST: 'goal_list';
  ROUTINE_CARD: 'routine_card';
  ROUTINE_CHECKLIST: 'routine_checklist';
  TODAY_CHECKLIST: 'today_checklist';
  JOURNAL_ENTRY: 'journal_entry';
  JOURNEY_PROGRESS: 'journey_progress';
  HAIR_PROFILE_CARD: 'hair_profile_card';
  HAIR_PROFILE_SUMMARY: 'hair_profile_summary';
  CONSULTATION_CARD: 'consultation_card';
  SERVICE_CARD: 'service_card';
  PRODUCT: 'product';
  PRODUCT_CARD: 'product_card';
  PRODUCT_LIST: 'product_list';
  MEDIA_CARD: 'media_card';
  HAIRSTYLE_CARD: 'hairstyle_card';
  COMMUNITY_POST: 'community_post';
}

export interface ActionType {
  NAVIGATE: 'navigate';
  COMPLETE_STEP: 'complete_step';
  CREATE_GOAL: 'create_goal';
  UPDATE_GOAL: 'update_goal';
  LOG_ENTRY: 'log_entry';
  UPLOAD_PHOTO: 'upload_photo';
  QUICK_REPLY: 'quick_reply';
  OPEN_URL: 'open_url';
}

export interface MyaTheme {
  colors?: {
    primary?: string;
    primaryLight?: string;
    accent?: string;
    accentLight?: string;
    accentContrast?: string;
    background?: string;
    surface?: string;
    surfaceElevated?: string;
    textPrimary?: string;
    textSecondary?: string;
    textMuted?: string;
    border?: string;
    userBubbleBackground?: string;
    userBubbleText?: string;
    assistantBubbleBackground?: string;
    assistantBubbleText?: string;
    success?: string;
    warning?: string;
    error?: string;
    onyx?: string;
    stone?: string;
    white?: string;
    sand?: string;
    coral?: string;
    blush?: string;
    blueberry?: string;
  };
  typography?: {
    fontFamilyRegular?: string;
    fontFamilyMedium?: string;
    fontFamilySemiBold?: string;
    fontFamilyBold?: string;
    letterSpacingBody?: number;
    letterSpacingHeading?: number;
    fontSizeSmall?: number;
    fontSizeMedium?: number;
    fontSizeLarge?: number;
    fontSizeTitle?: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
  error?: boolean;
  /** Reply was cut short; the text that arrived is kept. */
  interrupted?: boolean;
  errorKind?: MyaErrorKind;
  /** The member stopped this reply. */
  stopped?: boolean;
  blocks?: any[];
  actions?: any[];
  attachments?: any[];
  metadata?: any;
}

export interface ScreenContext {
  surface?: string;
  page?: string;
  route?: string;
  screen?: string;
  title?: string;
  params?: any;
}

export interface MyaMobileClientOptions {
  apiBase: string;
  userId?: string;
  conversationId?: string;
  authToken?: string;
  headers?: Record<string, string>;
  telemetry?: any;
  storage?: any;
}

export class MyaMobileClient {
  constructor(options: MyaMobileClientOptions);
  init(): Promise<void>;
  getUserId(): string;
  setUserId(newUserId: string): Promise<void>;
  getConversationId(): string;
  setConversationId(newConvId: string): Promise<void>;
  createNewConversation(): Promise<string>;
  setAuthToken(token?: string): void;
  getAuthToken(): string | undefined;
  setCustomHeaders(headers: Record<string, string>): void;
  setScreenContext(context: ScreenContext): void;
  getScreenContext(): ScreenContext | undefined;
  abort(): void;
  sendMessage(options: {
    message: string;
    conversationId?: string;
    experienceContext?: any;
    attachments?: any[];
    onFrame?: (frame: any) => void;
    onDelta?: (delta: string, accumulated: string) => void;
    onBlock?: (block: any) => void;
    onAction?: (action: any) => void;
    onDone?: (meta: any) => void;
    onError?: (err: Error) => void;
    signal?: any;
  }): Promise<{ content: string; blocks: any[]; actions: any[] }>;
  fetchConversationHistory(conversationId?: string): Promise<ChatMessage[]>;
  fetchUserConversations(): Promise<any[]>;
  fetchJournalEntries(options?: { perPage?: number }): Promise<{ result: any; blocks: any[] }>;
  createJournalEntry(entryData: any): Promise<{ result: any; blocks: any[] }>;
}

export type MyaErrorKind = 'offline' | 'timeout' | 'server' | 'auth' | 'aborted' | 'attachment' | 'config' | 'unknown';

export interface MyaError extends Error {
  kind: MyaErrorKind;
  status?: number;
  /** Safe, human copy for this kind of failure. */
  userMessage: string;
  rejected?: Array<{ name: string; reason: 'not_readable' | 'too_large' | 'too_many' }>;
}

export interface UnsentDraft {
  text: string;
  attachments: any[];
  reason: MyaErrorKind;
}

export interface NormalizedAttachments {
  ready: Array<{ url: string; mimeType: string; name: string }>;
  rejected: Array<{ name: string; reason: 'not_readable' | 'too_large' | 'too_many' }>;
}

export const MAX_ATTACHMENTS: number;
export function normalizeAttachments(list: any[]): NormalizedAttachments;
export function classifyError(err: unknown): { kind: MyaErrorKind; status: number | null; message: string };
export function errorCopy(kind: MyaErrorKind): string;

export interface UseMyaChatOptions {
  apiBase?: string;
  client?: MyaMobileClient;
  initialUserId?: string;
  initialConversationId?: string;
  authToken?: string;
  headers?: Record<string, string>;
  telemetry?: any;
  storage?: any;
  persistMessages?: boolean;
  persistKey?: string;
  onStreamComplete?: (msg: ChatMessage) => void;
  onError?: (err: Error) => void;
}

export interface UseMyaChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  isThinking: boolean;
  error: MyaError | null;
  activeBlocks: any[];
  activeActions: any[];
  conversationId: string;
  userId: string;
  client: MyaMobileClient;
  sendMessage: (text: string, customContext?: any, sendOptions?: { attachments?: any[] }) => Promise<void>;
  abortStream: () => void;
  restartConversation: () => Promise<string>;
  loadConversation: (targetConvId: string) => Promise<ChatMessage[]>;
  fetchConversations: () => Promise<any[]>;
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  clearCachedMessages: () => Promise<void>;
  /** Logout: forget stored user, conversation and cached messages. */
  clearSession: () => Promise<void>;
  /** Set when a turn failed before Mya replied; put it back in the composer. */
  unsentDraft: UnsentDraft | null;
  clearUnsentDraft: () => void;
  updateAuthToken: (token?: string) => void;
  updateUserId: (newUserId: string) => Promise<void>;
}

export function useMyaChat(options?: UseMyaChatOptions): UseMyaChatReturn;

export function useMyaRouteSync(
  initialScreen?: string,
  initialParams?: any
): {
  currentScreen: string;
  screenContext: ScreenContext;
  suggestedQuickReplies: string[];
  syncRoute: (screen: string, newParams?: any) => void;
};

export class MyaVoiceClient {
  constructor(options: { apiBase: string; authToken?: string; headers?: Record<string, string>; timeoutMs?: number });
  transcribe(audio: any, options?: { mimeType?: string; language?: string }): Promise<{ text: string; confidence?: number; durationSeconds?: number }>;
  sendVoiceQuery(audio: any, context?: any): Promise<{ transcript: string }>;
}

export const FrameType: FrameType;
export const BlockType: BlockType;
export const ActionType: ActionType;
export function createId(prefix?: string): string;
