/**
 * Safe Mobile Primitives Loader (JavaScript implementation)
 */

let RN;
try {
  RN = require('react-native');
} catch {
  const React = require('react');
  const createMock = (tag) => (props) =>
    React.createElement(tag, props, props ? props.children : null);
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
    StyleSheet: { create: (styles) => styles },
    Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default }
  };
}

module.exports = {
  View: RN.View,
  Text: RN.Text,
  TextInput: RN.TextInput,
  TouchableOpacity: RN.TouchableOpacity,
  ScrollView: RN.ScrollView,
  FlatList: RN.FlatList,
  ActivityIndicator: RN.ActivityIndicator,
  Image: RN.Image,
  KeyboardAvoidingView: RN.KeyboardAvoidingView,
  StyleSheet: RN.StyleSheet,
  Platform: RN.Platform
};
