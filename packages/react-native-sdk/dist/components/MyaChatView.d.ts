/**
 * MyaChatView
 *
 * Full drop-in React Native chat screen component for the MYAVANA mobile application.
 * Integrates message list, stream bubbles, generative hair UI cards, quick replies,
 * and keyboard-aware input composer.
 */
import { MyaTheme } from './theme';
import { QuickReplyItem } from './MyaQuickReplies';
import { ChatMessage, BlockFrame } from '../types';
export interface MyaChatViewProps {
    messages: ChatMessage[];
    streamingText?: string;
    isStreaming?: boolean;
    activeBlocks?: BlockFrame[];
    quickReplies?: (QuickReplyItem | string)[];
    theme?: Partial<MyaTheme>;
    title?: string;
    subtitle?: string;
    placeholder?: string;
    onSendMessage: (text: string) => void;
    onSelectQuickReply?: (reply: QuickReplyItem) => void;
    onPressAction?: (actionName: string, payload?: any) => void;
    onPressVoice?: () => void;
    onClearSession?: () => void;
}
export declare function MyaChatView({ messages, streamingText, isStreaming, activeBlocks, quickReplies, theme, title, subtitle, placeholder, onSendMessage, onSelectQuickReply, onPressAction, onPressVoice, onClearSession }: MyaChatViewProps): any;
//# sourceMappingURL=MyaChatView.d.ts.map