import React from "react";
import { View } from "react-native";
import CustomerStack from "./CustomerStack";
import VendorScreen from "../screens/VendorScreen";
import ManagerScreen from "../screens/ManagerScreen";
import RiderScreen from "../screens/RiderScreen";
import AdminScreen from "../screens/AdminScreen";
import SuperAdminControlCenter from "../screens/SuperAdminControlCenter";
import AppHeader from "./AppHeader";
import { useAuth } from "../context/AuthContext";

/**
 * Real logins only have one role, so this renders a single screen per
 * role instead of the old always-show-every-tab switcher (which was a
 * stand-in for "no auth yet" — see the project's PROJECT_STATUS.md).
 */
export default function RootNavigator() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const ScreenByRole = {
    CUSTOMER: CustomerStack,
    VENDOR: VendorScreen,
    MANAGER: ManagerScreen,
    RIDER: RiderScreen,
    ADMIN: AdminScreen,
    SUPER_ADMIN: () => <SuperAdminControlCenter onLogout={logout} />,
  };
  const roleKey = (user?.role || "CUSTOMER").toUpperCase();
  const Screen = ScreenByRole[roleKey] || CustomerStack;

  const isSuperAdmin = roleKey === "SUPER_ADMIN";

  const usesOwnHeader = isSuperAdmin || roleKey === "CUSTOMER" || roleKey === "VENDOR";

  return (
    <View style={{ flex: 1 }}>
      {!usesOwnHeader && <AppHeader />}
      <View style={{ flex: 1 }}>
        <Screen />
      </View>
    </View>
  );
}
