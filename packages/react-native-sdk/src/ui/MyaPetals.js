/**
 * A brief settle of coral petals, used once when a purchase is confirmed. They
 * fall for about a second, then call onDone. Reduce-motion: nothing falls.
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming } from 'react-native-reanimated';
import { MyaColors } from './myaTheme';
import { useMotion } from './motion/useMotion';

export function makePetals(count = 14, seed = 7) {
  // Deterministic scatter (so tests and snapshots are stable); looks random enough.
  let x = seed;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.round(rnd() * 100),
    drift: Math.round(rnd() * 60 - 30),
    delay: Math.round(rnd() * 350),
    rotate: Math.round(rnd() * 240 - 120),
    size: 8 + Math.round(rnd() * 6),
  }));
}

function Petal({ petal, onLast }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(petal.delay, withTiming(1, { duration: 1000 }, (finished) => {
      'worklet';
    }));
    if (onLast) {
      const id = setTimeout(onLast, 1500);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [petal, t, onLast]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.15 ? t.value / 0.15 : 1 - Math.max(0, (t.value - 0.7) / 0.3),
    transform: [{ translateY: t.value * 220 }, { translateX: t.value * petal.drift }, { rotate: `${t.value * petal.rotate}deg` }],
  }));
  return (
    <Animated.View
      style={[styles.petal, { left: `${petal.left}%`, width: petal.size, height: petal.size * 1.4, borderRadius: petal.size }, style]}
    />
  );
}

export default function MyaPetals({ onDone }) {
  const { reduced } = useMotion();
  const petals = useMemo(() => makePetals(), []);
  useEffect(() => {
    if (reduced && onDone) onDone();
  }, [reduced, onDone]);
  if (reduced) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {petals.map((p, i) => (
        <Petal key={p.id} petal={p} onLast={i === petals.length - 1 ? onDone : undefined} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  petal: {
    position: 'absolute',
    top: 0,
    backgroundColor: MyaColors.coral,
    opacity: 0,
  },
});
