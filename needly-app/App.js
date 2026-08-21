import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import RootNavigator from "./src/navigation/RootNavigator";
import AuthStack from "./src/navigation/AuthStack";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { OrdersProvider } from "./src/context/OrdersContext";
import { BookingsProvider } from "./src/context/BookingsContext";
import { COLORS } from "./src/theme/colors";
// Clean bundler sync trigger v3 - Login avatar updated to transparent 1.4M image

// Without this, a push notification that arrives while the app is open and
// foregrounded is silently swallowed on iOS by default — the admin would
// only see the dispute alert if the app happened to be backgrounded,
// which defeats the point of alerting them in the first place.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

import NeedlyLogo from "./src/components/NeedlyLogo";

function Gate() {
  const { user, booting } = useAuth();

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.indigo, alignItems: "center", justifyContent: "center", gap: 20 }}>
        <NeedlyLogo size="large" theme="dark" showBadges />
        <ActivityIndicator color={COLORS.mango} size="large" />
      </View>
    );
  }

  return user ? <RootNavigator /> : <AuthStack />;
}

export default function App() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const manifest = document.querySelector('link[rel="manifest"]') || document.createElement("link");
    manifest.setAttribute("rel", "manifest");
    manifest.setAttribute("href", "/manifest.webmanifest");
    if (!manifest.parentNode) document.head.appendChild(manifest);

    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OrdersProvider>
          <BookingsProvider>
            <StatusBar style="light" />
            <NavigationContainer>
              <Gate />
            </NavigationContainer>
          </BookingsProvider>
        </OrdersProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
