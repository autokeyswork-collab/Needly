import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import RootNavigator from "./src/navigation/RootNavigator";
import AuthStack from "./src/navigation/AuthStack";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { OrdersProvider } from "./src/context/OrdersContext";
import { COLORS } from "./src/theme/colors";

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

function Gate() {
  const { user, booting } = useAuth();

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.indigo, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return user ? <RootNavigator /> : <AuthStack />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OrdersProvider>
          <StatusBar style="light" />
          <NavigationContainer>
            <Gate />
          </NavigationContainer>
        </OrdersProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
