import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BrowseScreen from "../screens/customer/BrowseScreen";
import CategoryResultsScreen from "../screens/customer/CategoryResultsScreen";
import CustomerOrdersScreen from "../screens/customer/CustomerOrdersScreen";
import CustomerWalletScreen from "../screens/customer/CustomerWalletScreen";
import CustomerBookingsScreen from "../screens/customer/CustomerBookingsScreen";
import CustomerNotificationsScreen from "../screens/customer/CustomerNotificationsScreen";
import CustomerAccountScreen from "../screens/customer/CustomerAccountScreen";
import AutoBookingScreen from "../screens/customer/AutoBookingScreen";
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
      <Stack.Screen name="Browse" component={BrowseScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CategoryResults" component={CategoryResultsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CustomerOrders" component={CustomerOrdersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NeedlyPay" component={CustomerWalletScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CustomerBookings" component={CustomerBookingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CustomerNotifications" component={CustomerNotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CustomerAccount" component={CustomerAccountScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AutoBooking" component={AutoBookingScreen} options={{ title: "Book auto service" }} />
      <Stack.Screen name="VendorMenu" component={VendorMenuScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Tracking" component={TrackingScreen} options={{ title: "Track order", headerBackVisible: false }} />
    </Stack.Navigator>
  );
}
