/**
 * Default Theme Tokens for MYAVANA Mobile UI Primitives
 *
 * Grounded in MYAVANA brand colors: Gold, Slate/Charcoal, Soft Cream, Warm Rose.
 */
export interface MyaTheme {
    colors: {
        primary: string;
        primaryLight: string;
        accentGold: string;
        accentGoldLight: string;
        background: string;
        surface: string;
        surfaceElevated: string;
        textPrimary: string;
        textSecondary: string;
        textMuted: string;
        border: string;
        userBubbleBackground: string;
        userBubbleText: string;
        assistantBubbleBackground: string;
        assistantBubbleText: string;
        success: string;
        warning: string;
        error: string;
    };
    typography: {
        fontFamilyHeading?: string;
        fontFamilyBody?: string;
        fontSizeSmall: number;
        fontSizeMedium: number;
        fontSizeLarge: number;
        fontSizeTitle: number;
    };
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
    borderRadius: {
        sm: number;
        md: number;
        lg: number;
        full: number;
    };
}
export declare const defaultMyaTheme: MyaTheme;
//# sourceMappingURL=theme.d.ts.map