/**
 * useMyaRouteSync (CommonJS)
 */

const { useState, useCallback, useMemo } = require('react');

const SCREEN_PROMPT_STARTERS = {
  Home: ['Hair Health Check', 'Today’s Regimen', 'Book Consultation'],
  Regime: ['Wash Day Steps', 'Product Application Order', 'Modify Routine'],
  RegimeDetails: ['Step Instructions', 'Substitute Product', 'Set Reminder'],
  Analysis: ['Explain My Porosity', 'What is My Curl Pattern?', 'Recommended Products'],
  ProductDetails: ['How to Apply This', 'Does this fit my porosity?', 'Ingredients Review'],
  Profile: ['Update Hair Goals', 'Log Journal Entry', 'View Strand History']
};

function useMyaRouteSync(initialScreen = 'Home', initialParams) {
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [params, setParams] = useState(initialParams);

  const syncRoute = useCallback((screen, newParams) => {
    setCurrentScreen(screen);
    if (newParams) setParams(newParams);
  }, []);

  const screenContext = useMemo(() => {
    return {
      surface: 'myavana-mobile-app',
      page: `app://${String(currentScreen || 'home').toLowerCase()}`,
      route: currentScreen,
      screen: currentScreen,
      title: `${currentScreen} Screen`,
      params
    };
  }, [currentScreen, params]);

  const suggestedQuickReplies = useMemo(() => {
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

module.exports = {
  useMyaRouteSync,
  SCREEN_PROMPT_STARTERS
};
