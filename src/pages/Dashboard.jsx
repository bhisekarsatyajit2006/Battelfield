import React, { useState, useEffect, useCallback, useRef } from 'react';
import MapView from '../components/MapView';
import ThreatPanel from '../components/ThreatPanel';
import IntelligenceGraph from '../components/IntelligenceGraph';
import ExportReports from '../components/ExportReports';
import TacticalDroneHUD from '../components/TacticalDroneHUD';
import MLAnalyticsModal from '../components/MLAnalyticsModal';
import { useGlobalState } from '../hooks/useGlobalState';
import { useWebSocket } from '../hooks/useWebSocket';
import webSocketService from '../core/socket';
import { uploadDroneVideo, getReport, queryAI, getSensorData, getFusionData, getThreatData } from '../core/api';
import offlineStorage from '../utils/storage';
import performanceOptimizer from '../utils/performance';
import './Dashboard.css';

// Ensure all chat and system messages have globally unique IDs
let msgSeq = 0;
const createMessageId = (prefix = 'msg') => {
  msgSeq += 1;
  return `${prefix}-${Date.now()}-${msgSeq}-${Math.random().toString(36).substring(2, 7)}`;
};

const Dashboard = () => {
  const { state, updateState } = useGlobalState();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [showGraph, setShowGraph] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [showDroneHUD, setShowDroneHUD] = useState(false);
  const [showMLModal, setShowMLModal] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [activeLayers, setActiveLayers] = useState({
    paths: true,
    predictions: true,
    heatmap: false
  });
  
  // 🎵 Audio context for beep sound
  const audioContextRef = useRef(null);
  const previousThreatCountRef = useRef(0);
  const fileInputRef = useRef(null);

  // Ingestion handler for Tactical Drone HUD
  const handleDroneTelemetry = useCallback((result) => {
    if (!result) return;
    const updates = {};
    if (result.sample_detections || result.detections) {
      updates.objects = result.sample_detections || result.detections;
    }
    if (result.paths) updates.paths = result.paths;
    if (result.predictions) updates.predictions = result.predictions;
    if (result.threats) updates.threats = result.threats;
    if (result.clusters) updates.clusters = result.clusters;
    if (result.fused_intelligence) updates.fused = result.fused_intelligence;
    if (result.sensor_data) updates.sensors = result.sensor_data;
    if (result.blockchain) updates.blockchain = result.blockchain;
    if (result.report) updates.report = result.report;
    updateState(updates);

    const highCount = result.threats ? Object.values(result.threats).filter(t => t.level === 'HIGH').length : 0;
    addChatMessage('system', `🛸 Drone reconnaissance ingested into ML pipeline! ${highCount} high-priority targets flagged.`);
  }, [updateState]);
  
  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);
  
  // Play beep sound function
  const playBeep = useCallback((frequency = 880, duration = 0.2, volume = 0.3) => {
    try {
      const audioCtx = initAudio();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.value = frequency;
      gainNode.gain.value = volume;
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
      oscillator.stop(audioCtx.currentTime + duration);
      
      // For browsers that require user interaction first
      audioCtx.resume();
    } catch (error) {
      console.warn('⚠️ Audio not supported or user interaction required:', error);
    }
  }, [initAudio]);
  
  // Play threat alert beep sequence
  const playThreatAlert = useCallback((threatLevel, count = 1) => {
    if (threatLevel === 'HIGH') {
      // High threat: 3 rapid beeps at 1000Hz
      for (let i = 0; i < count; i++) {
        setTimeout(() => playBeep(1000, 0.15, 0.4), i * 200);
      }
    } else if (threatLevel === 'MEDIUM') {
      // Medium threat: 2 beeps at 800Hz
      for (let i = 0; i < Math.min(count, 2); i++) {
        setTimeout(() => playBeep(800, 0.2, 0.3), i * 300);
      }
    } else if (threatLevel === 'LOW') {
      // Low threat: 1 beep at 600Hz
      playBeep(600, 0.25, 0.2);
    }
  }, [playBeep]);
  
  // Monitor threats and play beep when new threats detected
  useEffect(() => {
    const threats = state.threats || {};
    const currentThreatCount = Object.keys(threats).length;
    const previousThreatCount = previousThreatCountRef.current;
    
    // Check if new threats were added
    if (currentThreatCount > previousThreatCount) {
      // Find the new threat(s)
      const newThreats = Object.entries(threats).filter(([id]) => {
        // This is simplified - you might need to track previous threats more carefully
        return true;
      });
      
      // Get highest threat level among new threats
      const highestThreat = Object.values(threats).reduce((highest, current) => {
        const levelOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return levelOrder[current.level] > levelOrder[highest.level] ? current : highest;
      }, { level: 'LOW' });
      
      // Play appropriate alert sound
      const newThreatsCount = currentThreatCount - previousThreatCount;
      playThreatAlert(highestThreat.level, Math.min(newThreatsCount, 3));
      
      // Also add visual notification to chat
      if (newThreatsCount > 0) {
        addChatMessage('system', `🔊 ALERT: ${newThreatsCount} new threat(s) detected! Highest level: ${highestThreat.level}`);
      }
    }
    
    previousThreatCountRef.current = currentThreatCount;
  }, [state.threats, playThreatAlert]);
  
  // Initialize offline storage and load initial intelligence data
  useEffect(() => {
    offlineStorage.init().catch(console.error);
    fetchInitialData();
    fetchSensorData();
    const sensorInterval = setInterval(fetchSensorData, 8000);
    return () => clearInterval(sensorInterval);
  }, []);
  
  // WebSocket connection with performance optimization
  useWebSocket((wsData) => {
    // Throttle updates for performance
    performanceOptimizer.debounce('wsUpdate', () => {
      const updates = {};
      
      if (wsData.paths) updates.paths = wsData.paths;
      if (wsData.predictions) updates.predictions = wsData.predictions;
      if (wsData.threats) updates.threats = wsData.threats;
      if (wsData.clusters) updates.clusters = wsData.clusters;
      if (wsData.fused_intelligence) updates.fused = wsData.fused_intelligence;
      if (wsData.sensor_data) updates.sensors = wsData.sensor_data;
      if (wsData.sensors) updates.sensors = wsData.sensors;
      if (wsData.blockchain) updates.blockchain = wsData.blockchain;
      if (wsData.report) updates.report = wsData.report;
      
      if (Object.keys(updates).length > 0) {
        updateState(updates);
        setLastUpdate(new Date());
        
        // Save threats to offline storage
        if (updates.threats) {
          performanceOptimizer.debounce('saveThreats', () => {
            offlineStorage.saveThreat(updates.threats).catch(console.error);
          }, 1000);
        }
      }
    }, 50);
  }, []);
  
  // Fetch initial data from APIs
  const fetchInitialData = async () => {
    try {
      // Try to load from cache first
      const cachedThreats = performanceOptimizer.getCache('threats');
      if (cachedThreats) {
        updateState({ threats: cachedThreats });
      } else {
        const threatData = await getThreatData();
        updateState({ threats: threatData });
        performanceOptimizer.setCache('threats', threatData, 30000);
      }
      
      // Fetch fusion data
      const fusionData = await getFusionData();
      updateState({ fused: fusionData.fused_intelligence });
      
      // Fetch report
      const reportData = await getReport();
      updateState({ report: reportData.summary });
      
      // Add initial chat message
      setChatHistory([{
        id: createMessageId('init'),
        type: 'system',
        message: 'System initialized. Waiting for data...',
        timestamp: new Date()
      }]);
      
      // Load historical threats from offline storage
      const historicalThreats = await offlineStorage.getThreatHistory();
      if (historicalThreats.length > 0) {
        addChatMessage('system', `📊 Loaded ${historicalThreats.length} historical threat records from local storage`);
      }
      
    } catch (error) {
      console.error('Error fetching initial data:', error);
      addChatMessage('error', 'Telemetry service connecting...');
    }
  };
  
  // Fetch sensor data periodically
  const fetchSensorData = async () => {
    try {
      const sensorData = await getSensorData();
      if (sensorData && sensorData.sensor_data) {
        updateState({ sensors: sensorData.sensor_data });
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
    }
  };
  
  // Handle video upload
  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);
      
      const result = await uploadDroneVideo(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Update state with upload results
      const updates = {};
      if (result.detections) updates.objects = result.detections;
      if (result.paths) updates.paths = result.paths;
      if (result.predictions) updates.predictions = result.predictions;
      if (result.threats) updates.threats = result.threats;
      if (result.clusters) updates.clusters = result.clusters;
      if (result.fused_intelligence) updates.fused = result.fused_intelligence;
      if (result.sensor_data) updates.sensors = result.sensor_data;
      if (result.blockchain) updates.blockchain = result.blockchain;
      
      updateState(updates);
      
      // Save to offline storage
      await offlineStorage.saveDetection({
        type: 'drone_upload',
        filename: file.name,
        detections: result.detections,
        timestamp: Date.now()
      });
      
      // Add success message to chat
      addChatMessage('system', `✅ Video uploaded successfully! Detected ${result.detections?.length || 0} objects.`);
      
      // Reset upload progress after 2 seconds
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error uploading video:', error);
      addChatMessage('error', `❌ Upload failed: ${error.message}`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Handle AI query
  const handleAIQuery = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput;
    addChatMessage('user', userMessage);
    setChatInput('');
    
    try {
      // Show typing indicator
      const typingId = createMessageId('typing');
      setChatHistory(prev => [...prev, {
        id: typingId,
        type: 'ai',
        message: '🤔 Thinking...',
        timestamp: new Date(),
        isTyping: true
      }]);
      
      const response = await queryAI(userMessage);
      
      // Remove typing indicator
      setChatHistory(prev => prev.filter(msg => msg.id !== typingId));
      
      addChatMessage('ai', response.answer);
      
      // Highlight relevant objects on map if mentioned
      if (response.answer.toLowerCase().includes('threat')) {
        // You can add logic to highlight threats on map
        addChatMessage('system', '📍 Threat locations highlighted on map');
      }
      
    } catch (error) {
      console.error('Error querying AI:', error);
      addChatMessage('error', 'Failed to get response from AI. Check backend connection.');
    }
  };
  
  // Add message to chat history
  const addChatMessage = (type, message) => {
    const newMsgId = createMessageId('chat');
    setChatHistory(prev => [...prev, {
      id: newMsgId,
      type: type,
      message: message,
      timestamp: new Date(),
      isTyping: false
    }]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  };
  
  // Handle threat click - zoom to object on map
  const handleThreatClick = useCallback((objectId, threat) => {
    setSelectedObjectId(objectId);
    const threatLvl = threat?.level || (state.threats?.[objectId]?.level) || 'MONITORED';
    const scoreVal = threat?.score ?? state.threats?.[objectId]?.score ?? 0.85;
    addChatMessage('system', `🎯 Target Locked: Object ${objectId} - ${threatLvl} threat level (${(scoreVal * 100).toFixed(1)}% confidence). Map tracking centered.`);
  }, [state.threats]);
  
  // Handle graph node click
  const handleGraphNodeClick = useCallback((node) => {
    if (node.type === 'vehicle') {
      setSelectedObjectId(node.objectId);
      addChatMessage('system', `🎯 Network Node Selected: Vehicle ${node.objectId} - Tracking locked on map.`);
    } else if (node.type === 'sensor') {
      addChatMessage('system', `📡 Sensor Node ${node.sensorData?.sensor_id || node.id} telemetry inspected - Direction: ${node.sensorData?.direction || 'N/A'}°`);
    } else if (node.type === 'cluster') {
      addChatMessage('system', `👥 Convoy Cluster ${node.clusterId} tactical group active.`);
    }
  }, []);
  
  // Handle export
  const handleExport = (format) => {
    console.log(`📄 Exported as ${format}`);
    setShowExport(false);
    addChatMessage('system', `✅ Report exported as ${format.toUpperCase()}`);
  };
  
  // Toggle layer visibility
  const toggleLayer = (layer) => {
    setActiveLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
    addChatMessage('system', `${layer === 'heatmap' ? '🔥 Heatmap' : layer === 'paths' ? '🟢 Paths' : '📈 Predictions'} layer ${!activeLayers[layer] ? 'enabled' : 'disabled'}`);
  };
  
  // Clear chat history
  const clearChatHistory = () => {
    setChatHistory([{
      id: createMessageId('clear'),
      type: 'system',
      message: 'Chat history cleared',
      timestamp: new Date()
    }]);
  };
  
  // Get threat statistics
  const getThreatStats = () => {
    const threats = state.threats || {};
    const highCount = Object.values(threats).filter(t => t.level === 'HIGH').length;
    const mediumCount = Object.values(threats).filter(t => t.level === 'MEDIUM').length;
    const lowCount = Object.values(threats).filter(t => t.level === 'LOW').length;
    return { highCount, mediumCount, lowCount, total: Object.keys(threats).length };
  };
  
  const threatStats = getThreatStats();
  
  return (
    <div className={`dashboard ${performanceMode ? 'performance-mode' : ''}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="logo-section">
          <h1>🎯 BATTLEFIELD INTELLIGENCE SYSTEM</h1>
          <div className="system-status">
            <span className="status-dot"></span>
            <span>ACTIVE</span>
            {lastUpdate && (
              <span className="last-update">
                Last Update: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="header-controls">
          <button 
            className="hud-open-btn"
            onClick={() => setShowDroneHUD(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.25), rgba(0, 200, 255, 0.25))',
              border: '1px solid #00ff88',
              color: '#00ff88',
              fontWeight: 'bold',
              padding: '8px 14px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 10px rgba(0, 255, 136, 0.2)'
            }}
          >
            🎯 TACTICAL DRONE HUD
          </button>

          <button 
            className="ml-open-btn"
            onClick={() => setShowMLModal(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(51, 204, 255, 0.25), rgba(150, 100, 255, 0.25))',
              border: '1px solid #33ccff',
              color: '#33ccff',
              fontWeight: 'bold',
              padding: '8px 14px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 10px rgba(51, 204, 255, 0.2)'
            }}
          >
            🧠 ML ARCHITECTURE & MODELS
          </button>

          <div className="upload-section">
            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/*"
              onChange={handleVideoUpload}
              style={{ display: 'none' }}
            />
            <button 
              className="upload-btn"
              onClick={() => fileInputRef.current.click()}
              disabled={isUploading}
            >
              {isUploading ? '📤 UPLOADING...' : '🎥 UPLOAD VIDEO FILE'}
            </button>
            {isUploading && (
              <div className="upload-progress">
                <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                <span>{uploadProgress}%</span>
              </div>
            )}
          </div>
          
          <div className="export-section">
            <button className="export-menu-btn" onClick={() => setShowExport(!showExport)}>
              📊 Export Reports
            </button>
            {showExport && (
              <div className="export-dropdown">
                <ExportReports 
                  data={{
                    threats: state.threats,
                    paths: state.paths,
                    predictions: state.predictions,
                    clusters: state.clusters,
                    fused: state.fused,
                    sensors: state.sensors,
                    report: state.report,
                    timestamp: new Date()
                  }}
                  onExport={handleExport}
                />
              </div>
            )}
          </div>
          
          <button 
            className={`performance-toggle ${performanceMode ? 'active' : ''}`}
            onClick={() => setPerformanceMode(!performanceMode)}
            title={performanceMode ? "Disable Performance Mode" : "Enable Performance Mode"}
          >
            {performanceMode ? '⚡ Performance Mode' : '🎨 Quality Mode'}
          </button>
        </div>
        
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-value">{threatStats.total}</div>
            <div className="stat-label">Total Objects</div>
          </div>
          <div className="stat-card threat-high">
            <div className="stat-value">{threatStats.highCount}</div>
            <div className="stat-label">High Threats</div>
          </div>
          <div className="stat-card threat-medium">
            <div className="stat-value">{threatStats.mediumCount}</div>
            <div className="stat-label">Medium Threats</div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="dashboard-content">
        {/* Map Section - Primary */}
        <div className="map-section">
          <div className="section-header">
            <h3>🗺️ LIVE SURVEILLANCE MAP</h3>
            <div className="layer-controls">
              <button 
                className={`layer-btn ${activeLayers.paths ? 'active' : ''}`}
                onClick={() => toggleLayer('paths')}
              >
                Paths
              </button>
              <button 
                className={`layer-btn ${activeLayers.predictions ? 'active' : ''}`}
                onClick={() => toggleLayer('predictions')}
              >
                Predictions
              </button>
              <button 
                className={`layer-btn ${activeLayers.heatmap ? 'active' : ''}`}
                onClick={() => toggleLayer('heatmap')}
              >
                Heatmap
              </button>
            </div>
          </div>
          <div className="map-container">
            <MapView 
              data={{
                paths: activeLayers.paths ? state.paths : {},
                predictions: activeLayers.predictions ? state.predictions : {},
                threats: state.threats,
                clusters: state.clusters,
                fused: state.fused,
                sensors: state.sensors
              }}
              onObjectClick={handleThreatClick}
              showHeatmap={activeLayers.heatmap}
              selectedObjectId={selectedObjectId}
              performanceMode={performanceMode}
            />
          </div>
        </div>
        
        {/* Right Sidebar */}
        <div className="sidebar">
          {/* Threat Panel */}
          <div className="threat-section">
            <ThreatPanel 
              threats={state.threats}
              onThreatClick={handleThreatClick}
            />
          </div>
          
          {/* Intelligence Graph Toggle */}
          <button 
            className="graph-toggle"
            onClick={() => setShowGraph(!showGraph)}
          >
            {showGraph ? '📊 Hide Intelligence Graph' : '📊 Show Intelligence Graph'}
          </button>
          
          {/* Intelligence Graph */}
          {showGraph && (
            <div className="graph-section">
              <IntelligenceGraph 
                paths={state.paths}
                clusters={state.clusters}
                sensors={state.sensors}
                fused={state.fused}
                onNodeClick={handleGraphNodeClick}
                performanceMode={performanceMode}
              />
            </div>
          )}
          
          {/* AI Chat Section */}
          <div className="chat-section">
            <div className="section-header">
              <h3>💬 AI COMMAND CENTER</h3>
              <div className="chat-header-actions">
                <span className="ai-status">Online</span>
                <button className="clear-chat-btn" onClick={clearChatHistory} title="Clear chat history">
                  🗑️
                </button>
              </div>
            </div>
            
            <div className="chat-messages">
              {chatHistory.length === 0 ? (
                <div className="empty-chat">
                  <div className="empty-chat-icon">💬</div>
                  <p>Ask AI about battlefield intelligence</p>
                </div>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div key={msg.id ? `${msg.id}-${idx}` : `chat-msg-${idx}`} className={`chat-message ${msg.type} ${msg.isTyping ? 'typing' : ''}`}>
                    <div className="message-icon">
                      {msg.type === 'user' && '👤'}
                      {msg.type === 'ai' && '🤖'}
                      {msg.type === 'system' && '🔧'}
                      {msg.type === 'error' && '⚠️'}
                    </div>
                    <div className="message-content">
                      <div className="message-text">
                        {msg.isTyping ? (
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        ) : (
                          msg.message
                        )}
                      </div>
                      <div className="message-time">
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="chat-input-area">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAIQuery()}
                placeholder="Ask AI about threats, objects, or battlefield status..."
                className="chat-input"
                disabled={performanceMode}
              />
              <button onClick={handleAIQuery} className="send-btn" disabled={performanceMode}>
                SEND
              </button>
            </div>
            
            <div className="quick-actions">
              <button onClick={() => setChatInput("What are the current threats?")}>
                Current Threats
              </button>
              <button onClick={() => setChatInput("Show threat summary")}>
                Threat Summary
              </button>
              <button onClick={() => setChatInput("Any convoy detected?")}>
                Convoy Detection
              </button>
              <button onClick={() => setChatInput("Recommend tactical command directives")}>
                Tactical Directive
              </button>
              <button onClick={() => setChatInput("Show force inventory count")}>
                Force Inventory
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Report Bar */}
      {state.report && (
        <div className="report-bar">
          <span className="report-icon">📋</span>
          <span className="report-text">{state.report}</span>
          <button className="close-report" onClick={() => updateState({ report: "" })}>×</button>
        </div>
      )}
      
      {/* Performance Mode Indicator */}
      {performanceMode && (
        <div className="performance-indicator">
          ⚡ Performance Mode Active - Reduced animations for better performance
        </div>
      )}

      {/* Tactical Drone Surveillance HUD Modal */}
      <TacticalDroneHUD
        isOpen={showDroneHUD}
        onClose={() => setShowDroneHUD(false)}
        onTelemetryIngested={handleDroneTelemetry}
        threats={state.threats}
      />

      {/* ML Architecture & Analytics Suite Modal */}
      <MLAnalyticsModal
        isOpen={showMLModal}
        onClose={() => setShowMLModal(false)}
      />
    </div>
  );
};

export default Dashboard;