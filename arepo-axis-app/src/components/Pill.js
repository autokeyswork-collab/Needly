import React from "react";
import { Text, View } from "react-native";
import { STATUS_LABEL } from "../data/mockData";

const TONES = {
  neutral: { bg: "#EFEDE6", fg: "#14171F" },
  mango: { bg: "#FFF1DA", fg: "#95580A" },
  green: { bg: "#E5F2E9", fg: "#2F7A4F" },
  chili: { bg: "#FCE8E6", fg: "#E14B3C" },
  indigo: { bg: "#E7E9F1", fg: "#232B4D" },
};

export function Pill({ children, tone = "neutral" }) {
  const t = TONES[tone];
  return (
    <View style={{ backgroundColor: t.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
      <Text style={{ color: t.fg, fontSize: 10.5, fontWeight: "600", letterSpacing: 0.3 }}>{children}</Text>
    </View>
  );
}

const STATUS_TONE = {
  placed: "neutral",
  accepted: "mango",
  ready: "indigo",
  picked_up: "mango",
  delivered: "green",
};

export function StatusPill({ status }) {
  return <Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status].toUpperCase()}</Pill>;
}
