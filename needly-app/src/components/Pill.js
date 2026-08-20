import React from "react";
import { Text, View } from "react-native";
import { STATUS_LABEL } from "../data/mockData";

const TONES = {
  neutral: { bg: "#EFEADB", fg: "#10231B" },
  mango: { bg: "#F8EBC2", fg: "#7A5A00" },
  green: { bg: "#DDEBE4", fg: "#1F7A4D" },
  chili: { bg: "#FCE8E1", fg: "#B94735" },
  indigo: { bg: "#DDEBE4", fg: "#063B2A" },
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
  const key = (status || "").toLowerCase();
  const tone = STATUS_TONE[key] || "neutral";
  const label = STATUS_LABEL[key] || status || "Order";
  return <Pill tone={tone}>{String(label).toUpperCase()}</Pill>;
}
