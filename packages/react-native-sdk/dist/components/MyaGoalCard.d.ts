/**
 * MyaGoalCard
 *
 * Themeable mobile Hair Journey goal tracking card primitive.
 * Displays goal title, target milestone, progress bar, and status badges.
 */
import { MyaTheme } from './theme';
export interface HairGoalData {
    id: string;
    title: string;
    category?: 'growth' | 'moisture' | 'retention' | 'damage_repair' | string;
    targetDate?: string;
    progressPercent?: number;
    currentMilestone?: string;
    isCompleted?: boolean;
}
export interface MyaGoalCardProps {
    goal: HairGoalData;
    theme?: Partial<MyaTheme>;
    onUpdateGoal?: (goalId: string) => void;
}
export declare function MyaGoalCard({ goal, theme, onUpdateGoal }: MyaGoalCardProps): any;
//# sourceMappingURL=MyaGoalCard.d.ts.map