/**
 * The one motion token file (TASK-008 M4). Three springs, three durations,
 * and the few named recipes the signature moments use. Components never carry
 * ad-hoc numbers; they read from here.
 *
 * With reduce-motion on, every animation becomes a crossfade of at most
 * CROSSFADE_MS (see `adapt`).
 */

export const MyaSprings = Object.freeze({
  gentle: Object.freeze({ damping: 20, stiffness: 170, mass: 1 }),
  snappy: Object.freeze({ damping: 18, stiffness: 260, mass: 1 }),
  settle: Object.freeze({ damping: 26, stiffness: 140, mass: 1 }),
});

export const MyaDurations = Object.freeze({ fast: 120, base: 220, slow: 360 });

export const CROSSFADE_MS = 120;
export const STAGGER_MS = 60;

/** Streamed text arrives like ink: fade and rise 4 px over 120 ms. */
export const INK = Object.freeze({ rise: 4, duration: 120 });

/** Cards unfold: opacity 0 to 1, scale .98 to 1, 8 px rise. */
export const CARD_ENTER = Object.freeze({ scaleFrom: 0.98, rise: 8 });

export const PRESS_SCALE = 0.97;

/** Mya's presence while she works. */
export const PRESENCE = Object.freeze({ breatheScale: 1.04, breatheMs: 1600, ringMs: 1300 });

/** Word pacing for streamed replies (see inkPacing). */
export const PACING = Object.freeze({ tickMs: 32, maxBacklogWords: 12, flushMs: 280 });

export function springConfig(name) {
  return MyaSprings[name] || MyaSprings.gentle;
}

export function timingConfig(name) {
  return { duration: MyaDurations[name] || MyaDurations.base };
}

/**
 * Turn an animation spec into what should actually run.
 * Reduce-motion: a plain crossfade of at most CROSSFADE_MS, never a spring,
 * never movement.
 *
 * @param {{kind:'spring'|'timing', name?:string, duration?:number}} spec
 * @param {boolean} reduced
 */
export function adapt(spec, reduced) {
  if (reduced) return { kind: 'timing', duration: Math.min(CROSSFADE_MS, spec && spec.duration ? spec.duration : CROSSFADE_MS), movement: false };
  if (spec && spec.kind === 'spring') return { kind: 'spring', config: springConfig(spec.name), movement: true };
  return { kind: 'timing', duration: (spec && spec.duration) || timingConfig(spec && spec.name).duration, movement: true };
}
