/**
 * MyaSheet — Reusable bottom sheet component for Mya mobile UI.
 *
 * Implements the approved bottom sheet pattern (Artboards 1f & 1h)
 * with scrim backdrop, drag handle, and a UI-thread spring (Reanimated).
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { moderateScale } from './scale';
import { MyaColors, MyaFonts } from "./myaTheme";
import useSheetMotion from "./motion/useSheetMotion";

export default function MyaSheet({ visible, onClose, title, children }) {
  const { close, sheetStyle, scrimStyle } = useSheetMotion(visible, 450, onClose);

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <Animated.View style={[styles.scrim, scrimStyle]} pointerEvents="none" />
      <TouchableOpacity
        style={styles.scrimTouch}
        onPress={close}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel="Close sheet"
      />
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />
        {!!title && <Text style={styles.title}>{title}</Text>}
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30, 27, 27, 0.45)",
  },
  scrimTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: MyaColors.sand,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: MyaColors.berryLine,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: MyaColors.ink16,
    alignSelf: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(15),
    color: MyaColors.onyx,
    marginBottom: 16,
    textAlign: "center",
  },
});
