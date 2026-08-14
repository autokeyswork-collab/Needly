import React from "react";
import { View } from "react-native";
import CustomerStack from "./CustomerStack";
import VendorScreen from "../screens/VendorScreen";
import ManagerScreen from "../screens/ManagerScreen";
import RiderScreen from "../screens/RiderScreen";
import AdminScreen from "../screens/AdminScreen";
import AppHeader from "./AppHeader";
import { useAuth } from "../context/AuthContext";

/**
 * Real logins only have one role, so this renders a single screen per
 * role instead of the old always-show-every-tab switcher (which was a
 * stand-in for "no auth yet" — see the project's PROJECT_STATUS.md).
 */
export default function RootNavigator() {
  const { user } = useAuth();
  if (!user) return null;

  const ScreenByRole = {
    CUSTOMER: CustomerStack,
    VENDOR: VendorScreen,
    MANAGER: ManagerScreen,
    RIDER: RiderScreen,
    ADMIN: AdminScreen,
  };
  const Screen = ScreenByRole[user.role];

  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      <View style={{ flex: 1 }}>
        <Screen />
      </View>
    </View>
  );
}
