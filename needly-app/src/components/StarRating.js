import React from "react";
import { Pressable, Text, View } from "react-native";
import { COLORS } from "../theme/colors";

export default function StarRating({ value, onChange, size = 28 }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
          <Text style={{ fontSize: size, color: n <= value ? COLORS.mango : COLORS.line, lineHeight: size }}>
            {"\u2605"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
