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

export const defaultMyaTheme: MyaTheme = {
  colors: {
    primary: '#1F1B24',
    primaryLight: '#332D3B',
    accentGold: '#D4AF37',
    accentGoldLight: '#F5E8C7',
    background: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceElevated: '#F9F6F0',
    textPrimary: '#1E1E1E',
    textSecondary: '#5A5560',
    textMuted: '#9B96A0',
    border: '#E8E4DF',
    userBubbleBackground: '#1F1B24',
    userBubbleText: '#FFFFFF',
    assistantBubbleBackground: '#FFFFFF',
    assistantBubbleText: '#1E1E1E',
    success: '#2E7D32',
    warning: '#ED6C02',
    error: '#D32F2F'
  },
  typography: {
    fontSizeSmall: 12,
    fontSizeMedium: 14,
    fontSizeLarge: 16,
    fontSizeTitle: 18
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    full: 999
  }
};
