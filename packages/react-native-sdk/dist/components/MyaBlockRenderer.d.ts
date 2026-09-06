/**
 * MyaBlockRenderer
 *
 * Universal generative UI block dispatcher for mobile.
 * Inspects block type and delegates to the appropriate specialized card.
 */
import { MyaTheme } from './theme';
import { SpecialistProfile } from './MyaConsultationCard';
import { QuickReplyItem } from './MyaQuickReplies';
import { BlockFrame } from '../types';
export interface MyaBlockRendererProps {
    block: BlockFrame | {
        type: string;
        block_type?: string;
        data: any;
    };
    theme?: Partial<MyaTheme>;
    onPressAction?: (actionName: string, payload?: any) => void;
    onSelectQuickReply?: (reply: QuickReplyItem) => void;
    onToggleRoutineStep?: (stepId: string, completed: boolean) => void;
    onPressJournalEntry?: (entryId: string) => void;
    onBookConsultation?: (specialist: SpecialistProfile) => void;
}
export declare function MyaBlockRenderer({ block, theme, onPressAction, onSelectQuickReply, onToggleRoutineStep, onPressJournalEntry, onBookConsultation }: MyaBlockRendererProps): any;
//# sourceMappingURL=MyaBlockRenderer.d.ts.map