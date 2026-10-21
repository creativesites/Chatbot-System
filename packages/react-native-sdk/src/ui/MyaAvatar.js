/**
 * MyaAvatar
 *
 * The berry→coral identity mark. In the design this is a 140° linear gradient;
 * the app has no gradient library installed, and adding a native module we
 * cannot build-test right now is a worse trade than approximating it.
 *
 * The approximation is three stacked layers inside a clipped circle, which at
 * 18pt and 56pt reads as a warm diagonal blend. It is isolated here on purpose:
 * when react-native-linear-gradient is added, this is the only file to change.
 *
 *   <LinearGradient colors={[MyaColors.berry, MyaColors.coral]}
 *                   start={{x:0.15,y:0}} end={{x:0.85,y:1}} />
 *
 * This is the one place the implementation knowingly departs from the artboards.
 */

import React from 'react';
import { Image, StyleSheet } from 'react-native';

export default function MyaAvatar({ size = 18, style }) {
  return (
    <Image
      source={require('./assets/myavana_small_logo.png')}
      style={[
        { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' },
        style,
      ]}
      resizeMode="cover"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
