import React, { useState, useEffect, useRef } from 'react';
import { uploadDroneVideo } from '../core/api';
import { KalmanFilter2D, dbscanClustering, calculateTacticalThreatML } from '../utils/tacticalML';
import './TacticalDroneHUD.css';

// Preset tactical scenarios for immediate operator inspection
const PRESET_MISSIONS = [
  {
    id: 'flir-night',
    name: 'MQ-9 FLIR Thermal Night Intercept',
    sensorType: 'FLIR White-Hot IR',
    zoom: '16.5x EO/IR',
    altitude: 1540,
    targets: [
      { id: 'TGT-01', class: 'T-90 Main Battle Tank', category: 'armor', confidence: 0.94, speed: 42, heading: 135, x: 28, y: 38, w: 16, h: 10, threat: 'HIGH' },
      { id: 'TGT-02', class: 'SA-22 Greyhound SAM', category: 'radar', confidence: 0.92, speed: 38, heading: 135, x: 48, y: 44, w: 14, h: 9, threat: 'HIGH' },
      { id: 'TGT-03', class: 'Ural-4320 Ammo Supply', category: 'transport', confidence: 0.88, speed: 40, heading: 138, x: 68, y: 52, w: 18, h: 11, threat: 'MEDIUM' }
    ]
  },
  {
    id: 'convoy-day',
    name: 'ScanEagle Armored Column Sector Alpha',
    sensorType: 'High-Res Optical EO',
    zoom: '8.2x Optical',
    altitude: 1120,
    targets: [
      { id: 'TGT-04', class: 'BTR-82A Armored Carrier', category: 'armor', confidence: 0.91, speed: 55, heading: 90, x: 32, y: 42, w: 15, h: 10, threat: 'HIGH' },
      { id: 'TGT-05', class: 'Kamaz Tactical Transport', category: 'transport', confidence: 0.86, speed: 52, heading: 92, x: 52, y: 46, w: 17, h: 11, threat: 'MEDIUM' },
      { id: 'TGT-06', class: 'Command Staff Vehicle', category: 'command', confidence: 0.89, speed: 54, heading: 90, x: 72, y: 48, w: 14, h: 9, threat: 'HIGH' }
    ]
  },
  {
    id: 'perimeter-patrol',
    name: 'RQ-4 High-Altitude Perimeter Scan',
    sensorType: 'Synthetic Aperture / Optical',
    zoom: '24.0x Telephoto',
    altitude: 2800,
    targets: [
      { id: 'TGT-07', class: 'Fortified Bunker Entrance', category: 'infrastructure', confidence: 0.96, speed: 0, heading: 0, x: 42, y: 35, w: 20, h: 15, threat: 'HIGH' },
      { id: 'TGT-08', class: 'Radar Antenna Array', category: 'radar', confidence: 0.93, speed: 0, heading: 0, x: 65, y: 55, w: 14, h: 14, threat: 'HIGH' }
    ]
  }
];

