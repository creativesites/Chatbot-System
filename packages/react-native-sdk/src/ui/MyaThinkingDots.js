/**
 * MyaThinkingDots
 *
 * The thinking state from artboard 1c: three berry dots in an assistant-shaped
 * bubble. Deliberately not a spinner and never the word "Loading" — a spinner
 * reads as the app being stuck, whereas dots read as someone composing a reply.
 *
 * Opacities cycle rather than the dots scaling, so the bubble never changes
 * size while it animates and the row below it cannot shift.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, AccessibilityInfo } from 'react-native';
import { MyaColors, MyaRadii, MyaShadow } from './myaTheme';

const REST = [0.95, 0.55, 0.28];

export default function MyaThinkingDots() {
  const dots = useRef(REST.map((o) => new Animated.Value(o))).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let loops = [];

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (cancelled) return;
      reduceMotion.current = enabled;
      // Respect the OS setting: the state is still communicated by the dots
      // being present, so with reduce-motion on they simply hold their resting
      // opacities rather than disappearing.
      if (enabled) return;

      loops = dots.map((v, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 160),
            Animated.timing(v, {
              toValue: 1,
              duration: 420,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(v, {
              toValue: 0.28,
              duration: 420,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ])
        )
      );
      loops.forEach((l) => l.start());
    });

    return () => {
      cancelled = true;
      loops.forEach((l) => l.stop && l.stop());
    };
  }, [dots]);

  return (
    <View
      style={styles.bubble}
      accessibilityRole="progressbar"
      accessibilityLabel="Mya is thinking"
    >
      {dots.map((v, i) => (
        <Animated.View key={i} style={[styles.dot, i > 0 && styles.gap, { opacity: v }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: MyaColors.ivory,
    paddingVertical: 16,
    paddingHorizontal: 18,
    ...MyaRadii.assistantBubble,
    ...MyaShadow.bubble,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MyaColors.blueberry,
  },
  gap: {
    marginLeft: 6,
  },
});
