import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BrowseScreen from "../screens/customer/BrowseScreen";
import VendorMenuScreen from "../screens/customer/VendorMenuScreen";
import CartScreen from "../screens/customer/CartScreen";
import TrackingScreen from "../screens/customer/TrackingScreen";
import { COLORS } from "../theme/colors";

const Stack = createNativeStackNavigator();

export default function CustomerStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.indigo },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="Browse" component={BrowseScreen} options={{ title: "Arepo \u21C4 Axis" }} />
      <Stack.Screen name="VendorMenu" component={VendorMenuScreen} options={{ title: "Menu" }} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: "Your order" }} />
      <Stack.Screen name="Tracking" component={TrackingScreen} options={{ title: "Track order", headerBackVisible: false }} />
    </Stack.Navigator>
  );
}
