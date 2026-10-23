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

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { MyaColors, MyaRadii, MyaShadow } from './myaTheme';
import { useMotion } from './motion/useMotion';

const REST = [0.95, 0.55, 0.28];

function Dot({ index, gap, animate }) {
  const opacity = useSharedValue(REST[index]);

  useEffect(() => {
    if (!animate) {
      // Reduce-motion: the dots hold their resting opacities. The state is still
      // communicated by their presence.
      cancelAnimation(opacity);
      opacity.value = REST[index];
      return undefined;
    }
    opacity.value = withDelay(
      index * 160,
      withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(0.28, { duration: 420 })), -1, false)
    );
    return () => cancelAnimation(opacity);
  }, [animate, index, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, gap && styles.gap, style]} />;
}

export default function MyaThinkingDots() {
  const { reduced } = useMotion();
  return (
    <View style={styles.bubble} accessibilityRole="progressbar" accessibilityLabel="Mya is thinking">
      {REST.map((_, i) => (
        <Dot key={i} index={i} gap={i > 0} animate={!reduced} />
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
