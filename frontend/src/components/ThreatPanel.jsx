import React, { useState, useEffect } from 'react';
import './ThreatPanel.css';

const ThreatPanel = ({ threats, onThreatClick }) => {
  const [selectedThreat, setSelectedThreat] = useState(null);
  
  // Sort threats by severity
  const sortedThreats = Object.entries(threats || {}).sort((a, b) => {
    const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return severityOrder[b[1].level] - severityOrder[a[1].level];
  });
  
  const getThreatClass = (level) => {
    switch(level) {
      case 'HIGH':
        return 'threat-high';
      case 'MEDIUM':
        return 'threat-medium';
      default:
        return 'threat-low';
    }
  };
  
  const getThreatIcon = (level) => {
    switch(level) {
      case 'HIGH':
        return '⚠️';
      case 'MEDIUM':
        return '⚡';
      default:
        return '✓';
    }
  };
  
  const handleThreatClick = (objectId, threat) => {
    setSelectedThreat(objectId);
    if (onThreatClick) {
      onThreatClick(objectId, threat);
    }
  };
  
  return (
    <div className="threat-panel">
      <div className="threat-header">
        <h3>⚠️ THREAT INTELLIGENCE</h3>
        <div className="threat-stats">
          <span className="stat-high">HIGH: {sortedThreats.filter(t => t[1].level === 'HIGH').length}</span>
          <span className="stat-medium">MED: {sortedThreats.filter(t => t[1].level === 'MEDIUM').length}</span>
          <span className="stat-low">LOW: {sortedThreats.filter(t => t[1].level === 'LOW').length}</span>
        </div>
      </div>
      
      <div className="threat-list">
        {sortedThreats.length === 0 ? (
          <div className="no-threats">
            <p>✓ No active threats detected</p>
          </div>
        ) : (
          sortedThreats.map(([objectId, threat]) => (
            <div
              key={objectId}
              className={`threat-item ${getThreatClass(threat.level)} ${selectedThreat === objectId ? 'selected' : ''}`}
              onClick={() => handleThreatClick(objectId, threat)}
            >
              <div className="threat-icon">
                {getThreatIcon(threat.level)}
              </div>
              <div className="threat-info">
                <div className="threat-id">Object #{objectId}</div>
                <div className="threat-level">{threat.level}</div>
                {threat.score && (
                  <div className="threat-score">
                    Score: {(threat.score * 100).toFixed(1)}%
                  </div>
                )}
                {threat.confidence && (
                  <div className="threat-confidence">
                    Confidence: {(threat.confidence * 100).toFixed(1)}%
                  </div>
                )}
              </div>
              <div className="threat-indicator"></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ThreatPanel;