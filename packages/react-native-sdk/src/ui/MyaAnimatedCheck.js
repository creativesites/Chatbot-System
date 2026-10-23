/**
 * The checkmark in a ticked checklist step: it springs in (scale and opacity)
 * and gives a light haptic. A true stroke-draw needs an SVG library, which is
 * pending approval; this is the dependency-free version.
 */
import React, { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useMotion } from './motion/useMotion';
import { useHaptics } from './capabilities';
import { MyaColors } from './myaTheme';

export default function MyaAnimatedCheck({ size = 12, color = MyaColors.ivory, haptic = true }) {
  const { reduced, springTo, timingTo } = useMotion();
  const haptics = useHaptics();
  const p = useSharedValue(reduced ? 1 : 0.35);

  useEffect(() => {
    p.value = reduced ? timingTo(1, 'fast') : springTo(1, 'snappy');
    if (haptic) haptics.light();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 1.4), transform: [{ scale: p.value }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name="checkmark" size={size} color={color} />
    </Animated.View>
  );
}