export default function TacticalDroneHUD({
  isOpen,
  onClose,
  onTelemetryIngested,
  threats = {}
}) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_MISSIONS[0]);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [irFilterMode, setIrFilterMode] = useState('flir-white'); // flir-white, flir-black, optical, night-green
  const [laserRanging, setLaserRanging] = useState(4120);
  const [opticalZoom, setOpticalZoom] = useState(14.2);
  const [hudActive, setHudActive] = useState(true);
  const [activeTab, setActiveTab] = useState('hud'); // hud, ml-analytics
  const [mlData, setMlData] = useState(null);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const animFrameRef = useRef(null);

  // Compute ML calculations on preset or detected targets
  useEffect(() => {
    const targets = selectedPreset.targets.map(t => ({
      id: t.id,
      location: [20.15 + (t.y / 1000), 76.90 + (t.x / 1000)],
      speed: t.speed,
      direction: t.heading
    }));

    // Run DBSCAN
    const dbscanResult = dbscanClustering(targets, 0.05, 2);

    // Run Kalman & Bayesian scoring
    const analyzed = selectedPreset.targets.map((t, idx) => {
      const kf = new KalmanFilter2D([20.15 + (t.y / 1000), 76.90 + (t.x / 1000), t.speed * 0.0001, t.speed * 0.0001]);
      const forecast = kf.forecast(3, 1.5);
      const threatScore = calculateTacticalThreatML({
        targetClass: t.class,
        speedKmh: t.speed,
        headingDeg: t.heading,
        location: [20.15 + (t.y / 1000), 76.90 + (t.x / 1000)],
        inConvoy: dbscanResult.clusters[t.id] >= 0,
        convoySize: selectedPreset.targets.length,
        confidence: t.confidence
      });

      return {
        ...t,
        kalmanForecast: forecast,
        threatAnalysis: threatScore,
        convoyId: dbscanResult.clusters[t.id]
      };
    });

    setMlData({
      analyzedTargets: analyzed,
      convoyMetrics: dbscanResult.convoyMetrics,
      kalmanActive: true
    });
  }, [selectedPreset]);

  // Canvas visual rendering loop for tactical HUD feed
  useEffect(() => {
    if (!isOpen || uploadedVideoUrl) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;

    const renderFeed = () => {
      frameCount++;
      const w = canvas.width;
      const h = canvas.height;

      // Background terrain generation depending on IR filter
      if (irFilterMode === 'flir-white') {
        ctx.fillStyle = '#10141a';
        ctx.fillRect(0, 0, w, h);
        // Subtle terrain thermal contours
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < h; i += 30) {
          ctx.beginPath();
          ctx.moveTo(0, i + Math.sin((frameCount + i) * 0.02) * 5);
          ctx.lineTo(w, i + Math.sin((frameCount + i) * 0.02) * 5);
          ctx.stroke();
        }
      } else if (irFilterMode === 'night-green') {
        ctx.fillStyle = '#051508';
        ctx.fillRect(0, 0, w, h);
        // Night noise
        ctx.fillStyle = 'rgba(0, 255, 100, 0.03)';
        for (let j = 0; j < 40; j++) {
          const rx = Math.random() * w;
          const ry = Math.random() * h;
          ctx.fillRect(rx, ry, 2, 2);
        }
      } else {
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, w, h);
      }

      // Render tactical road / transit corridor
      ctx.strokeStyle = irFilterMode === 'night-green' ? 'rgba(0, 255, 120, 0.15)' : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 40;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.2);
      ctx.bezierCurveTo(w * 0.35, h * 0.35, w * 0.6, h * 0.55, w * 0.9, h * 0.7);
      ctx.stroke();

      // Render Targets with ML Bounding Boxes
      selectedPreset.targets.forEach((target, idx) => {
        // Minor dynamic drift to simulate vehicle motion
        const driftX = Math.sin((frameCount + idx * 40) * 0.02) * 12;
        const driftY = Math.cos((frameCount + idx * 40) * 0.02) * 4;

        const tx = (target.x / 100) * w + driftX;
        const ty = (target.y / 100) * h + driftY;
        const tw = (target.w / 100) * w;
        const th = (target.h / 100) * h;

        // Vehicle silhouette / thermal heat glow
        if (irFilterMode === 'flir-white') {
          // Heat bloom
          const radGrad = ctx.createRadialGradient(tx + tw / 2, ty + th / 2, 5, tx + tw / 2, ty + th / 2, tw * 0.8);
          radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          radGrad.addColorStop(0.5, 'rgba(220, 220, 220, 0.6)');
          radGrad.addColorStop(1, 'rgba(100, 100, 100, 0)');
          ctx.fillStyle = radGrad;
          ctx.fillRect(tx - tw * 0.2, ty - th * 0.2, tw * 1.4, th * 1.4);
        } else {
          ctx.fillStyle = irFilterMode === 'night-green' ? 'rgba(0, 255, 120, 0.7)' : 'rgba(255, 80, 80, 0.8)';
          ctx.fillRect(tx, ty, tw, th);
        }

        // Bounding Box (Corner Brackets)
        const isSelected = selectedTarget?.id === target.id;
        const strokeColor = isSelected ? '#00ffff' : (target.threat === 'HIGH' ? '#ff3366' : '#ffaa00');
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;

        const cornerLen = 8;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(tx, ty + cornerLen);
        ctx.lineTo(tx, ty);
        ctx.lineTo(tx + cornerLen, ty);
        // Top-right
        ctx.moveTo(tx + tw - cornerLen, ty);
        ctx.lineTo(tx + tw, ty);
        ctx.lineTo(tx + tw, ty + cornerLen);
        // Bottom-left
        ctx.moveTo(tx, ty + th - cornerLen);
        ctx.lineTo(tx, ty + th);
        ctx.lineTo(tx + cornerLen, ty + th);
        // Bottom-right
        ctx.moveTo(tx + tw - cornerLen, ty + th);
        ctx.lineTo(tx + tw, ty + th);
        ctx.lineTo(tx + tw, ty + th - cornerLen);
        ctx.stroke();

        // AI Identification Tag
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(tx, ty - 22, tw + 30, 20);
        ctx.fillStyle = strokeColor;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`[${target.id}] ${target.class.slice(0, 12)}`, tx + 4, ty - 8);

        // Confidence & Speed
        ctx.fillStyle = '#00ff88';
        ctx.font = '9px monospace';
        ctx.fillText(`${Math.round(target.confidence * 100)}% | ${target.speed} km/h`, tx, ty + th + 14);

        // Reticle Lock if selected
        if (isSelected) {
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(tx + tw / 2, ty + th / 2, tw * 0.9, 0, Math.PI * 2);
          ctx.stroke();

          // Pulsing inner crosshairs
          const pulse = (Math.sin(frameCount * 0.1) + 1) * 3;
          ctx.beginPath();
          ctx.moveTo(tx + tw / 2 - 15 - pulse, ty + th / 2);
          ctx.lineTo(tx + tw / 2 + 15 + pulse, ty + th / 2);
          ctx.moveTo(tx + tw / 2, ty + th / 2 - 15 - pulse);
          ctx.lineTo(tx + tw / 2, ty + th / 2 + 15 + pulse);
          ctx.stroke();
        }
      });

      // Flight OSD Horizon Line
      if (hudActive) {
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
        ctx.lineWidth = 1;
        // Pitch ladder
        const cy = h / 2;
        const cx = w / 2;
        ctx.beginPath();
        ctx.moveTo(cx - 60, cy);
        ctx.lineTo(cx - 20, cy);
        ctx.moveTo(cx + 20, cy);
        ctx.lineTo(cx + 60, cy);
        ctx.moveTo(cx, cy - 10);
        ctx.lineTo(cx, cy + 10);
        ctx.stroke();

        // Reticle Center Box
        ctx.strokeRect(cx - 15, cy - 15, 30, 30);
      }

      animFrameRef.current = requestAnimationFrame(renderFeed);
    };

    renderFeed();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, selectedPreset, irFilterMode, selectedTarget, hudActive, uploadedVideoUrl]);

  // Handle video upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const url = URL.createObjectURL(file);
      setUploadedVideoUrl(url);

      const interval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
      }, 300);

      const result = await uploadDroneVideo(file);
      clearInterval(interval);
      setUploadProgress(100);

      if (onTelemetryIngested && result) {
        onTelemetryIngested(result);
      }

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (err) {
      console.error('Error uploading video to tactical pipeline:', err);
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tactical-drone-modal-overlay">
      <div className="tactical-drone-modal">
        {/* Modal Header */}
        <div className="drone-modal-header">
          <div className="modal-title-group">
            <span className="drone-live-badge">● LIVE UAV OPTICAL FEED</span>
            <h3>TACTICAL DRONE SURVEILLANCE & RECONNAISSANCE HUD</h3>
            <span className="mission-name">{selectedPreset.name}</span>
          </div>
          <div className="modal-actions">
            <div className="hud-tabs">
              <button
                className={`tab-btn ${activeTab === 'hud' ? 'active' : ''}`}
                onClick={() => setActiveTab('hud')}
              >
                🎥 Video HUD
              </button>
              <button
                className={`tab-btn ${activeTab === 'ml-analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('ml-analytics')}
              >
                🧠 ML Kinematics & Convoy Engine
              </button>
            </div>
            <button className="drone-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Main Body */}
        <div className="drone-modal-content">
          {activeTab === 'hud' ? (
            <div className="hud-viewport-container">
              {/* Top OSD Telemetry Ribbon */}
              <div className="osd-top-ribbon">
                <div className="osd-item">
                  <span className="osd-label">PLATFORM:</span>
                  <span className="osd-val">MQ-9A REAPER BLK-5</span>
                </div>
                <div className="osd-item">
                  <span className="osd-label">ALT (AGL):</span>
                  <span className="osd-val">{selectedPreset.altitude}m</span>
                </div>
                <div className="osd-item">
                  <span className="osd-label">ZOOM:</span>
                  <span className="osd-val">{opticalZoom}x EO/IR</span>
                </div>
                <div className="osd-item">
                  <span className="osd-label">LRF SLANT:</span>
                  <span className="osd-val">{laserRanging}m</span>
                </div>
                <div className="osd-item">
                  <span className="osd-label">GIMBAL:</span>
                  <span className="osd-val">-34.2° PITCH | 135° AZ</span>
                </div>
                <div className="osd-item">
                  <span className="osd-label">GRID:</span>
                  <span className="osd-val">43Q EK 7695 2018</span>
                </div>
              </div>

              {/* Video Player or Simulated Tactical Canvas */}
              <div className="canvas-wrapper">
                {uploadedVideoUrl ? (
                  <div className="uploaded-video-container">
                    <video
                      src={uploadedVideoUrl}
                      controls
                      autoPlay
                      loop
                      className="drone-native-video"
                    />
                    <div className="ai-overlay-banner">
                      <span>🤖 ML Computer Vision Active on User Uploaded Video</span>
                      <button onClick={() => setUploadedVideoUrl(null)}>Switch to Simulated FLIR Canvas</button>
                    </div>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    width={840}
                    height={460}
                    className="drone-tactical-canvas"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
                      const clickY = ((e.clientY - rect.top) / rect.height) * 100;

                      // Find closest target
                      const found = selectedPreset.targets.find(t =>
                        Math.abs(t.x + t.w / 2 - clickX) < 15 && Math.abs(t.y + t.h / 2 - clickY) < 15
                      );
                      setSelectedTarget(found || null);
                    }}
                  />
                )}

                {/* Target Information Sidebar Card (Floating) */}
                {selectedTarget && (
                  <div className="target-floating-card">
                    <div className="target-card-header">
                      <span className="target-lock-icon">🎯 TARGET LOCKED</span>
                      <button onClick={() => setSelectedTarget(null)}>✕</button>
                    </div>
                    <div className="target-card-body">
                      <div className="target-data-row">
                        <span>DESIGNATOR:</span>
                        <strong>{selectedTarget.id}</strong>
                      </div>
                      <div className="target-data-row">
                        <span>CLASS:</span>
                        <strong>{selectedTarget.class}</strong>
                      </div>
                      <div className="target-data-row">
                        <span>ML CONFIDENCE:</span>
                        <strong className="green-txt">{(selectedTarget.confidence * 100).toFixed(1)}%</strong>
                      </div>
                      <div className="target-data-row">
                        <span>SPEED / VECTOR:</span>
                        <strong>{selectedTarget.speed} km/h @ {selectedTarget.heading}°</strong>
                      </div>
                      <div className="target-data-row">
                        <span>BAYESIAN THREAT:</span>
                        <strong className={selectedTarget.threat === 'HIGH' ? 'red-txt' : 'amber-txt'}>
                          {selectedTarget.threat} (PRIORITY 1)
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Flight Controls and Operational Presets */}
              <div className="hud-bottom-bar">
                <div className="preset-selector-group">
                  <span className="ctrl-label">MISSION FEED:</span>
                  {PRESET_MISSIONS.map(p => (
                    <button
                      key={p.id}
                      className={`preset-btn ${selectedPreset.id === p.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedPreset(p);
                        setUploadedVideoUrl(null);
                        setSelectedTarget(null);
                      }}
                    >
                      {p.name.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <div className="spectral-filter-group">
                  <span className="ctrl-label">SENSOR PALETTE:</span>
                  <button
                    className={`filter-btn ${irFilterMode === 'flir-white' ? 'active' : ''}`}
                    onClick={() => setIrFilterMode('flir-white')}
                  >
                    FLIR White-Hot
                  </button>
                  <button
                    className={`filter-btn ${irFilterMode === 'night-green' ? 'active' : ''}`}
                    onClick={() => setIrFilterMode('night-green')}
                  >
                    NVG Green
                  </button>
                  <button
                    className={`filter-btn ${irFilterMode === 'optical' ? 'active' : ''}`}
                    onClick={() => setIrFilterMode('optical')}
                  >
                    Optical EO
                  </button>
                </div>

                <div className="upload-cta-group">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="drone-file-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? `UPLOADING (${uploadProgress}%)` : '📤 UPLOAD VIDEO FILE'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Machine Learning & Kinematic Analytics View */
            <div className="ml-analytics-tab-content">
              <div className="ml-summary-cards">
                <div className="ml-card">
                  <h4>KALMAN 2D STATE ESTIMATOR</h4>
                  <div className="ml-metric-row">
                    <span>Algorithm:</span>
                    <strong>Continuous-Discrete Kalman Filter</strong>
                  </div>
                  <div className="ml-metric-row">
                    <span>State Vector:</span>
                    <code>[x, y, v_x, v_y]</code>
                  </div>
                  <div className="ml-metric-row">
                    <span>Forward Prediction Horizon:</span>
                    <strong>45 seconds (3 waypoints)</strong>
                  </div>
                  <div className="ml-metric-row">
                    <span>Tracking Smoothness:</span>
                    <strong className="green-txt">98.2% covariance convergence</strong>
                  </div>
                </div>

                <div className="ml-card">
                  <h4>DBSCAN CONVOY CLUSTERING</h4>
                  <div className="ml-metric-row">
                    <span>Clustering Method:</span>
                    <strong>Density-Based Spatial Scan</strong>
                  </div>
                  <div className="ml-metric-row">
                    <span>Distance Metric (&epsilon;):</span>
                    <strong>0.05&deg; (~5.2 km radius)</strong>
                  </div>
                  <div className="ml-metric-row">
                    <span>Identified Convoy Groups:</span>
                    <strong className="blue-txt">{mlData?.convoyMetrics ? Object.keys(mlData.convoyMetrics).length : 1} active formation</strong>
                  </div>
                  <div className="ml-metric-row">
                    <span>Tactical Formation:</span>
                    <strong>Mechanized Column with unified heading</strong>
                  </div>
                </div>

                <div className="ml-card">
                  <h4>BAYESIAN THREAT ENGINE</h4>
                  <div className="ml-metric-row">
                    <span>Prior Probability Model:</span>
                    <strong>Asset Lethality Matrix</strong>
                  </div>
                  <div className="ml-metric-row">
                    <span>Dynamic Evidence Factors:</span>
                    <strong>Closing Vector, Velocity, Convoy Size</strong>
                  </div>
                  <div className="ml-metric-row">
                    <span>High-Priority Escalation:</span>
                    <strong className="red-txt">P(Aggressive | Data) &gt; 0.75</strong>
                  </div>
                </div>
              </div>

              {/* Analyzed Target Breakdown Table */}
              <div className="ml-target-table-wrapper">
                <h4>TRACKED TARGET KINEMATICS & ML CLASSIFICATION</h4>
                <table className="ml-table">
                  <thead>
                    <tr>
                      <th>Target ID</th>
                      <th>Class & Lethality</th>
                      <th>Speed & Bearing</th>
                      <th>Convoy Role</th>
                      <th>Bayesian Threat Score</th>
                      <th>Kalman Forecast (+30s)</th>
                      <th>Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mlData?.analyzedTargets?.map(target => (
                      <tr key={target.id} className={target.threat === 'HIGH' ? 'row-high-threat' : ''}>
                        <td><strong>{target.id}</strong></td>
                        <td>{target.class}</td>
                        <td>{target.speed} km/h @ {target.heading}&deg;</td>
                        <td>
                          {target.convoyId >= 0 ? (
                            <span className="convoy-tag">Convoy #{target.convoyId + 1}</span>
                          ) : (
                            <span className="outlier-tag">Isolated Unit</span>
                          )}
                        </td>
                        <td>
                          <span className={`threat-badge ${target.threatAnalysis?.level?.toLowerCase()}`}>
                            {target.threatAnalysis?.score} ({target.threatAnalysis?.level})
                          </span>
                        </td>
                        <td className="mono-txt">
                          {target.kalmanForecast?.[1] ? `${target.kalmanForecast[1][0].toFixed(3)}N, ${target.kalmanForecast[1][1].toFixed(3)}E` : 'Projecting...'}
                        </td>
                        <td className="action-txt">{target.threatAnalysis?.recommendedAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
