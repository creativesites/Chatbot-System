/**
 * useMyaKeyboard
 *
 * Keyboard height, animated on the system's own duration and curve.
 *
 * Why this exists rather than KeyboardAvoidingView: the previous screen used
 * `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`, and an undefined
 * behavior on Android does nothing at all. Combined with edgeToEdgeEnabled=true
 * on compileSdk 36 — where the window no longer resizes and the IME arrives as
 * an inset instead — the composer had no reliable way to stay above the
 * keyboard. This reads the real event and animates to it.
 *
 * Satisfies K1 (composer flush to the keyboard) and K4 (no jump: we borrow the
 * IME's own duration instead of guessing 250ms).
 */

import { useEffect, useRef, useState } from 'react';
import { Keyboard, Animated, Platform, Easing } from 'react-native';

export default function useMyaKeyboard() {
  const height = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // iOS reports `will` events ahead of the animation, Android only `did`.
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const animateTo = (toValue, duration) => {
      Animated.timing(height, {
        toValue,
        // Android frequently reports duration 0; a hard 0 makes the composer
        // teleport, so floor it at one frame-ish rather than trusting it.
        duration: Math.max(duration || 0, 120),
        easing: Easing.out(Easing.cubic),
        // Height drives layout, so this cannot run on the native driver.
        useNativeDriver: false,
      }).start();
    };

    const onShow = (e) => {
      const h = e?.endCoordinates?.height ?? 0;
      setIsOpen(true);
      animateTo(h, e?.duration);
    };

    const onHide = (e) => {
      setIsOpen(false);
      animateTo(0, e?.duration);
    };

    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [height]);

  return { keyboardHeight: height, isKeyboardOpen: isOpen };
}
