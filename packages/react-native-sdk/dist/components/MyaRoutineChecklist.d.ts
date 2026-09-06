/**
 * MyaRoutineChecklist
 *
 * Themeable mobile Hair Journey routine checklist primitive.
 * Supports interactive step toggling, duration indicators, and product pairings.
 */
import { RoutineData } from '../types';
import { MyaTheme } from './theme';
export interface MyaRoutineChecklistProps {
    routine: RoutineData;
    theme?: Partial<MyaTheme>;
    onToggleStep?: (stepId: string, isCompleted: boolean) => void;
}
export declare function MyaRoutineChecklist({ routine, theme, onToggleStep }: MyaRoutineChecklistProps): any;
//# sourceMappingURL=MyaRoutineChecklist.d.ts.map