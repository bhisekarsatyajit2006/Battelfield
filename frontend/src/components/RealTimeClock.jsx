import React, { useState, useEffect } from 'react';
import './RealTimeClock.css';

const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());
  const [systemTime, setSystemTime] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setSystemTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <div className="real-time-clock">
      <div className="clock-time">
        <span className="time-digits">{formatTime(time)}</span>
        <span className="time-zone">UTC</span>
      </div>
      <div className="clock-date">{formatDate(time)}</div>
      <div className="system-uptime">
        System Active: {Math.floor(systemTime / 3600)}h {Math.floor((systemTime % 3600) / 60)}m {systemTime % 60}s
      </div>
    </div>
  );
};

export default RealTimeClock;