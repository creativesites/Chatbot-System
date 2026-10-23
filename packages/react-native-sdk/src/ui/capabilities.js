/**
 * Optional capabilities the host can inject: haptics, a gradient component, a
 * blur component. The SDK never imports a native library for these, so adding
 * (or not adding) a dependency in the app never breaks the SDK. When absent,
 * each degrades to a plain, honest fallback.
 *
 *   <MyaCapabilitiesProvider value={{ haptics, LinearGradient, BlurView }}>
 *
 * haptics: { light(), medium(), success() }  (each optional)
 */

import React, { createContext, useContext, useMemo } from 'react';

const Ctx = createContext({});

export function MyaCapabilitiesProvider({ value, children }) {
  const v = useMemo(() => value || {}, [value]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useMyaCapabilities() {
  return useContext(Ctx);
}

/** Haptics that can never throw and never exist when the host gave none. */
export function useHaptics() {
  const { haptics } = useContext(Ctx);
  return useMemo(() => {
    const call = (name) => () => {
      try {
        if (haptics && typeof haptics[name] === 'function') haptics[name]();
      } catch (e) {
        // A haptic must never break the UI.
      }
    };
    return { light: call('light'), medium: call('medium'), success: call('success') };
  }, [haptics]);
}
