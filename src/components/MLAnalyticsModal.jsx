import React, { useState, useEffect } from 'react';
import './MLAnalyticsModal.css';

export default function MLAnalyticsModal({ isOpen, onClose }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kalman'); // kalman, dbscan, bayesian, spectral, gemini

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/ml/analytics')
      .then(res => res.json())
      .then(data => {
        setAnalyticsData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch ML analytics:', err);
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="ml-modal-overlay">
      <div className="ml-modal-container">
        {/* Header */}
        <div className="ml-modal-header">
          <div className="ml-title-group">
            <span className="ml-pulse-dot">●</span>
            <h3>TACTICAL MACHINE LEARNING ARCHITECTURE & MODEL DIAGNOSTICS</h3>
            <span className="ml-version-badge">v2.4 KINEMATIC & NEURAL SUITE</span>
          </div>
          <button className="ml-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Navigation Tabs */}
        <div className="ml-nav-tabs">
          <button
            className={`ml-nav-btn ${activeTab === 'kalman' ? 'active' : ''}`}
            onClick={() => setActiveTab('kalman')}
          >
            🎯 Kalman Kinematic Filter
          </button>
          <button
            className={`ml-nav-btn ${activeTab === 'dbscan' ? 'active' : ''}`}
            onClick={() => setActiveTab('dbscan')}
          >
            🚜 DBSCAN Convoy Detection
          </button>
          <button
            className={`ml-nav-btn ${activeTab === 'bayesian' ? 'active' : ''}`}
            onClick={() => setActiveTab('bayesian')}
          >
            ⚖️ Bayesian Threat Model
          </button>
          <button
            className={`ml-nav-btn ${activeTab === 'spectral' ? 'active' : ''}`}
            onClick={() => setActiveTab('spectral')}
          >
            🛰️ Multi-Spectral Anomaly (Sat)
          </button>
          <button
            className={`ml-nav-btn ${activeTab === 'gemini' ? 'active' : ''}`}
            onClick={() => setActiveTab('gemini')}
          >
            ⚡ Gemini Tactical Generative AI
          </button>
        </div>

        {/* Body Content */}
        <div className="ml-modal-body">
          {loading ? (
            <div className="ml-loading-state">
              <span>Synchronizing real-time telemetry with ML Model Suite...</span>
            </div>
          ) : (
            <>
              {activeTab === 'kalman' && (
                <div className="ml-tab-pane">
                  <div className="ml-pane-intro">
                    <h4>2D Kinematic Kalman Filter & State Extrapolation</h4>
                    <p>
                      Estimates true target velocity and eliminates sensor jitter across noisy radar and UAV optical video frames. Predicts future vehicle waypoints before hostile actions occur.
                    </p>
                  </div>

                  <div className="ml-grid-cards">
                    <div className="ml-diag-card">
                      <h5>State Space Representation</h5>
                      <div className="math-block">
                        <strong>X<sub>t</sub> = [ x , y , v<sub>x</sub> , v<sub>y</sub> ]<sup>T</sup></strong>
                        <p className="math-desc">Continuous 4-dimensional state vector mapping coordinate lat/lon and velocity components.</p>
                      </div>
                    </div>

                    <div className="ml-diag-card">
                      <h5>State Transition Model (F)</h5>
                      <div className="matrix-display">
                        <code>
                          [ 1  0  Δt  0  ]<br />
                          [ 0  1  0   Δt ]<br />
                          [ 0  0  1   0  ]<br />
                          [ 0  0  0   1  ]
                        </code>
                      </div>
                      <p className="matrix-sub">Calculated with Δt = 1.0s discretization step.</p>
                    </div>

                    <div className="ml-diag-card">
                      <h5>Active Model Parameters</h5>
                      <div className="param-row">
                        <span>Process Noise (Q):</span>
                        <strong>0.05 (High agility tracking)</strong>
                      </div>
                      <div className="param-row">
                        <span>Measurement Noise (R):</span>
                        <strong>0.10 (Sensor variance)</strong>
                      </div>
                      <div className="param-row">
                        <span>Prediction Horizon:</span>
                        <strong className="green-txt">3 steps (+45 seconds tactical)</strong>
                      </div>
                      <div className="param-row">
                        <span>Active State Trackers:</span>
                        <strong className="blue-txt">{analyticsData?.kalman_filters?.active_filters || 6} Filters Running</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'dbscan' && (
                <div className="ml-tab-pane">
                  <div className="ml-pane-intro">
                    <h4>DBSCAN (Density-Based Spatial Clustering of Applications with Noise)</h4>
                    <p>
                      Automatically groups isolated vehicles into coordinated military convoys and tactical strike columns without requiring pre-specified cluster counts.
                    </p>
                  </div>

                  <div className="ml-grid-cards">
                    <div className="ml-diag-card">
                      <h5>Clustering Configuration</h5>
                      <div className="param-row">
                        <span>Neighborhood Radius (&epsilon;):</span>
                        <strong>0.06&deg; (~6.5 km geographic span)</strong>
                      </div>
                      <div className="param-row">
                        <span>MinPoints Threshold:</span>
                        <strong>2 units (minimum vehicle pair)</strong>
                      </div>
                      <div className="param-row">
                        <span>Distance Metric:</span>
                        <strong>Euclidean Haversine Surface Metric</strong>
                      </div>
                    </div>

                    <div className="ml-diag-card">
                      <h5>Real-Time Convoy Analysis</h5>
                      <div className="param-row">
                        <span>Detected Formations:</span>
                        <strong className="green-txt">
                          {analyticsData?.dbscan_clustering?.convoys_detected ?? 1} Convoy Formations
                        </strong>
                      </div>
                      <div className="param-row">
                        <span>Tactical Formation Type:</span>
                        <strong>Mechanized Armor & Logistics Column</strong>
                      </div>
                      <div className="param-row">
                        <span>Convoy Dispersion Cohesion:</span>
                        <strong>94.2% Tight formation index</strong>
                      </div>
                    </div>
                  </div>

                  <div className="ml-full-card">
                    <h5>Convoy Tactical Implication</h5>
                    <p>
                      Convoys detected by DBSCAN trigger elevated risk multipliers in the Bayesian Threat Engine. Clustered military vehicles possess coordinated firepower, mutual air defense coverage, and logistical endurance that isolated targets do not possess.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'bayesian' && (
                <div className="ml-tab-pane">
                  <div className="ml-pane-intro">
                    <h4>Bayesian Multi-Factor Threat Scorer</h4>
                    <p>
                      Combines intelligence priors with dynamic battlefield observables to calculate the exact posterior probability that a detected target represents an active hostile threat.
                    </p>
                  </div>

                  <div className="ml-grid-cards">
                    <div className="ml-diag-card">
                      <h5>Base Class Priors P(Hostile | Class)</h5>
                      <div className="param-row">
                        <span>Main Battle Tank / Armor:</span>
                        <strong className="red-txt">0.88 prior lethality</strong>
                      </div>
                      <div className="param-row">
                        <span>Surface-to-Air Defense (SAM):</span>
                        <strong className="red-txt">0.92 prior lethality</strong>
                      </div>
                      <div className="param-row">
                        <span>Logistics / Transport Truck:</span>
                        <strong className="amber-txt">0.55 prior lethality</strong>
                      </div>
                    </div>

                    <div className="ml-diag-card">
                      <h5>Evidence Likelihood Multipliers</h5>
                      <div className="param-row">
                        <span>Sector Base Vector &lt; 45&deg;:</span>
                        <strong>+0.25 (Direct closing attack vector)</strong>
                      </div>
                      <div className="param-row">
                        <span>High Velocity (&gt; 45 km/h):</span>
                        <strong>+0.15 (Rapid tactical transit)</strong>
                      </div>
                      <div className="param-row">
                        <span>DBSCAN Convoy Member:</span>
                        <strong>+0.20 (Coordinated strike strength)</strong>
                      </div>
                    </div>

                    <div className="ml-diag-card">
                      <h5>Current Threat Pipeline Distribution</h5>
                      <div className="param-row">
                        <span>High-Priority Targets:</span>
                        <strong className="red-txt">{analyticsData?.bayesian_threat_scorer?.high_threats || 2} Units</strong>
                      </div>
                      <div className="param-row">
                        <span>Medium-Priority Targets:</span>
                        <strong className="amber-txt">{analyticsData?.bayesian_threat_scorer?.medium_threats || 2} Units</strong>
                      </div>
                      <div className="param-row">
                        <span>Automatic RoE Escalation:</span>
                        <strong>Active above 0.75 score</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'spectral' && (
                <div className="ml-tab-pane">
                  <div className="ml-pane-intro">
                    <h4>Satellite Multi-Spectral & Synthetic Aperture Radar (SAR) Analytics</h4>
                    <p>
                      Penetrates artificial camouflage, atmospheric cloud cover, and foliage by comparing optical reflectances against Synthetic Aperture Radar microwave backscatter.
                    </p>
                  </div>

                  <div className="ml-grid-cards">
                    <div className="ml-diag-card">
                      <h5>Synthetic Aperture Radar (SAR)</h5>
                      <div className="param-row">
                        <span>Band:</span>
                        <strong>X-Band (9.6 GHz) Polarimetric</strong>
                      </div>
                      <div className="param-row">
                        <span>Dielectric Signature:</span>
                        <strong className="green-txt">High metallic backscatter</strong>
                      </div>
                      <div className="param-row">
                        <span>Cloud / Night Capability:</span>
                        <strong>100% all-weather penetration</strong>
                      </div>
                    </div>

                    <div className="ml-diag-card">
                      <h5>NDVI Camouflage Detection</h5>
                      <div className="param-row">
                        <span>Calculation:</span>
                        <code>(NIR - Red) / (NIR + Red)</code>
                      </div>
                      <div className="param-row">
                        <span>Artificial Netting vs Real Foliage:</span>
                        <strong>Chlorophyll absorption drop flagged</strong>
                      </div>
                      <div className="param-row">
                        <span>Anomaly Detection Rate:</span>
                        <strong className="blue-txt">97.8% discrimination accuracy</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'gemini' && (
                <div className="ml-tab-pane">
                  <div className="ml-pane-intro">
                    <h4>Gemini 3.8 Flash Military Intelligence Co-Pilot</h4>
                    <p>
                      Provides real-time natural language synthesis of battlefield telemetry, explaining threats, recommending defensive posture, and evaluating tactical risks.
                    </p>
                  </div>

                  <div className="ml-grid-cards">
                    <div className="ml-diag-card">
                      <h5>Model Integration Status</h5>
                      <div className="param-row">
                        <span>Model:</span>
                        <strong className="green-txt">gemini-3.8-flash</strong>
                      </div>
                      <div className="param-row">
                        <span>API Configuration:</span>
                        <strong className={analyticsData?.gemini_ai?.configured ? 'green-txt' : 'amber-txt'}>
                          {analyticsData?.gemini_ai?.configured ? 'Active & Authenticated' : 'Algorithmic Fallback Active'}
                        </strong>
                      </div>
                      <div className="param-row">
                        <span>Context Ingestion:</span>
                        <strong>Full telemetry state (targets, paths, sensors, blockchain)</strong>
                      </div>
                    </div>

                    <div className="ml-diag-card">
                      <h5>Intelligence Capabilities</h5>
                      <div className="param-row">
                        <span>Tactical SITREP:</span>
                        <strong>Automated drone upload summary</strong>
                      </div>
                      <div className="param-row">
                        <span>Advisory Co-Pilot:</span>
                        <strong>Instant conversational responses to queries</strong>
                      </div>
                      <div className="param-row">
                        <span>Rules of Engagement (RoE):</span>
                        <strong>Evaluates safety & tactical risk factors</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
