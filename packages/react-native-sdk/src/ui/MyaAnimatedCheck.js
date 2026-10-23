/**
 * The checkmark in a ticked checklist step.
 *
 * With an SVG capability from the host it draws itself: the stroke runs on over
 * 220 ms with a light haptic. Without one it springs in (scale and opacity).
 * Reduce-motion: it simply appears (a 120 ms fade).
 */
import React, { useEffect, useMemo } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedProps } from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useMotion } from './motion/useMotion';
import { useHaptics, useMyaCapabilities } from './capabilities';
import { MyaColors } from './myaTheme';

const PATH = 'M5 12.5l4.5 4.5L19 7';
const LENGTH = 22; // generous upper bound of the path's length in the 24-unit viewBox

function SvgCheck({ Svg, Path, size, color, progress }) {
  const AnimatedPath = useMemo(() => Animated.createAnimatedComponent(Path), [Path]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: LENGTH * (1 - progress.value) }));
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedPath
        d={PATH}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${LENGTH} ${LENGTH}`}
        animatedProps={props}
      />
    </Svg>
  );
}

export default function MyaAnimatedCheck({ size = 12, color = MyaColors.ivory, haptic = true }) {
  const { reduced, springTo, timingTo } = useMotion();
  const haptics = useHaptics();
  const { Svg: svg } = useMyaCapabilities();
  const drawn = !!(svg && svg.Svg && svg.Path);
  const p = useSharedValue(reduced ? 1 : drawn ? 0 : 0.35);

  useEffect(() => {
    // Drawing is a timing (it is a path, not a body); the fallback springs.
    p.value = reduced || drawn ? timingTo(1, reduced ? 'fast' : 'base') : springTo(1, 'snappy');
    if (haptic) haptics.light();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: drawn ? 1 : Math.min(1, p.value * 1.4),
    transform: [{ scale: drawn ? 1 : p.value }],
  }));

  return (
    <Animated.View style={style}>
      {drawn ? (
        <SvgCheck Svg={svg.Svg} Path={svg.Path} size={size + 2} color={color} progress={p} />
      ) : (
        <Ionicons name="checkmark" size={size} color={color} />
      )}
    </Animated.View>
  );
}
