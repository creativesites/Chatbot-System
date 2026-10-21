/**
 * Minimal react-native stand-in for UI tests. Host components render as plain
 * elements so react-test-renderer can walk them; behaviour that needs a device
 * (layout, gestures, native animation) is NOT covered by these tests.
 */
const React = require('react');

const host = (name) => {
  const C = React.forwardRef((props, ref) => React.createElement(name, { ...props, ref }, props.children));
  C.displayName = name;
  return C;
};

class AnimatedValue {
  constructor(v) { this._v = v; }
  setValue(v) { this._v = v; }
  interpolate() { return 0; }
  addListener() { return 'l'; }
  removeListener() {}
  stopAnimation() {}
}
const anim = () => ({ start: (cb) => cb && cb({ finished: true }), stop() {} });

const Animated = {
  Value: AnimatedValue,
  ValueXY: AnimatedValue,
  timing: anim, spring: anim, loop: anim, sequence: anim, parallel: anim, delay: anim, stagger: anim,
  View: host('AnimatedView'), Text: host('AnimatedText'), ScrollView: host('AnimatedScrollView'), Image: host('AnimatedImage'),
  createAnimatedComponent: (C) => C,
  event: () => () => {},
};

const rn = {
  View: host('View'), Text: host('Text'), Image: host('Image'), TextInput: host('TextInput'),
  TouchableOpacity: host('TouchableOpacity'), TouchableWithoutFeedback: host('TouchableWithoutFeedback'),
  Pressable: host('Pressable'), ScrollView: host('ScrollView'), Modal: host('Modal'),
  ActivityIndicator: host('ActivityIndicator'), KeyboardAvoidingView: host('KeyboardAvoidingView'),
  SafeAreaView: host('SafeAreaView'),
  FlatList: ({ data = [], renderItem, keyExtractor, ListEmptyComponent }) =>
    React.createElement('FlatList', null, data.length
      ? data.map((item, index) => React.createElement(React.Fragment, { key: keyExtractor ? keyExtractor(item, index) : index }, renderItem({ item, index })))
      : ListEmptyComponent || null),
  StyleSheet: { create: (o) => o, flatten: (s) => Object.assign({}, ...[].concat(s).filter(Boolean)), hairlineWidth: 1, absoluteFillObject: {} },
  Platform: { OS: 'ios', select: (o) => (o.ios !== undefined ? o.ios : o.default) },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }), addEventListener: () => ({ remove() {} }) },
  Animated,
  Easing: new Proxy({}, { get: () => () => (t) => t }),
  Keyboard: { addListener: () => ({ remove() {} }), dismiss() {} },
  LayoutAnimation: { configureNext() {}, Presets: {} },
  UIManager: { setLayoutAnimationEnabledExperimental() {} },
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove() {} }), announceForAccessibility() {} },
  Alert: { alert: jest.fn() },
  StatusBar: Object.assign(host('StatusBar'), { currentHeight: 24 }),
  Linking: { openURL: jest.fn() },
  PixelRatio: { get: () => 2, getFontScale: () => 1 },
  Share: { share: jest.fn() },
};
module.exports = rn;
