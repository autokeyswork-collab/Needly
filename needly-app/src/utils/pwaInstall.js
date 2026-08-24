import { Alert, Platform } from "react-native";
import { useEffect, useMemo, useState } from "react";

function getInstallEnvironment() {
  if (Platform.OS !== "web" || typeof window === "undefined" || typeof navigator === "undefined") {
    return { isWeb: false, isStandalone: false, isIos: false, isAndroid: false };
  }

  const userAgent = String(navigator.userAgent || "");
  const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.navigator?.standalone === true;

  return {
    isWeb: true,
    isStandalone,
    isIos: /iphone|ipad|ipod/i.test(userAgent),
    isAndroid: /android/i.test(userAgent),
  };
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [environment, setEnvironment] = useState(getInstallEnvironment);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;

    const refreshEnvironment = () => setEnvironment(getInstallEnvironment());
    const handlePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setHidden(false);
      refreshEnvironment();
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setHidden(true);
      refreshEnvironment();
    };

    refreshEnvironment();
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const canShowInstallButton = useMemo(() => {
    if (!environment.isWeb || environment.isStandalone || hidden) return false;
    return !!installPrompt || environment.isIos || environment.isAndroid;
  }, [environment, hidden, installPrompt]);

  const installLabel = installPrompt ? "Install" : environment.isIos ? "Add" : "Install";

  const installApp = async () => {
    if (!environment.isWeb) return;
    if (environment.isStandalone) {
      setHidden(true);
      return;
    }

    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") setHidden(true);
      setInstallPrompt(null);
      return;
    }

    const message = environment.isIos
      ? "On iPhone, tap the Share button in Safari, then choose Add to Home Screen."
      : "On Android, open Needly in Chrome, tap the browser menu, then choose Install app or Add to Home screen. If the option is missing, refresh this page once and try again.";
    Alert.alert("Install Needly", message);
  };

  return { canShowInstallButton, installApp, installLabel };
}
