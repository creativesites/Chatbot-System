/**
 * MyaSheet — Reusable bottom sheet component for Mya mobile UI.
 *
 * Implements the approved bottom sheet pattern (Artboards 1f & 1h)
 * with scrim backdrop, drag handle, and smooth Easing animation.
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { moderateScale } from './scale';
import { MyaColors, MyaFonts } from "./myaTheme";

export default function MyaSheet({ visible, onClose, title, children }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible, anim]);

  const handleClose = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      if (onClose) onClose();
    });
  };

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <TouchableOpacity
        style={styles.scrimTouch}
        onPress={handleClose}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel="Close sheet"
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [450, 0],
                }),
              },
            ],
          },
        ]}
      >
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
    backgroundColor: "rgba(30, 27, 27, 0.45)",
    zIndex: 1000,
    justifyContent: "flex-end",
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
