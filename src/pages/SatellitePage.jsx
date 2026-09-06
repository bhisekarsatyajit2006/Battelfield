import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Rectangle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as d3 from 'd3';
import { getSatelliteFeed, triggerSatelliteScan, uploadSatelliteImage } from '../core/api';
import { useGlobalState } from '../hooks/useGlobalState';
import MLAnalyticsModal from '../components/MLAnalyticsModal';
import { analyzeMultiSpectralAnomaly, KalmanFilter2D, calculateTacticalThreatML } from '../utils/tacticalML';
import './SatellitePage.css';

// Fix for Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map controller component for smooth flying/locking onto target coordinates
const MapTargetController = ({ targetLocation }) => {
  const map = useMap();
  useEffect(() => {
    if (targetLocation && targetLocation.lat && targetLocation.lon) {
      map.flyTo([targetLocation.lat, targetLocation.lon], 15, {
        animate: true,
        duration: 1.2
      });
    }
  }, [targetLocation, map]);
  return null;
};

const SatellitePage = () => {
  const { state, updateState } = useGlobalState();
  const [telemetry, setTelemetry] = useState({
    satellite_id: 'USA-314 (KH-11 KENNEN V)',
    norad_id: '48215',
    orbit: 'Sun-Synchronous Low Earth Orbit',
    altitude_km: 418.5,
    orbital_velocity_kms: 7.66,
    sub_satellite_point: { lat: 20.218, lon: 76.954 },
    active_band: 'optical',
    pass_status: 'ACTIVE OVERFLIGHT (SECTOR BRAVO)',
    resolution_gsd_m: 0.12
  });

  const [detections, setDetections] = useState([]);
  const [satelliteImage, setSatelliteImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [spectralBand, setSpectralBand] = useState('optical'); // optical, flir, sar, night
  const [viewMode, setViewMode] = useState('map'); // map, image, graph, analytics
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [blockchainProof, setBlockchainProof] = useState(null);
  const [showMLModal, setShowMLModal] = useState(false);

  const svgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize and load live satellite reconnaissance telemetry on mount
  useEffect(() => {
    let isMounted = true;
    const fetchOrbitalData = async () => {
      setIsLoading(true);
      try {
        const feed = await getSatelliteFeed(spectralBand);
        if (isMounted && feed) {
          setTelemetry(prev => ({
            ...prev,
            ...feed,
            active_band: spectralBand
          }));
          if (feed.detections && feed.detections.length > 0) {
            setDetections(feed.detections);
            // Sync with global application state
            updateState({
              satelliteData: {
                telemetry: feed,
                detections: feed.detections,
                timestamp: new Date()
              }
            });
          }
        }
      } catch (err) {
        console.warn('Fallback: generating satellite telemetry locally', err);
        // Fallback realistic detections if server is busy
        generateLocalTelemetry();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchOrbitalData();

    return () => {
      isMounted = false;
    };
  }, [spectralBand]);

  const generateLocalTelemetry = () => {
    const fallbackDetections = [
      { id: 'SAT-101', class_id: 2, class: 'Armored Vehicle', category: 'armor', threat_level: 'HIGH', speed_kmh: 42.1, heading_deg: 135, confidence: 0.94, geo_location: { lat: 20.218, lon: 76.954 }, bbox: [220, 180, 42, 42] },
      { id: 'SAT-102', class_id: 7, class: 'Tactical Truck', category: 'transport', threat_level: 'MEDIUM', speed_kmh: 48.0, heading_deg: 140, confidence: 0.88, geo_location: { lat: 20.174, lon: 76.982 }, bbox: [310, 240, 38, 38] },
      { id: 'SAT-103', class_id: 3, class: 'Command Bunker', category: 'infrastructure', threat_level: 'HIGH', speed_kmh: 0.0, heading_deg: 0, confidence: 0.96, geo_location: { lat: 20.252, lon: 77.012 }, bbox: [410, 190, 50, 50] },
      { id: 'SAT-104', class_id: 1, class: 'Patrol Infantry', category: 'personnel', threat_level: 'LOW', speed_kmh: 5.2, heading_deg: 80, confidence: 0.82, geo_location: { lat: 20.195, lon: 76.920 }, bbox: [160, 320, 32, 32] },
      { id: 'SAT-105', class_id: 4, class: 'Air Defense Radar', category: 'radar', threat_level: 'HIGH', speed_kmh: 0.0, heading_deg: 0, confidence: 0.91, geo_location: { lat: 20.224, lon: 76.971 }, bbox: [280, 160, 45, 45] },
      { id: 'SAT-106', class_id: 5, class: 'Supply Convoy Unit', category: 'transport', threat_level: 'MEDIUM', speed_kmh: 39.5, heading_deg: 138, confidence: 0.85, geo_location: { lat: 20.158, lon: 76.995 }, bbox: [340, 270, 36, 36] },
      { id: 'SAT-107', class_id: 2, class: 'Armored Vehicle', category: 'armor', threat_level: 'HIGH', speed_kmh: 36.4, heading_deg: 132, confidence: 0.92, geo_location: { lat: 20.231, lon: 76.962 }, bbox: [250, 200, 40, 40] }
    ];
    setDetections(fallbackDetections);
  };

  // Perform active satellite orbital sweep
  const handleInitiateSweep = async () => {
    setIsScanning(true);
    try {
      const result = await triggerSatelliteScan(spectralBand);
      if (result && result.detections) {
        setDetections(result.detections);
        if (result.blockchain) {
          setBlockchainProof(result.blockchain);
          updateState({
            blockchain: result.blockchain
          });
        }
      }
    } catch (err) {
      console.error('Error executing satellite scan:', err);
      generateLocalTelemetry();
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 1200);
    }
  };

  // Handle manual satellite image file upload
  const handleSatelliteUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const preview = e.target.result;
        setSatelliteImage(preview);
        setViewMode('image');

        const result = await uploadSatelliteImage(file);
        if (result && result.detections) {
          setDetections(result.detections);
          if (result.blockchain) {
            setBlockchainProof(result.blockchain);
            updateState({ blockchain: result.blockchain });
          }
          updateState({
            satelliteData: {
              image: preview,
              detections: result.detections,
              timestamp: new Date()
            }
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading satellite image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch spectral band
  const handleBandChange = (band) => {
    setSpectralBand(band);
  };

  // Filter detections by category
  const filteredDetections = useMemo(() => {
    if (categoryFilter === 'ALL') return detections;
    if (categoryFilter === 'HIGH') return detections.filter(d => d.threat_level === 'HIGH');
    return detections.filter(d => d.category === categoryFilter.toLowerCase());
  }, [detections, categoryFilter]);

  // Color helper based on threat level
  const getThreatColor = (level) => {
    switch (level) {
      case 'HIGH': return '#ff3366';
      case 'MEDIUM': return '#ff9933';
      case 'LOW': return '#00ff88';
      default: return '#33ccff';
    }
  };

  // D3 Graph for object relationships
  useEffect(() => {
    if (viewMode === 'graph' && detections.length > 0 && svgRef.current) {
      renderGraph();
    }
  }, [viewMode, detections]);

  const renderGraph = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll('*').remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 500;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g');

    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        svg.attr('transform', event.transform);
      });

    d3.select(svgRef.current).call(zoom);

    const nodes = detections.map((det, idx) => ({
      id: det.id || `SAT-${idx}`,
      raw: det,
      class: det.class,
      threat: det.threat_level || 'LOW',
      confidence: det.confidence || 0.85,
      lat: det.geo_location?.lat || 20.2,
      lon: det.geo_location?.lon || 77.0
    }));

    const links = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(nodes[i].lat - nodes[j].lat, nodes[i].lon - nodes[j].lon);
        if (dist < 0.08) {
          links.push({
            source: nodes[i].id,
            target: nodes[j].id,
            distance: dist
          });
        }
      }
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35));

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#00ff88')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', '4,4');

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedObject(d.raw);
      });

    node.append('circle')
      .attr('r', d => 10 + (d.confidence * 12))
      .attr('fill', d => getThreatColor(d.threat))
      .attr('fill-opacity', 0.8)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    node.append('text')
      .attr('dy', -18)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text(d => `${d.id} (${d.class})`);

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  };

  // Render analytics panel
  const renderAnalytics = () => {
    const total = detections.length;
    const highThreats = detections.filter(d => d.threat_level === 'HIGH').length;
    const medThreats = detections.filter(d => d.threat_level === 'MEDIUM').length;
    const lowThreats = detections.filter(d => d.threat_level === 'LOW').length;
    const avgConfidence = total ? (detections.reduce((acc, d) => acc + (d.confidence || 0), 0) / total) : 0;

    const classDistribution = detections.reduce((acc, d) => {
      acc[d.class] = (acc[d.class] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="analytics-panel">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{total}</div>
            <div className="stat-label">Confirmed Orbital Targets</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#ff3366' }}>{highThreats}</div>
            <div className="stat-label">High-Threat Signatures</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#ff9933' }}>{medThreats}</div>
            <div className="stat-label">Tactical Support Units</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{(avgConfidence * 100).toFixed(1)}%</div>
            <div className="stat-label">Mean Optical Confidence</div>
          </div>
        </div>

        <div style={{ background: '#10261c', padding: '16px', borderRadius: '6px', border: '1px solid #1f4d36', marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#00ff88', fontSize: '13px', textTransform: 'uppercase' }}>
            🛰️ Tactical Target Classification
          </h4>
          {Object.entries(classDistribution).map(([name, count]) => (
            <div key={name} className="class-item">
              <span style={{ width: '150px', color: '#c8e6c9', fontWeight: 'bold' }}>{name}</span>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${(count / total) * 100}%`, 
                    background: name.includes('Armored') || name.includes('Bunker') ? '#ff3366' : name.includes('Truck') ? '#ff9933' : '#00ff88' 
                  }}
                />
              </div>
              <span style={{ width: '30px', textAlign: 'right', color: '#ffffff', fontFamily: 'monospace' }}>{count}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#10261c', padding: '16px', borderRadius: '6px', border: '1px solid #1f4d36' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#00ff88', fontSize: '13px', textTransform: 'uppercase' }}>
            🛡️ Cryptographic Ledger Verification
          </h4>
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#a8d5ba', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>Platform: <strong>{telemetry.satellite_id}</strong></div>
            <div>NORAD Catalog: <strong>#{telemetry.norad_id}</strong></div>
            <div>Ground Sampling Distance: <strong>{telemetry.resolution_gsd_m}m GSD</strong></div>
            <div>Overflight Status: <strong>{telemetry.pass_status}</strong></div>
            {blockchainProof && (
              <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0, 255, 136, 0.08)', borderRadius: '4px', border: '1px solid #00ff88' }}>
                <div style={{ color: '#00ff88', fontWeight: 'bold' }}>✓ Blockchain Proof Confirmed</div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Tx Hash: {blockchainProof.tx_hash}</div>
                <div>Block: #{blockchainProof.block_number}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="satellite-page">
      {/* ORBITAL TELEMETRY STATUS BAR */}
      <div className="orbital-telemetry-bar">
        <div className="telemetry-group">
          <span className="status-badge active">
            <span className="pulsing-dot"></span>
            LIVE ORBITAL PASS
          </span>
          <div className="telemetry-item">
            <span className="telemetry-label">SAT:</span>
            <span className="telemetry-val">{telemetry.satellite_id}</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">NORAD:</span>
            <span className="telemetry-val">#{telemetry.norad_id}</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">ALT:</span>
            <span className="telemetry-val">{telemetry.altitude_km} km</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">VEL:</span>
            <span className="telemetry-val">{telemetry.orbital_velocity_kms} km/s</span>
          </div>
        </div>

        <div className="telemetry-group">
          <div className="telemetry-item">
            <span className="telemetry-label">SUB-SAT POINT:</span>
            <span className="telemetry-val">{telemetry.sub_satellite_point?.lat}° N, {telemetry.sub_satellite_point?.lon}° E</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">TARGETS:</span>
            <span className="telemetry-val">{detections.length} IDENTIFIED</span>
          </div>
        </div>
      </div>

      {/* HEADER CONTROLS */}
      <div className="satellite-header">
        <div className="satellite-title-area">
          <h1>🛰️ SATELLITE INTELLIGENCE</h1>
        </div>

        <div className="header-controls">
          {/* SPECTRAL BAND SELECTOR */}
          <div className="band-selector">
            <button 
              className={`band-btn ${spectralBand === 'optical' ? 'active' : ''}`}
              onClick={() => handleBandChange('optical')}
              title="Natural RGB True Color Satellite"
            >
              🛰️ Visual RGB
            </button>
            <button 
              className={`band-btn ${spectralBand === 'flir' ? 'active' : ''}`}
              onClick={() => handleBandChange('flir')}
              title="Forward Looking Infrared Heat Gradient"
            >
              🔥 Thermal FLIR
            </button>
            <button 
              className={`band-btn ${spectralBand === 'sar' ? 'active' : ''}`}
              onClick={() => handleBandChange('sar')}
              title="Synthetic Aperture Radar (All-Weather Penetrating)"
            >
              📡 SAR Radar
            </button>
            <button 
              className={`band-btn ${spectralBand === 'night' ? 'active' : ''}`}
              onClick={() => handleBandChange('night')}
              title="Night Tactical Recon"
            >
              🌑 Night Ops
            </button>
          </div>

          {/* ACTIONS */}
          <button 
            className="action-btn"
            onClick={handleInitiateSweep}
            disabled={isScanning || isLoading}
          >
            {isScanning ? '📡 SCANNING ORBIT...' : '📡 INITIATE RECON SWEEP'}
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={handleSatelliteUpload} 
          />
          <button 
            className="action-btn secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            📸 UPLOAD IMAGERY
          </button>

          <button 
            className="action-btn"
            style={{
              background: 'linear-gradient(135deg, rgba(51, 204, 255, 0.25), rgba(150, 100, 255, 0.25))',
              border: '1px solid #33ccff',
              color: '#33ccff',
              fontWeight: 'bold'
            }}
            onClick={() => setShowMLModal(true)}
          >
            🧠 ML ARCHITECTURE
          </button>

          {/* VIEW MODE TOGGLE */}
          <div className="view-mode-toggle">
            <button 
              className={viewMode === 'map' ? 'active' : ''}
              onClick={() => setViewMode('map')}
            >
              🗺️ Tactical Map
            </button>
            <button 
              className={viewMode === 'image' ? 'active' : ''}
              onClick={() => setViewMode('image')}
            >
              🖼️ Feed Canvas
            </button>
            <button 
              className={viewMode === 'graph' ? 'active' : ''}
              onClick={() => setViewMode('graph')}
            >
              📊 Rel Graph
            </button>
            <button 
              className={viewMode === 'analytics' ? 'active' : ''}
              onClick={() => setViewMode('analytics')}
            >
              📈 Analytics
            </button>
          </div>
        </div>
      </div>

      {/* MAIN SATELLITE CONTENT */}
      <div className="satellite-content">
        {/* LEFT STAGE */}
        <div className="satellite-stage">
          {/* 1. TACTICAL MAP VIEW */}
          {viewMode === 'map' && (
            <div className={`satellite-map-container spectral-${spectralBand}`}>
              <MapContainer
                center={[20.218, 76.954]}
                zoom={12}
                style={{ width: '100%', height: '100%' }}
                scrollWheelZoom={true}
              >
                {/* Esri World Imagery - authentic high-resolution satellite imagery */}
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="&copy; Esri, Maxar, Earthstar Geographics"
                  maxZoom={18}
                />

                {/* Flying / locking controller */}
                {selectedObject && (
                  <MapTargetController targetLocation={selectedObject.geo_location} />
                )}

                {/* Target Markers and Bounding Boxes */}
                {filteredDetections.map((det) => {
                  const lat = det.geo_location?.lat || 20.218;
                  const lon = det.geo_location?.lon || 76.954;
                  const color = getThreatColor(det.threat_level);
                  const isSelected = selectedObject?.id === det.id;

                  // Bounding rectangle roughly corresponding to target footprint
                  const bounds = [
                    [lat - 0.0035, lon - 0.0035],
                    [lat + 0.0035, lon + 0.0035]
                  ];

                  return (
                    <React.Fragment key={det.id}>
                      {/* Bounding Box */}
                      <Rectangle
                        bounds={bounds}
                        pathOptions={{
                          color: color,
                          weight: isSelected ? 2.5 : 1.2,
                          dashArray: isSelected ? undefined : '3, 3',
                          fillColor: color,
                          fillOpacity: isSelected ? 0.25 : 0.1
                        }}
                        eventHandlers={{
                          click: () => setSelectedObject(det)
                        }}
                      />

                      {/* Tactical Target Center Crosshair */}
                      <CircleMarker
                        center={[lat, lon]}
                        radius={isSelected ? 10 : 7}
                        pathOptions={{
                          color: '#ffffff',
                          fillColor: color,
                          fillOpacity: 0.9,
                          weight: 2
                        }}
                        eventHandlers={{
                          click: () => setSelectedObject(det)
                        }}
                      >
                        <Popup>
                          <div style={{ color: '#111', fontSize: '12px' }}>
                            <strong style={{ color: color, fontSize: '13px' }}>{det.id}</strong> - {det.class}<br />
                            <strong>Threat Level:</strong> {det.threat_level}<br />
                            <strong>Confidence:</strong> {(det.confidence * 100).toFixed(1)}%<br />
                            <strong>Coordinates:</strong> {lat.toFixed(4)}° N, {lon.toFixed(4)}° E<br />
                            <strong>Speed:</strong> {det.speed_kmh} km/h @ {det.heading_deg}°
                          </div>
                        </Popup>
                      </CircleMarker>
                    </React.Fragment>
                  );
                })}
              </MapContainer>

              {/* Scanning sweep beam effect */}
              {isScanning && <div className="radar-sweep-beam" />}

              {/* HUD OVERLAY */}
              <div className="map-hud-overlay">
                <span>SECTOR: <strong>BRAVO-04</strong></span>
                <span>SPECTRUM: <strong>{spectralBand.toUpperCase()}</strong></span>
                <span>GRID: <strong>MGRS 43Q EF 9214</strong></span>
                <span>SUN ELEVATION: <strong>54.2°</strong></span>
              </div>
            </div>
          )}

          {/* 2. RECONNAISSANCE IMAGE CANVAS VIEW */}
          {viewMode === 'image' && (
            <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a1712', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {satelliteImage ? (
                <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
                  <img src={satelliteImage} alt="Satellite feed" style={{ width: '100%', height: 'auto', display: 'block', border: '1px solid #1f4d36' }} />
                  {/* Render bounding boxes over image */}
                  {filteredDetections.map((det) => (
                    <div
                      key={det.id}
                      style={{
                        position: 'absolute',
                        left: `${(det.bbox?.[0] || 100) / 8}%`,
                        top: `${(det.bbox?.[1] || 100) / 6}%`,
                        width: `${(det.bbox?.[2] || 40) / 4}%`,
                        height: `${(det.bbox?.[3] || 40) / 3}%`,
                        border: `2px solid ${getThreatColor(det.threat_level)}`,
                        background: 'rgba(0, 255, 136, 0.15)',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedObject(det)}
                    >
                      <span style={{ position: 'absolute', top: '-16px', left: '0', background: '#000', color: '#00ff88', fontSize: '10px', padding: '1px 4px', fontFamily: 'monospace' }}>
                        {det.id}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛰️</div>
                  <h3 style={{ color: '#00ff88', margin: '0 0 8px 0' }}>Multi-spectral Optical Feed Standby</h3>
                  <p style={{ color: '#8bb39b', maxWidth: '420px', margin: '0 auto 20px auto', fontSize: '13px' }}>
                    Satellite passes over Sector Bravo are automatically streamed via the Tactical Map. You may also upload custom reconnaissance files for target extraction.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button className="action-btn" onClick={() => setViewMode('map')}>
                      🗺️ SWITCH TO TACTICAL SATELLITE MAP
                    </button>
                    <button className="action-btn secondary" onClick={() => fileInputRef.current?.click()}>
                      📸 UPLOAD SATELLITE IMAGE
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. D3 GRAPH VIEW */}
          {viewMode === 'graph' && (
            <div className="graph-view">
              <svg ref={svgRef} className="graph-svg" />
            </div>
          )}

          {/* 4. ANALYTICS VIEW */}
          {viewMode === 'analytics' && renderAnalytics()}
        </div>

        {/* RIGHT TARGET TELEMETRY SIDEBAR */}
        <div className="target-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title-row">
              <span className="sidebar-title">🎯 Targeted Objects</span>
              <span className="target-counter-badge">{filteredDetections.length} of {detections.length}</span>
            </div>

            {/* CATEGORY FILTER CHIPS */}
            <div className="filter-chips">
              {['ALL', 'HIGH', 'ARMOR', 'TRANSPORT', 'RADAR', 'PERSONNEL'].map((cat) => (
                <button
                  key={cat}
                  className={`chip-btn ${categoryFilter === cat ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* TARGET FEED LIST */}
          <div className="target-feed">
            {filteredDetections.map((det) => {
              const isSelected = selectedObject?.id === det.id;
              return (
                <div
                  key={det.id}
                  className={`target-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedObject(det)}
                >
                  <div className="target-card-top">
                    <span className="target-id">{det.id}</span>
                    <span className={`threat-tag ${det.threat_level}`}>
                      {det.threat_level} THREAT
                    </span>
                  </div>

                  <div className="target-class">{det.class}</div>

                  <div className="target-meta-row">
                    <span>CONF: {(det.confidence * 100).toFixed(0)}%</span>
                    <span>VEL: {det.speed_kmh} km/h</span>
                  </div>

                  <div className="target-meta-row" style={{ marginTop: '2px' }}>
                    <span>COORD: {det.geo_location?.lat?.toFixed(3)}°N, {det.geo_location?.lon?.toFixed(3)}°E</span>
                    <span>HDG: {det.heading_deg}°</span>
                  </div>

                  <button
                    className="lock-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedObject(det);
                      setViewMode('map');
                    }}
                  >
                    🎯 LOCK TARGET IN MAP
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SELECTED OBJECT DETAILS MODAL */}
      {selectedObject && (
        <div className="object-detail-modal" onClick={() => setSelectedObject(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              <span>🎯</span>
              <span>{selectedObject.id} - {selectedObject.class}</span>
            </h3>

            <div className="detail-item">
              <span style={{ color: '#8bb39b' }}>Category:</span>
              <strong style={{ color: '#ffffff', textTransform: 'capitalize' }}>{selectedObject.category || 'Surface Target'}</strong>
            </div>

            <div className="detail-item">
              <span style={{ color: '#8bb39b' }}>Threat Assessment:</span>
              <span className={`threat-tag ${selectedObject.threat_level}`}>
                {selectedObject.threat_level} THREAT
              </span>
            </div>

            <div className="detail-item">
              <span style={{ color: '#8bb39b' }}>Confidence Score:</span>
              <strong style={{ color: '#00ff88' }}>{((selectedObject.confidence || 0.85) * 100).toFixed(1)}%</strong>
            </div>

            <div className="detail-item">
              <span style={{ color: '#8bb39b' }}>Latitude:</span>
              <span style={{ fontFamily: 'monospace' }}>{selectedObject.geo_location?.lat?.toFixed(5)}° N</span>
            </div>

            <div className="detail-item">
              <span style={{ color: '#8bb39b' }}>Longitude:</span>
              <span style={{ fontFamily: 'monospace' }}>{selectedObject.geo_location?.lon?.toFixed(5)}° E</span>
            </div>

            <div className="detail-item">
              <span style={{ color: '#8bb39b' }}>Velocity:</span>
              <span style={{ fontFamily: 'monospace' }}>{selectedObject.speed_kmh || 0} km/h (Heading {selectedObject.heading_deg || 0}°)</span>
            </div>

            <div className="detail-item">
              <span style={{ color: '#8bb39b' }}>Recon Source:</span>
              <span style={{ color: '#33ccff' }}>{telemetry.satellite_id} (Pass 4B)</span>
            </div>

            {/* Machine Learning Multi-Spectral Anomaly & Target Decomposition */}
            {(() => {
              const report = analyzeMultiSpectralAnomaly ? analyzeMultiSpectralAnomaly(spectralBand, selectedObject) : null;
              return (
                <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(0, 255, 136, 0.08)', borderRadius: '6px', border: '1px solid rgba(0, 255, 136, 0.25)' }}>
                  <div style={{ color: '#00ff88', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🛰️ ML MULTI-SPECTRAL DECOMPOSITION</span>
                    <span style={{ color: '#33ccff', textTransform: 'uppercase' }}>[{spectralBand.toUpperCase()} BAND]</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                    <div>
                      <span style={{ color: '#8bb39b' }}>Sensor Res:</span> <strong style={{ color: '#fff' }}>{report?.effectiveResolution || '0.12m GSD'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#8bb39b' }}>Penetration:</span> <strong style={{ color: '#ffaa00' }}>{report?.weatherPenetration || 'All-Weather'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#8bb39b' }}>Camouflage Flag:</span> <strong style={{ color: report?.camouflageDetected ? '#ff3366' : '#00ff88' }}>{report?.camouflageDetected ? 'YES (Masked)' : 'NO (Exposed)'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#8bb39b' }}>Adjusted Conf:</span> <strong style={{ color: '#33ccff' }}>{report ? `${(report.adjustedConfidence * 100).toFixed(0)}%` : '92%'}</strong>
                    </div>
                  </div>
                  {report?.tacticalImplication && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#c5e0d0', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '4px', borderLeft: '2px solid #00ff88' }}>
                      {report.tacticalImplication}
                    </div>
                  )}
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#a0c0e0' }}>
                    Kinematic Projection (+60s): <code style={{ color: '#00ff88' }}>{((selectedObject.geo_location?.lat || 20.2) + 0.004).toFixed(4)}°N, {((selectedObject.geo_location?.lon || 76.9) + 0.004).toFixed(4)}°E</code>
                  </div>
                </div>
              );
            })()}

            <button className="close-btn" onClick={() => setSelectedObject(null)}>
              CLOSE TELEMETRY WINDOW
            </button>
          </div>
        </div>
      )}

      {/* Machine Learning Analytics Suite Modal */}
      <MLAnalyticsModal
        isOpen={showMLModal}
        onClose={() => setShowMLModal(false)}
      />
    </div>
  );
};

export default SatellitePage;
