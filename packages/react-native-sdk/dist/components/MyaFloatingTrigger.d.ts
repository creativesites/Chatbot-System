/**
 * MyaFloatingTrigger
 *
 * Floating Action Button (FAB) launcher for the Mya AI concierge on mobile.
 * Positioned fixed/absolute at the bottom corner with MYAVANA gold branding.
 */
import { MyaTheme } from './theme';
export interface MyaFloatingTriggerProps {
    onPress: () => void;
    unreadCount?: number;
    theme?: Partial<MyaTheme>;
    position?: 'bottom-right' | 'bottom-left';
    label?: string;
}
export declare function MyaFloatingTrigger({ onPress, unreadCount, theme, position, label }: MyaFloatingTriggerProps): any;
//# sourceMappingURL=MyaFloatingTrigger.d.ts.map