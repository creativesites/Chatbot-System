/**
 * MyaPressable: a touchable with Mya's press feel. It settles to 0.97 on press
 * with the snappy spring and fires a light (or medium) haptic if the host
 * provided haptics. Touch target and accessibility props pass straight through.
 */

import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useMotion } from './motion/useMotion';
import { useHaptics } from './capabilities';
import { PRESS_SCALE } from './motion/tokens';

export default function MyaPressable({ children, style, onPress, haptic = 'light', disabled, ...rest }) {
  const { reduced, springTo } = useMotion();
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  const pressIn = useCallback(() => {
    if (!reduced) scale.value = springTo(PRESS_SCALE, 'snappy');
  }, [reduced, scale, springTo]);
  const pressOut = useCallback(() => {
    scale.value = springTo(1, 'snappy');
  }, [scale, springTo]);

  const handlePress = useCallback(
    (e) => {
      if (haptic && haptics[haptic]) haptics[haptic]();
      if (onPress) onPress(e);
    },
    [haptic, haptics, onPress]
  );

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable onPressIn={pressIn} onPressOut={pressOut} onPress={handlePress} disabled={disabled} {...rest}>
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
