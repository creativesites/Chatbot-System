/**
 * useMyaRouteSync
 *
 * Route & screen awareness hook for mobile navigation integration.
 * Injects host app screen context into Mya and generates dynamic suggestion starters.
 */

import React from 'react';

export interface MobileScreenContext {
  surface: 'myavana-mobile-app';
  screen: string;
  title?: string;
  params?: Record<string, any>;
}

export const SCREEN_PROMPT_STARTERS: Record<string, string[]> = {
  Home: ['Hair Health Check', 'Today’s Regimen', 'Book Consultation'],
  Regime: ['Wash Day Steps', 'Product Application Order', 'Modify Routine'],
  RegimeDetails: ['Step Instructions', 'Substitute Product', 'Set Reminder'],
  Analysis: ['Explain My Porosity', 'What is My Curl Pattern?', 'Recommended Products'],
  ProductDetails: ['How to Apply This', 'Does this fit my porosity?', 'Ingredients Review'],
  Profile: ['Update Hair Goals', 'Log Journal Entry', 'View Strand History']
};

export function useMyaRouteSync(initialScreen = 'Home', initialParams?: Record<string, any>) {
  const [currentScreen, setCurrentScreen] = React.useState<string>(initialScreen);
  const [params, setParams] = React.useState<Record<string, any> | undefined>(initialParams);

  const syncRoute = React.useCallback((screen: string, newParams?: Record<string, any>) => {
    setCurrentScreen(screen);
    if (newParams) setParams(newParams);
  }, []);

  const screenContext = React.useMemo<MobileScreenContext>(() => {
    return {
      surface: 'myavana-mobile-app',
      screen: currentScreen,
      title: `${currentScreen} Screen`,
      params
    };
  }, [currentScreen, params]);

  const suggestedQuickReplies = React.useMemo<string[]>(() => {
    return SCREEN_PROMPT_STARTERS[currentScreen] || [
      'Hair Care Tips',
      'Ask Mya',
      'View My Hair Profile'
    ];
  }, [currentScreen]);

  return {
    currentScreen,
    screenContext,
    suggestedQuickReplies,
    syncRoute
  };
}
