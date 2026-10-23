/**
 * Motion helpers bound to the member's reduce-motion setting.
 * All of Mya's animation goes through here so reduce-motion is honoured in
 * exactly one place.
 */

import { useCallback } from 'react';
import { useReducedMotion, withSpring, withTiming, Keyframe, FadeIn } from 'react-native-reanimated';
import { adapt, springConfig, CARD_ENTER, STAGGER_MS, MyaDurations, CROSSFADE_MS, INK } from './tokens';

export function useMotion() {
  const reduced = !!useReducedMotion();

  /** Animation value for `to`, as a spring (or a short crossfade when reduced). Call from JS-thread effects/handlers. */
  const springTo = useCallback(
    (to, name = 'gentle', cb) => {
      const a = adapt({ kind: 'spring', name }, reduced);
      return a.kind === 'spring' ? withSpring(to, springConfig(name), cb) : withTiming(to, { duration: a.duration }, cb);
    },
    [reduced]
  );

  const timingTo = useCallback(
    (to, name = 'base', cb) => {
      const a = adapt({ kind: 'timing', name, duration: MyaDurations[name] }, reduced);
      return withTiming(to, { duration: a.duration }, cb);
    },
    [reduced]
  );

  /** Layout animation for a card or starter entering, staggered by index. */
  const cardEntering = useCallback(
    (index = 0) => {
      if (reduced) return FadeIn.duration(CROSSFADE_MS);
      return new Keyframe({
        0: { opacity: 0, transform: [{ translateY: CARD_ENTER.rise }, { scale: CARD_ENTER.scaleFrom }] },
        100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
      })
        .duration(MyaDurations.slow)
        .delay(index * STAGGER_MS);
    },
    [reduced]
  );

  /** Ink arrival: a streamed block fades and rises 4 px over 120 ms. */
  const inkEntering = useCallback(() => {
    if (reduced) return FadeIn.duration(CROSSFADE_MS);
    return new Keyframe({
      0: { opacity: 0, transform: [{ translateY: INK.rise }] },
      100: { opacity: 1, transform: [{ translateY: 0 }] },
    }).duration(INK.duration);
  }, [reduced]);

  /** A control morphing in place (send becomes stop): a quick pop. */
  const popEntering = useCallback(() => {
    if (reduced) return FadeIn.duration(CROSSFADE_MS);
    return new Keyframe({
      0: { opacity: 0, transform: [{ scale: 0.7 }] },
      100: { opacity: 1, transform: [{ scale: 1 }] },
    }).duration(MyaDurations.base);
  }, [reduced]);

  /** The member's own message lifts from the composer into the thread. */
  const sendEntering = useCallback(() => {
    if (reduced) return FadeIn.duration(CROSSFADE_MS);
    return new Keyframe({
      0: { opacity: 0.2, transform: [{ translateY: 56 }, { scale: 0.96 }] },
      100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    }).duration(MyaDurations.slow);
  }, [reduced]);

  return { reduced, springTo, timingTo, cardEntering, inkEntering, popEntering, sendEntering };
}
