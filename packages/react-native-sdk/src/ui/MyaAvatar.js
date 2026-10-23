/**
 * MyaAvatar
 *
 * The MYAVANA mark. When the host provides a LinearGradient (capabilities), the
 * mark sits inside the berry-to-coral ring the design always called for;
 * without one it is the plain mark, unchanged.
 */

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { MyaColors } from './myaTheme';
import { useMyaCapabilities } from './capabilities';

export default function MyaAvatar({ size = 18, style }) {
  const { LinearGradient } = useMyaCapabilities();

  const mark = (diameter) => (
    <Image
      source={require('./assets/myavana_small_logo.png')}
      style={{ width: diameter, height: diameter, borderRadius: diameter / 2, overflow: 'hidden' }}
      resizeMode="cover"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );

  if (!LinearGradient) {
    return <View style={style}>{mark(size)}</View>;
  }

  const ring = Math.max(1.5, Math.round(size * 0.07));
  return (
    <LinearGradient
      colors={[MyaColors.berry, MyaColors.coral]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {mark(size - ring * 2)}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
