/**
 * MyaQuickReplies
 *
 * Horizontal scrolling quick replies / action suggestions tray for mobile.
 */
import { MyaTheme } from './theme';
export interface QuickReplyItem {
    id?: string;
    label: string;
    payload?: string;
}
export interface MyaQuickRepliesProps {
    replies: (QuickReplyItem | string)[];
    theme?: Partial<MyaTheme>;
    onSelectReply: (reply: QuickReplyItem) => void;
    disabled?: boolean;
}
export declare function MyaQuickReplies({ replies, theme, onSelectReply, disabled }: MyaQuickRepliesProps): any;
//# sourceMappingURL=MyaQuickReplies.d.ts.map