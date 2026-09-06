import React, { useState, useEffect, useRef } from 'react';
import { playAlertSound } from '../utils/sound';
import './NotificationSystem.css';

let notifSeq = 0;
const createNotifId = (prefix) => {
  notifSeq += 1;
  return `${prefix}-${Date.now()}-${notifSeq}-${Math.random().toString(36).substring(2, 7)}`;
};

const NotificationSystem = ({ threats, report }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  useEffect(() => {
    if (threats) {
      // Check for new high threats
      Object.entries(threats).forEach(([id, threat]) => {
        if (threat.level === 'HIGH') {
          addNotification({
            id: createNotifId(`threat-${id}`),
            type: 'critical',
            title: '⚠️ CRITICAL THREAT DETECTED',
            message: `Object ${id} is a HIGH level threat with ${(threat.score * 100).toFixed(1)}% confidence`,
            timestamp: new Date(),
            objectId: id
          });
        } else if (threat.level === 'MEDIUM') {
          addNotification({
            id: createNotifId(`threat-${id}`),
            type: 'warning',
            title: '⚠️ Medium Threat Detected',
            message: `Object ${id} requires monitoring`,
            timestamp: new Date(),
            objectId: id
          });
        }
      });
    }
    
    if (report && report.includes('convoy')) {
      addNotification({
        id: createNotifId('convoy'),
        type: 'info',
        title: '🚚 Convoy Detected',
        message: 'Multiple vehicles moving in formation',
        timestamp: new Date()
      });
    }
  }, [threats, report]);
  
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 10));
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };
  
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const getIcon = (type) => {
    switch(type) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '📢';
    }
  };
  
  const playedIdsRef = useRef(new Set());

  const getSound = (type) => {
    try {
      playAlertSound(type === 'critical' ? 'HIGH' : 'MEDIUM');
    } catch (e) {
      console.warn('Notification chime failed:', e);
    }
  };
  
  useEffect(() => {
    notifications.forEach(notif => {
      if (!playedIdsRef.current.has(notif.id)) {
        playedIdsRef.current.add(notif.id);
        getSound(notif.type);
      }
    });
  }, [notifications]);
  
  return (
    <>
      <button 
        className="notification-bell"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        🔔
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length}</span>
        )}
      </button>
      
      {showNotifications && (
        <div className="notification-panel">
          <div className="notification-header">
            <h4>System Alerts</h4>
            <button onClick={() => setShowNotifications(false)}>×</button>
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                ✓ No new notifications
              </div>
            ) : (
              notifications.map((notif, idx) => (
                <div key={notif.id ? `${notif.id}-${idx}` : `notif-${idx}`} className={`notification ${notif.type}`}>
                  <div className="notification-icon">{getIcon(notif.type)}</div>
                  <div className="notification-content">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-message">{notif.message}</div>
                    <div className="notification-time">
                      {notif.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <button 
                    className="notification-close"
                    onClick={() => removeNotification(notif.id)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationSystem;