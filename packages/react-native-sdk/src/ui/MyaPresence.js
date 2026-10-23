/**
 * MyaPresence: Mya's avatar, alive while she works.
 *
 * - thinking: the avatar breathes (scale 1 to 1.04, 1.6 s loop)
 * - streaming: a thin coral arc traces around it
 * - idle: still
 * Reduce-motion: both hold still; the ring simply shows as a static arc so the
 * "working" state is still communicated.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import MyaAvatar from './MyaAvatar';
import { MyaColors } from './myaTheme';
import { useMotion } from './motion/useMotion';
import { PRESENCE } from './motion/tokens';

export default function MyaPresence({ size = 28, mode = 'idle' }) {
  const { reduced } = useMotion();
  const scale = useSharedValue(1);
  const spin = useSharedValue(0);
  const thinking = mode === 'thinking';
  const streaming = mode === 'streaming';

  useEffect(() => {
    cancelAnimation(scale);
    if (thinking && !reduced) {
      scale.value = withRepeat(
        withSequence(
          withTiming(PRESENCE.breatheScale, { duration: PRESENCE.breatheMs / 2 }),
          withTiming(1, { duration: PRESENCE.breatheMs / 2 })
        ),
        -1,
        false
      );
    } else {
      scale.value = 1;
    }
    return () => cancelAnimation(scale);
  }, [thinking, reduced, scale]);

  useEffect(() => {
    cancelAnimation(spin);
    if (streaming && !reduced) {
      spin.value = 0;
      spin.value = withRepeat(withTiming(360, { duration: PRESENCE.ringMs, easing: Easing.linear }), -1, false);
    } else {
      spin.value = 0;
    }
    return () => cancelAnimation(spin);
  }, [streaming, reduced, spin]);

  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const pad = Math.round(size * 0.14);

  return (
    <View style={{ width: size + pad * 2, height: size + pad * 2, alignItems: 'center', justifyContent: 'center' }}>
      {(streaming || thinking) && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { width: size + pad * 2, height: size + pad * 2, borderRadius: (size + pad * 2) / 2 },
            ringStyle,
          ]}
        />
      )}
      <Animated.View style={bodyStyle}>
        <MyaAvatar size={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderTopColor: MyaColors.coral,
  },
});
