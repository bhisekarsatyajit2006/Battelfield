import React from 'react';

const ThreatPanel = ({ threats = {}, onThreatClick }) => {
  const threatEntries = Object.entries(threats);

  return (
    <div className="threat-panel" style={{ background: '#0d1b1e', padding: '16px', borderRadius: '6px', border: '1px solid #1f4d36' }}>
      <h3 style={{ color: '#00ff88', margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase' }}>
        ⚠️ Threat Detection Feed ({threatEntries.length})
      </h3>
      <div className="threat-list" style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {threatEntries.length === 0 ? (
          <div style={{ color: '#8bb39b', fontSize: '12px', textAlign: 'center', padding: '12px' }}>
            No active threat alerts flagged.
          </div>
        ) : (
          threatEntries.map(([id, threat]) => (
            <div
              key={id}
              onClick={() => onThreatClick && onThreatClick(id, threat)}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                borderLeft: `4px solid ${threat.level === 'HIGH' ? '#ff3366' : threat.level === 'MEDIUM' ? '#ff9933' : '#00ff88'}`,
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>Target {id}</div>
                <div style={{ color: '#a0a0a0', fontSize: '11px' }}>
                  Score: {((threat.score ?? 0.85) * 100).toFixed(0)}%
                </div>
              </div>
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '3px',
                fontWeight: 'bold',
                background: threat.level === 'HIGH' ? 'rgba(255, 51, 102, 0.2)' : 'rgba(0, 255, 136, 0.2)',
                color: threat.level === 'HIGH' ? '#ff3366' : '#00ff88'
              }}>
                {threat.level || 'MONITORED'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ThreatPanel;
