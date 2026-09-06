/**
 * useMyaRouteSync
 *
 * Route & screen awareness hook for mobile navigation integration.
 * Injects host app screen context into Mya and generates dynamic suggestion starters.
 */
export interface MobileScreenContext {
    surface: 'myavana-mobile-app';
    screen: string;
    title?: string;
    params?: Record<string, any>;
}
export declare const SCREEN_PROMPT_STARTERS: Record<string, string[]>;
export declare function useMyaRouteSync(initialScreen?: string, initialParams?: Record<string, any>): {
    currentScreen: string;
    screenContext: MobileScreenContext;
    suggestedQuickReplies: string[];
    syncRoute: (screen: string, newParams?: Record<string, any>) => void;
};
//# sourceMappingURL=useMyaRouteSync.d.ts.map