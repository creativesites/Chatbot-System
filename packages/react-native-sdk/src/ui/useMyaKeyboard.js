/**
 * useMyaKeyboard
 *
 * Keyboard height on the UI thread via Reanimated's useAnimatedKeyboard, so the
 * composer rides the keyboard frame by frame with no JS-thread work and no
 * guessing at the IME's duration or curve.
 *
 * Why not KeyboardAvoidingView: with edge-to-edge enabled the window no longer
 * resizes and the IME arrives as an inset, so `behavior: undefined` on Android
 * does nothing at all.
 *
 * `keyboardHeight` is a shared value. Use useKeyboardMarginStyle() to apply it.
 * `isKeyboardOpen` is a plain boolean for layout decisions (e.g. safe-area padding).
 */

import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

export default function useMyaKeyboard() {
  const kb = useAnimatedKeyboard();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvt, () => setIsOpen(true));
    const subHide = Keyboard.addListener(hideEvt, () => setIsOpen(false));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  return { keyboardHeight: kb.height, isKeyboardOpen: isOpen };
}

/**
 * Animated style that lifts a view by the keyboard height. Accepts the shared
 * value from useMyaKeyboard, or a plain number (hosts and tests that stub the hook).
 */
export function useKeyboardMarginStyle(keyboardHeight) {
  const shared = keyboardHeight !== null && typeof keyboardHeight === 'object' && 'value' in keyboardHeight;
  const fixed = shared ? 0 : Number(keyboardHeight) || 0;
  return useAnimatedStyle(() => ({ marginBottom: shared ? keyboardHeight.value : fixed }));
}
