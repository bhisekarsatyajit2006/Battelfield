import { useEffect, useRef } from "react";

const ThreatAlert = ({ threats }) => {
  const audioRef = useRef(null);
  const prevHighRef = useRef(false);

  // Load audio once
  useEffect(() => {
    audioRef.current = new Audio("/alert.mp3");
  }, []);

  useEffect(() => {
    if (!threats) return;

    const hasHighThreat = Object.values(threats).some(
      (t) => t.level === "HIGH"
    );

    // Play only when HIGH threat appears (not continuously)
    if (hasHighThreat && !prevHighRef.current) {
      audioRef.current?.play().catch(() => {});
    }

    prevHighRef.current = hasHighThreat;
  }, [threats]);

  return null; // no UI, just logic
};

export default ThreatAlert;