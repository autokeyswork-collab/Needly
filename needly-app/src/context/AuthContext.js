import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { AuthAPI, setToken, getToken, setSuspensionHandler } from "../api/client";
import { connectSocket, disconnectSocket } from "../api/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // full /auth/me payload: { id, name, role, vendor, managedVendor, rider, ... }
  const [booting, setBooting] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [suspensionMessage, setSuspensionMessage] = useState(null);

  const loadMe = useCallback(async () => {
    try {
      const me = await AuthAPI.me();
      setUser(me);
      await connectSocket();
      registerForPushNotifications(); // best-effort, never blocks login
      return me;
    } catch (err) {
      // Token missing/expired — treat as logged out.
      await setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const existing = await getToken();
        if (existing) await loadMe();
      } finally {
        setBooting(false);
      }
    })();
  }, [loadMe]);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    setSuspensionMessage(null);
    try {
      const res = await AuthAPI.login(email, password);
      if (res && res.token) {
        await setToken(res.token);
        if (res.user && res.user.role) {
          setUser(res.user);
        }
        await loadMe();
        return true;
      }
      return false;
    } catch (err) {
      setAuthError(err.message);
      return false;
    }
  }, [loadMe]);

  const socialLogin = useCallback(async (payload) => {
    setAuthError(null);
    setSuspensionMessage(null);
    try {
      const res = await AuthAPI.socialLogin(payload);
      if (res && res.pendingApproval) {
        return { pendingApproval: true, message: res.message, onboardingPayment: res.onboardingPayment || null };
      }
      if (res && res.token) {
        await setToken(res.token);
        if (res.user && res.user.role) {
          setUser(res.user);
        }
        await loadMe();
        return { pendingApproval: false, user: res.user };
      }
      return false;
    } catch (err) {
      setAuthError(err.message);
      return { error: err.message };
    }
  }, [loadMe]);

  const register = useCallback(async (payload) => {
    setAuthError(null);
    try {
      const result = await AuthAPI.register(payload);
      if (result.pendingApproval) {
        return { pendingApproval: true, message: result.message, onboardingPayment: result.onboardingPayment || null };
      }
      await setToken(result.token);
      await loadMe();
      return { pendingApproval: false };
    } catch (err) {
      setAuthError(err.message);
      return { error: err.message };
    }
  }, [loadMe]);

  const logout = useCallback(async () => {
    await setToken(null);
    disconnectSocket();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const updated = await AuthAPI.updateMeProfile(fields);
    setUser(updated);
    return updated;
  }, []);

  // Registered once — fires from api/client.js whenever any request comes
  // back 403 "suspended", regardless of which screen triggered it. Logs
  // the person out and hands the login screen a real explanation instead
  // of leaving them staring at buttons that just stopped working.
  useEffect(() => {
    setSuspensionHandler((message) => {
      setSuspensionMessage(message);
      logout();
    });
  }, [logout]);

  return (
    <AuthContext.Provider value={{
      user, booting, authError, login, socialLogin, register, logout, refreshMe: loadMe, updateProfile,
      suspensionMessage, clearSuspensionMessage: () => setSuspensionMessage(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Registers this device for Expo push notifications and saves the token
 * on the backend. Best-effort: push tokens only work on physical devices
 * with a real Expo/EAS project set up, so this quietly no-ops in a
 * simulator or if permissions are denied, rather than throwing and
 * blocking login.
 */
async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) return; // simulators don't have push capability
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return;

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
    if (expoPushToken) await AuthAPI.registerPushToken(expoPushToken);
  } catch (err) {
    // Non-fatal — e.g. no EAS project ID configured yet. Push notifications
    // are a "nice to have" for the pilot, not a blocker for core flows.
    console.log("Push notification registration skipped:", err.message);
  }
}
