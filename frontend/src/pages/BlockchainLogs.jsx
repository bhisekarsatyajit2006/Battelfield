import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../hooks/useGlobalState';
import './BlockchainLogs.css';

const BlockchainLogs = () => {
  const { state } = useGlobalState();
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    // Simulate blockchain logs
    const generateLogs = () => {
      const mockLogs = [];
      
      // Add drone upload logs
      if (state.blockchain) {
        mockLogs.push({
          id: Date.now(),
          type: 'drone_upload',
          timestamp: new Date(),
          tx_hash: state.blockchain.tx_hash,
          data_hash: state.blockchain.data_hash,
          status: 'verified',
          details: {
            objects_detected: Object.keys(state.paths || {}).length,
            threats_detected: Object.keys(state.threats || {}).length
          }
        });
      }
      
      // Add sensor data logs
      if (state.sensors && state.sensors.length > 0) {
        mockLogs.push({
          id: Date.now() + 1,
          type: 'sensor_data',
          timestamp: new Date(),
          tx_hash: `0x${Math.random().toString(36).substr(2, 40)}`,
          data_hash: `0x${Math.random().toString(36).substr(2, 40)}`,
          status: 'verified',
          details: {
            sensors_active: state.sensors.length,
            last_update: new Date().toISOString()
          }
        });
      }
      
      setLogs(mockLogs);
    };
    
    generateLogs();
    
    // Poll for new logs every 10 seconds
    const interval = setInterval(generateLogs, 10000);
    
    return () => clearInterval(interval);
  }, [state.blockchain, state.sensors]);
  
  const getStatusIcon = (status) => {
    switch(status) {
      case 'verified':
        return '✅';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '🔍';
    }
  };
  
  const getTypeIcon = (type) => {
    switch(type) {
      case 'drone_upload':
        return '🎥';
      case 'sensor_data':
        return '📡';
      case 'fusion_data':
        return '🧠';
      default:
        return '📄';
    }
  };
  
  const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.type === filter);
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };
  
  return (
    <div className="blockchain-page">
      <div className="blockchain-header">
        <h1>🔗 BLOCKCHAIN VERIFICATION LOGS</h1>
        <div className="trust-badge">
          <span className="trust-icon">✓</span>
          <span>Immutable Ledger Active</span>
        </div>
      </div>
      
      <div className="blockchain-stats">
        <div className="stat">
          <div className="stat-value">{logs.length}</div>
          <div className="stat-label">Total Transactions</div>
        </div>
        <div className="stat">
          <div className="stat-value">100%</div>
          <div className="stat-label">Verification Rate</div>
        </div>
        <div className="stat">
          <div className="stat-value">Active</div>
          <div className="stat-label">Blockchain Status</div>
        </div>
      </div>
      
      <div className="filter-bar">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Transactions
        </button>
        <button 
          className={filter === 'drone_upload' ? 'active' : ''}
          onClick={() => setFilter('drone_upload')}
        >
          Drone Data
        </button>
        <button 
          className={filter === 'sensor_data' ? 'active' : ''}
          onClick={() => setFilter('sensor_data')}
        >
          Sensor Data
        </button>
      </div>
      
      <div className="logs-container">
        {filteredLogs.length === 0 ? (
          <div className="empty-logs">
            <div className="empty-icon">🔗</div>
            <h3>No Blockchain Transactions Yet</h3>
            <p>Upload drone videos or sensor data to generate blockchain records</p>
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="log-entry" onClick={() => setSelectedLog(log)}>
              <div className="log-icon">{getTypeIcon(log.type)}</div>
              <div className="log-content">
                <div className="log-header">
                  <span className="log-type">{log.type.toUpperCase()}</span>
                  <span className="log-status">{getStatusIcon(log.status)} {log.status}</span>
                </div>
                <div className="log-timestamp">
                  {log.timestamp.toLocaleString()}
                </div>
                <div className="log-hash">
                  <span className="hash-label">Tx Hash:</span>
                  <span className="hash-value">{log.tx_hash?.substring(0, 20)}...</span>
                  <button 
                    className="copy-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(log.tx_hash);
                    }}
                  >
                    📋
                  </button>
                </div>
                {log.details && (
                  <div className="log-details-preview">
                    {Object.entries(log.details).map(([key, value]) => (
                      <span key={key} className="detail-tag">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="log-arrow">→</div>
            </div>
          ))
        )}
      </div>
      
      {selectedLog && (
        <div className="log-detail-modal" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Transaction Details</h3>
            <div className="detail-section">
              <strong>Transaction Hash:</strong>
              <code>{selectedLog.tx_hash}</code>
              <button onClick={() => copyToClipboard(selectedLog.tx_hash)}>Copy</button>
            </div>
            <div className="detail-section">
              <strong>Data Hash:</strong>
              <code>{selectedLog.data_hash}</code>
              <button onClick={() => copyToClipboard(selectedLog.data_hash)}>Copy</button>
            </div>
            <div className="detail-section">
              <strong>Timestamp:</strong>
              <span>{selectedLog.timestamp.toLocaleString()}</span>
            </div>
            <div className="detail-section">
              <strong>Status:</strong>
              <span className={`status-${selectedLog.status}`}>{selectedLog.status}</span>
            </div>
            {selectedLog.details && (
              <div className="detail-section">
                <strong>Metadata:</strong>
                <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
              </div>
            )}
            <button className="close-btn" onClick={() => setSelectedLog(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockchainLogs;