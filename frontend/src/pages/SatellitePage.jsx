import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { uploadSatelliteImage, getSensorData, getFusionData } from '../core/api';
import { useGlobalState } from '../hooks/useGlobalState';
import './SatellitePage.css';

const SatellitePage = () => {
  const { state, updateState } = useGlobalState();
  const [satelliteImage, setSatelliteImage] = useState(null);
  const [detections, setDetections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [viewMode, setViewMode] = useState('image'); // image, graph, analytics
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // D3 Graph for object relationships
  useEffect(() => {
    if (viewMode === 'graph' && detections.length > 0 && svgRef.current) {
      renderGraph();
    }
  }, [viewMode, detections]);
  
  const renderGraph = () => {
    if (!svgRef.current) return;
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g');
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        svg.attr('transform', event.transform);
      });
    
    d3.select(svgRef.current).call(zoom);
    
    // Prepare nodes
    const nodes = detections.map((det, idx) => ({
      id: idx,
      classId: det.class_id,
      confidence: det.confidence,
      lat: det.geo_location?.lat,
      lon: det.geo_location?.lon,
      label: `Object ${idx}`
    }));
    
    // Create links based on proximity
    const links = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const distance = Math.sqrt(
          Math.pow(nodes[i].lat - nodes[j].lat, 2) + 
          Math.pow(nodes[i].lon - nodes[j].lon, 2)
        );
        if (distance < 0.5) { // Close proximity threshold
          links.push({
            source: i,
            target: j,
            distance: distance
          });
        }
      }
    }
    
    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));
    
    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#33ccff')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.5);
    
    // Draw nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedObject(d);
      });
    
    // Add circles
    node.append('circle')
      .attr('r', d => 8 + (d.confidence * 10))
      .attr('fill', d => getClassColor(d.classId))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('fill-opacity', 0.8);
    
    // Add labels
    node.append('text')
      .attr('dy', -12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e0e0e0')
      .attr('font-size', '10px')
      .text(d => `Class ${d.classId}`);
    
    // Add confidence rings
    node.append('circle')
      .attr('r', d => 12 + (d.confidence * 8))
      .attr('fill', 'none')
      .attr('stroke', d => getClassColor(d.classId))
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');
    
    // Update positions
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    // Cleanup
    return () => simulation.stop();
  };
  
  const getClassColor = (classId) => {
    const colors = {
      1: '#00ff88', // Person
      2: '#ff3366', // Vehicle
      3: '#33ccff', // Building
      4: '#ffcc33'  // Other
    };
    return colors[classId] || '#ffffff';
  };
  
  const handleSatelliteUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsLoading(true);
    
    try {
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setSatelliteImage(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Upload to backend
      const result = await uploadSatelliteImage(file);
      
      if (result.detections) {
        setDetections(result.detections);
        
        // Add to global state
        updateState({
          satelliteData: {
            image: satelliteImage,
            detections: result.detections,
            timestamp: new Date()
          }
        });
      }
      
    } catch (error) {
      console.error('Error uploading satellite image:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderAnalytics = () => {
    const stats = {
      total: detections.length,
      byClass: detections.reduce((acc, d) => {
        acc[d.class_id] = (acc[d.class_id] || 0) + 1;
        return acc;
      }, {}),
      avgConfidence: detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length || 0
    };
    
    return (
      <div className="analytics-panel">
        <h3>📊 Satellite Intelligence Analytics</h3>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Objects Detected</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{(stats.avgConfidence * 100).toFixed(1)}%</div>
            <div className="stat-label">Average Confidence</div>
          </div>
        </div>
        
        <div className="class-distribution">
          <h4>Object Classification</h4>
          {Object.entries(stats.byClass).map(([classId, count]) => (
            <div key={classId} className="class-item">
              <span className="class-label">Class {classId}</span>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${(count / stats.total) * 100}%`, background: getClassColor(parseInt(classId)) }}
                ></div>
              </div>
              <span className="class-count">{count}</span>
            </div>
          ))}
        </div>
        
        {detections.length > 0 && (
          <div className="geo-insights">
            <h4>📍 Geolocation Insights</h4>
            <div className="insight-list">
              <div className="insight-item">
                <span>Northern Sector:</span>
                <span>{detections.filter(d => d.geo_location?.lat > 21).length} objects</span>
              </div>
              <div className="insight-item">
                <span>Southern Sector:</span>
                <span>{detections.filter(d => d.geo_location?.lat < 19).length} objects</span>
              </div>
              <div className="insight-item">
                <span>Eastern Sector:</span>
                <span>{detections.filter(d => d.geo_location?.lon > 76).length} objects</span>
              </div>
              <div className="insight-item">
                <span>Western Sector:</span>
                <span>{detections.filter(d => d.geo_location?.lon < 73).length} objects</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="satellite-page">
      <div className="satellite-header">
        <h1>🛰️ SATELLITE INTELLIGENCE</h1>
        <div className="header-controls">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleSatelliteUpload}
            style={{ display: 'none' }}
          />
          <button 
            className="upload-satellite-btn"
            onClick={() => fileInputRef.current.click()}
            disabled={isLoading}
          >
            {isLoading ? '📡 PROCESSING...' : '📸 UPLOAD SATELLITE IMAGE'}
          </button>
          
          <div className="view-mode-toggle">
            <button 
              className={viewMode === 'image' ? 'active' : ''}
              onClick={() => setViewMode('image')}
            >
              🖼️ Image
            </button>
            <button 
              className={viewMode === 'graph' ? 'active' : ''}
              onClick={() => setViewMode('graph')}
            >
              📊 Graph
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
      
      <div className="satellite-content">
        {viewMode === 'image' && (
          <div className="image-view">
            {satelliteImage ? (
              <div className="image-container">
                <img src={satelliteImage} alt="Satellite" />
                {detections.map((det, idx) => (
                  <div 
                    key={idx}
                    className="detection-marker"
                    style={{
                      left: `${((det.geo_location?.lon - 72) / 6) * 100}%`,
                      top: `${((22 - det.geo_location?.lat) / 4) * 100}%`
                    }}
                    onClick={() => setSelectedObject(det)}
                  >
                    <div className="marker-dot"></div>
                    <div className="marker-tooltip">
                      Class: {det.class_id}<br/>
                      Conf: {(det.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🛰️</div>
                <h3>No Satellite Image Loaded</h3>
                <p>Upload a satellite image to begin analysis</p>
              </div>
            )}
          </div>
        )}
        
        {viewMode === 'graph' && (
          <div className="graph-view">
            <svg ref={svgRef} className="graph-svg"></svg>
          </div>
        )}
        
        {viewMode === 'analytics' && renderAnalytics()}
      </div>
      
      {selectedObject && (
        <div className="object-detail-modal" onClick={() => setSelectedObject(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Object Details</h3>
            <div className="detail-item">
              <strong>Class ID:</strong> {selectedObject.class_id}
            </div>
            <div className="detail-item">
              <strong>Confidence:</strong> {(selectedObject.confidence * 100).toFixed(1)}%
            </div>
            {selectedObject.geo_location && (
              <>
                <div className="detail-item">
                  <strong>Latitude:</strong> {selectedObject.geo_location.lat}
                </div>
                <div className="detail-item">
                  <strong>Longitude:</strong> {selectedObject.geo_location.lon}
                </div>
              </>
            )}
            <button className="close-btn" onClick={() => setSelectedObject(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SatellitePage;