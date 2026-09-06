/**
 * Safe Mobile Primitives Loader
 *
 * Resolves React Native primitives (View, Text, TextInput, TouchableOpacity, ScrollView,
 * FlatList, ActivityIndicator, Image, KeyboardAvoidingView, StyleSheet, Platform)
 * when running in React Native, with graceful fallbacks for Node/Jest test runners.
 */

let RN: any;
try {
  RN = require('react-native');
} catch {
  const React = require('react');
  const createMock = (tag: string) => (props: any) =>
    React.createElement(tag, props, props?.children);
  RN = {
    View: createMock('View'),
    Text: createMock('Text'),
    TextInput: createMock('TextInput'),
    TouchableOpacity: createMock('TouchableOpacity'),
    ScrollView: createMock('ScrollView'),
    FlatList: createMock('FlatList'),
    ActivityIndicator: createMock('ActivityIndicator'),
    Image: createMock('Image'),
    KeyboardAvoidingView: createMock('KeyboardAvoidingView'),
    StyleSheet: { create: (styles: any) => styles },
    Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default }
  };
}

export const View = RN.View;
export const Text = RN.Text;
export const TextInput = RN.TextInput;
export const TouchableOpacity = RN.TouchableOpacity;
export const ScrollView = RN.ScrollView;
export const FlatList = RN.FlatList;
export const ActivityIndicator = RN.ActivityIndicator;
export const Image = RN.Image;
export const KeyboardAvoidingView = RN.KeyboardAvoidingView;
export const StyleSheet = RN.StyleSheet;
export const Platform = RN.Platform;
