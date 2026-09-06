/**
 * MyaChatBubble
 *
 * Themeable mobile chat bubble primitive for React Native.
 * Zero DOM assumptions.
 */
import { ChatMessage } from '../types';
import { MyaTheme } from './theme';
export interface MyaChatBubbleProps {
    message: ChatMessage;
    theme?: Partial<MyaTheme>;
    onActionPress?: (action: any) => void;
}
export declare function MyaChatBubble({ message, theme }: MyaChatBubbleProps): any;
//# sourceMappingURL=MyaChatBubble.d.ts.map