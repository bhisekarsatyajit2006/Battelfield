// frontend/src/components/ThreatMonitor.jsx

import { useEffect } from "react";
import { playAlertSound } from "../utils/sound";

const ThreatMonitor = ({ threats }) => {
  useEffect(() => {
    const hasHighThreat = Object.values(threats || {}).some(
      (t) => t.level === "HIGH"
    );

    if (hasHighThreat) {
      playAlertSound();
    }
  }, [threats]);

  return null;
};

export default ThreatMonitor;