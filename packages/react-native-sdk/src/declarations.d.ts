declare module 'react' {
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useRef<T>(initialValue: T): { current: T };
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: any[]): T;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
  export function createElement(type: any, props?: any, ...children: any[]): any;
  const React: {
    useState: typeof useState;
    useRef: typeof useRef;
    useEffect: typeof useEffect;
    useCallback: typeof useCallback;
    useMemo: typeof useMemo;
    createElement: typeof createElement;
  };
  export default React;
}

declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const TouchableOpacity: any;
  export const StyleSheet: { create: <T>(styles: T) => T };
  export const Platform: { OS: 'ios' | 'android' | string; select: <T>(obj: any) => T };
}

declare var require: any;
declare var Buffer: any;
