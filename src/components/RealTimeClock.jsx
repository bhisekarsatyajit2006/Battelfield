import React, { useState, useEffect } from 'react';
import './RealTimeClock.css';

const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="real-time-clock">
      <span className="clock-label">SYS TIME UTC</span>
      <span className="clock-value">{time.toUTCString().slice(17, 25)}</span>
    </div>
  );
};

export default RealTimeClock;
