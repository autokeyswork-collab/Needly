import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
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

function PreloadScreen() {
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const ringLoop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );

    pulseLoop.start();
    floatLoop.start();
    ringLoop.start();
    return () => {
      pulseLoop.stop();
      floatLoop.stop();
      ringLoop.stop();
    };
  }, [float, pulse, ring]);

  const logoScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const logoY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.2] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.48] });
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.55] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.42, 0.14, 0] });
  const secondRingScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.2] });
  const secondRingOpacity = ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.26, 0.18, 0] });

  return (
    <View style={styles.preload}>
      <Animated.View style={[styles.preloadGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.preloadRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
      <Animated.View style={[styles.preloadRingSmall, { opacity: secondRingOpacity, transform: [{ scale: secondRingScale }] }]} />
      <Animated.View style={[styles.preloadLogo, { transform: [{ translateY: logoY }, { scale: logoScale }] }]}>
        <NeedlyLogo size="hero" theme="dark" variant="icon" showBadges={false} />
      </Animated.View>
    </View>
  );
}

function Gate() {
  const { user, booting } = useAuth();

  if (booting) {
    return <PreloadScreen />;
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

const styles = StyleSheet.create({
  preload: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  preloadGlow: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#F1EAFE",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.5,
    shadowRadius: 34,
  },
  preloadRing: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: "rgba(111,69,233,0.26)",
  },
  preloadRingSmall: {
    position: "absolute",
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
    borderColor: "rgba(255,158,27,0.42)",
  },
  preloadLogo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6F45E9",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
});
