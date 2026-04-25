import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { syncNavigationStack } from "../lib/navigation";

const NavigationTracker = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    syncNavigationStack(location, navigationType);
  }, [location, navigationType]);

  return null;
};

export default NavigationTracker;
