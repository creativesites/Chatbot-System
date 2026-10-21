/**
 * Headless mock for React in @myavana/react-native-sdk tests
 */
const mockReact = {
  createElement: (type, props, ...children) => ({
    type,
    props: { ...props, children: children.length === 1 ? children[0] : children }
  }),
  useState: (initial) => {
    const val = typeof initial === 'function' ? initial() : initial;
    return [val, () => {}];
  },
  useRef: (initial) => ({ current: initial !== undefined ? initial : null }),
  useEffect: (cb) => {
    if (typeof cb === 'function') cb();
  },
  useCallback: (fn) => fn,
  useMemo: (fn) => (typeof fn === 'function' ? fn() : fn),
  memo: (comp) => comp
};

module.exports = mockReact;
