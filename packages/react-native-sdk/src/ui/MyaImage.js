/**
 * MyaImage
 *
 * Every remote picture in the thread goes through this, so they all behave the
 * same way across the three states a network image actually has:
 *   loading - a soft placeholder at the final size, so the bubble never jumps;
 *   loaded  - the picture fades in once (native driver);
 *   failed  - an honest "Image unavailable" tile, never an empty grey box.
 *
 * Presentation only. Callers pass an already-built `source` (cards.js
 * buildImageSource owns URL normalisation and the User-Agent header) and,
 * optionally, a `fallbackSource` that is tried once before giving up — the
 * MyaMediaCard thumbnail -> original retry.
 *
 * Size comes from `style` (width/height or aspectRatio), exactly as it did on
 * the <Image> this replaces.
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MyaColors, MyaFonts } from './myaTheme';
import { useMotion } from './motion/useMotion';

const AnimatedImage = Animated.createAnimatedComponent(Image);

function keyOf(source) {
  if (!source) return '';
  if (typeof source === 'number') return `asset:${source}`;
  return source.uri || '';
}

function MyaImage({ source, fallbackSource, style, resizeMode = 'cover', accessibilityLabel, failedLabel = 'Image unavailable', compact = false }) {
  const [useFallback, setUseFallback] = useState(false);
  const active = useFallback && fallbackSource ? fallbackSource : source;
  const [status, setStatus] = useState(active ? 'loading' : 'failed');
  const { timingTo } = useMotion();
  const opacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const primaryKey = keyOf(source);
  // A different picture starts over; a re-render of the same one keeps its state.
  useEffect(() => {
    setUseFallback(false);
    setStatus(source ? 'loading' : 'failed');
    opacity.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryKey]);

  const onLoad = useCallback(() => {
    setStatus('loaded');
    opacity.value = timingTo(1, 'base');
  }, [opacity, timingTo]);

  const onError = useCallback(() => {
    if (!useFallback && fallbackSource && keyOf(fallbackSource) !== keyOf(source)) {
      setUseFallback(true);
      setStatus('loading');
      opacity.value = 0;
      return;
    }
    setStatus('failed');
  }, [useFallback, fallbackSource, source, opacity]);

  const failed = status === 'failed';

  return (
    <View
      style={[styles.frame, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={failed ? failedLabel : accessibilityLabel || 'Image'}
    >
      {status !== 'loaded' && (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} pointerEvents="none">
          <Ionicons
            name="image-outline"
            size={compact ? 18 : 22}
            color={failed ? MyaColors.ink40 : MyaColors.ink16}
          />
          {failed && !compact ? <Text style={styles.failedText}>{failedLabel}</Text> : null}
        </View>
      )}
      {active && !failed ? (
        <AnimatedImage
          key={keyOf(active)}
          source={active}
          style={[StyleSheet.absoluteFill, fadeStyle]}
          resizeMode={resizeMode}
          onLoad={onLoad}
          onError={onError}
          // Android adds its own 300ms fade on top of ours; keep only one.
          fadeDuration={Platform.OS === 'android' ? 0 : undefined}
          progressiveRenderingEnabled
        />
      ) : null}
    </View>
  );
}

export default memo(
  MyaImage,
  (a, b) =>
    keyOf(a.source) === keyOf(b.source) &&
    keyOf(a.fallbackSource) === keyOf(b.fallbackSource) &&
    a.style === b.style &&
    a.resizeMode === b.resizeMode &&
    a.accessibilityLabel === b.accessibilityLabel &&
    a.failedLabel === b.failedLabel &&
    a.compact === b.compact
);

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: MyaColors.stone,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MyaColors.stone,
    paddingHorizontal: 8,
  },
  failedText: {
    marginTop: 6,
    fontFamily: MyaFonts.medium,
    fontSize: 12,
    color: MyaColors.inkText,
    textAlign: 'center',
  },
});
