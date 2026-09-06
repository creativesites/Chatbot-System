/**
 * MyaJournalCard
 *
 * Themeable mobile Hair Journal entry preview card.
 * Displays date, mood indicator, washday tag, journal notes, and photo thumbnail.
 */
import { MyaTheme } from './theme';
export interface HairJournalEntryData {
    id: string;
    date: string;
    mood?: string;
    notes: string;
    isWashDay?: boolean;
    productsUsed?: string[];
    photoUrl?: string;
}
export interface MyaJournalCardProps {
    entry: HairJournalEntryData;
    theme?: Partial<MyaTheme>;
    onPressEntry?: (entryId: string) => void;
}
export declare function MyaJournalCard({ entry, theme, onPressEntry }: MyaJournalCardProps): any;
//# sourceMappingURL=MyaJournalCard.d.ts.map