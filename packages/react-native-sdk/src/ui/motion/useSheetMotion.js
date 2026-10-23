import { useCallback, useEffect } from 'react';
import { useSharedValue, useAnimatedStyle, interpolate, runOnJS } from 'react-native-reanimated';
import { useMotion } from './useMotion';

/**
 * Open/close motion for bottom sheets, on the UI thread.
 * Opens with the snappy spring, closes with a base-duration timing, and calls
 * `onClosed` only once the close has actually finished. With reduce-motion on,
 * the sheet crossfades instead of travelling.
 */
export default function useSheetMotion(visible, offset, onClosed) {
  const { reduced, springTo, timingTo } = useMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = visible ? springTo(1, 'snappy') : 0;
  }, [visible, progress, springTo]);

  const close = useCallback(() => {
    progress.value = timingTo(0, 'base', (finished) => {
      'worklet';
      if (finished && onClosed) runOnJS(onClosed)();
    });
  }, [progress, timingTo, onClosed]);

  const travel = reduced ? 0 : offset;
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reduced ? progress.value : 1,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [travel, 0]) }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return { close, sheetStyle, scrimStyle };
}
