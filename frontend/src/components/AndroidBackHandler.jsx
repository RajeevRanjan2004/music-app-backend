import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { useLocation, useNavigate } from "react-router-dom";
import {
  browserCanNavigateBack,
  consumeNavigationBackTarget,
} from "../lib/navigation";

const AndroidBackHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      return undefined;
    }

    const listenerPromise = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack || browserCanNavigateBack()) {
        navigate(-1);
        return;
      }

      const previousPath = consumeNavigationBackTarget(location);
      if (previousPath) {
        navigate(previousPath, { replace: true });
        return;
      }

      if (location.pathname !== "/") {
        navigate("/");
        return;
      }

      CapacitorApp.minimizeApp();
    });

    return () => {
      void listenerPromise.then((listener) => listener.remove());
    };
  }, [location, navigate]);

  return null;
};

export default AndroidBackHandler;
