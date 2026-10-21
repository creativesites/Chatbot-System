/**
 * Default Theme Tokens for MYAVANA Mobile UI Primitives (JavaScript implementation)
 */

const defaultMyaTheme = {
  colors: {
    primary: '#222323',
    primaryLight: '#383838',
    accent: '#E7A690',
    accentLight: '#FCE5D7',
    accentContrast: '#4A4D68',
    // Backward compatibility aliases for previous gold tokens:
    accentGold: '#E7A690',
    accentGoldLight: '#FCE5D7',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceElevated: '#F5F5F7',
    textPrimary: '#222323',
    textSecondary: '#555454',
    textMuted: '#A9AFAF',
    border: '#F0F0F3',
    userBubbleBackground: '#222323',
    userBubbleText: '#FFFFFF',
    assistantBubbleBackground: '#FFFFFF',
    assistantBubbleText: '#222323',
    success: '#2E7D32',
    warning: '#ED6C02',
    error: '#D32F2F',
    // Explicit MYAVANA Brand Guideline spectrum:
    onyx: '#222323',
    stone: '#F5F5F7',
    white: '#FFFFFF',
    sand: '#EEECE1',
    coral: '#E7A690',
    blush: '#FCE5D7',
    blueberry: '#4A4D68'
  },
  typography: {
    fontFamilyRegular: 'Archivo-Regular',
    fontFamilyMedium: 'Archivo-Medium',
    fontFamilySemiBold: 'Archivo-SemiBold',
    fontFamilyBold: 'Archivo-Bold',
    letterSpacingBody: -0.2,
    letterSpacingHeading: -0.3,
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

module.exports = {
  defaultMyaTheme
};
