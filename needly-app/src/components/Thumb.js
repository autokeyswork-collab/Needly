import React from "react";
import { Text, View } from "react-native";

export default function Thumb({ emoji, category, size = 44 }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: 12,
        backgroundColor: "transparent",
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}
