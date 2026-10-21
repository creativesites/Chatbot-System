/**
 * Theme provider. MYAVANA is the default and the only shipped theme: this is
 * a seam for the host to adjust tokens, not a multi-brand system. Components
 * read `useMyaTheme()`; those not yet migrated still read the MYAVANA constants
 * from ./myaTheme directly, which are the provider's defaults.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { MyaColors, MyaFonts, MyaType, MyaRadii, MyaMotion, MyaShadow, MYA_TOUCH } from './myaTheme';

export const MYAVANA_THEME = Object.freeze({
  colors: MyaColors,
  fonts: MyaFonts,
  type: MyaType,
  radii: MyaRadii,
  motion: MyaMotion,
  shadow: MyaShadow,
  touch: MYA_TOUCH,
});

const ThemeContext = createContext(MYAVANA_THEME);

export function MyaThemeProvider({ theme, children }) {
  const value = useMemo(
    () => ({
      ...MYAVANA_THEME,
      ...(theme || {}),
      colors: { ...MyaColors, ...((theme && theme.colors) || {}) },
      fonts: { ...MyaFonts, ...((theme && theme.fonts) || {}) },
    }),
    [theme]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useMyaTheme() {
  return useContext(ThemeContext);
}
