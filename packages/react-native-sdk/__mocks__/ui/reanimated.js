/**
 * react-native-reanimated stand-in for UI tests. Animations resolve instantly
 * to their end value so tests assert the end state; real timing, springs and
 * UI-thread behaviour are NOT covered here and need a device.
 * Set globalThis.__REDUCE_MOTION__ = true to simulate reduce-motion.
 */
const React = require('react');

const host = (name) => {
  const C = React.forwardRef((props, ref) => {
    const { entering, exiting, layout, ...rest } = props; // layout animations are not props on a host view
    return React.createElement(name, { ...rest, ref }, props.children);
  });
  C.displayName = name;
  return C;
};

const chain = () => {
  const o = {};
  ['duration', 'delay', 'springify', 'damping', 'stiffness', 'mass', 'easing', 'withCallback', 'build'].forEach((m) => { o[m] = () => o; });
  return o;
};

const Animated = {
  View: host('AnimatedView'),
  Text: host('AnimatedText'),
  ScrollView: host('AnimatedScrollView'),
  Image: host('AnimatedImage'),
  createAnimatedComponent: (C) => C,
};

const done = (cb) => { if (typeof cb === 'function') cb(true); };

module.exports = {
  __esModule: true,
  default: Animated,
  useSharedValue: (v) => React.useRef({ value: v }).current,
  useAnimatedStyle: (fn) => fn(),
  useAnimatedReaction: () => {},
  useAnimatedProps: (fn) => fn(),
  useDerivedValue: (fn) => ({ value: fn() }),
  withTiming: (v, cfg, cb) => { done(cb); return v; },
  withSpring: (v, cfg, cb) => { done(cb); return v; },
  withRepeat: (v) => v,
  withSequence: (...a) => a[a.length - 1],
  withDelay: (d, v) => v,
  cancelAnimation: () => {},
  runOnJS: (f) => f,
  interpolate: (v, i, o) => o[0],
  Extrapolation: { CLAMP: 'clamp' },
  Easing: new Proxy({}, { get: () => (...a) => (t) => t }),
  useReducedMotion: () => !!globalThis.__REDUCE_MOTION__,
  useAnimatedKeyboard: () => ({ height: { value: 0 }, state: { value: 0 } }),
  Keyframe: class { constructor(def) { this.def = def; } duration() { return this; } delay() { return this; } },
  FadeIn: chain(),
  FadeInDown: chain(),
  FadeOut: chain(),
};
