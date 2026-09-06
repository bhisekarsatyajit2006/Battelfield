import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import coordinateConverter from '../utils/coordinateConverter';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom threat level colors
const threatColors = {
  HIGH: '#ff3366',
  MEDIUM: '#ff9933',
  LOW: '#00ff88'
};

// Custom cluster colors
const clusterColors = [
  '#00ff88',  // Green
  '#33ccff',  // Blue
  '#ff33cc',  // Pink
  '#ffcc33',  // Gold
  '#9933ff'   // Purple
];

// Map Tile Provider configurations (Free, no API key required)
const MAP_LAYERS = {
  satellite: {
    id: 'satellite',
    label: 'Satellite Recon',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
    className: ''
  },
  tactical: {
    id: 'tactical',
    label: 'Tactical Dark',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    className: 'tactical-dark-tiles'
  },
  topo: {
    id: 'topo',
    label: 'Standard OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    className: ''
  }
};

// Component to handle map view updates
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
};

const MapView = ({ data, onObjectClick, showHeatmap, selectedObjectId, performanceMode }) => {
  const [mapCenter, setMapCenter] = useState([20.18, 76.95]); // Tactical sector center
  const [mapZoom, setMapZoom] = useState(11);
  const [activeLayer, setActiveLayer] = useState('satellite');
  const [allPoints, setAllPoints] = useState([]);
  const hasAutoCenteredRef = useRef(false);

  // Auto-focus on selected object when changed
  useEffect(() => {
    if (!selectedObjectId || !data?.paths || !data.paths[selectedObjectId]) return;
    const path = data.paths[selectedObjectId];
    if (path && Array.isArray(path) && path.length > 0) {
      const pos = coordinateConverter.convertCentroid(path[path.length - 1]);
      if (pos) {
        setMapCenter(pos);
        setMapZoom(13);
      }
    }
  }, [selectedObjectId, data?.paths]);
  
  // Extract all points for bounds calculation
  useEffect(() => {
    const points = [];
    
    // Collect all points from paths
    if (data?.paths) {
      Object.values(data.paths).forEach(path => {
        if (Array.isArray(path)) {
          points.push(...path);
        }
      });
    }
    
    // Collect all points from predictions
    if (data?.predictions) {
      Object.values(data.predictions).forEach(pred => {
        if (Array.isArray(pred)) {
          points.push(...pred);
        }
      });
    }
    
    // Collect all points from sensors
    if (data?.sensors) {
      data.sensors.forEach(sensor => {
        if (sensor.location && Array.isArray(sensor.location)) {
          points.push(sensor.location);
        }
      });
    }
    
    // Update bounds if we have points
    if (points.length > 0) {
      coordinateConverter.updateBoundsFromData(points);
      setAllPoints(points);
      
      // Auto-center on initial points load
      if (!hasAutoCenteredRef.current && points.length > 0) {
        const center = coordinateConverter.convertCentroid(points[0]);
        if (center) {
          setMapCenter(center);
          setMapZoom(11);
          hasAutoCenteredRef.current = true;
        }
      }
    }
  }, [data]);
  
  // Render paths (green lines)
  const renderPaths = useCallback(() => {
    if (!data?.paths) return null;
    
    return Object.entries(data.paths).map(([objectId, path]) => {
      if (!path || !Array.isArray(path) || path.length < 2) return null;
      
      const convertedPath = coordinateConverter.convertPath(path);
      
      return (
        <Polyline
          key={`path-${objectId}`}
          positions={convertedPath}
          color="#00ff88"
          weight={3}
          opacity={0.8}
          smoothFactor={1}
          dashArray={null}
        />
      );
    });
  }, [data?.paths]);
  
  // Render predictions (dashed red lines)
  const renderPredictions = useCallback(() => {
    if (!data?.predictions) return null;
    
    return Object.entries(data.predictions).map(([objectId, prediction]) => {
      if (!prediction || !Array.isArray(prediction) || prediction.length < 2) return null;
      
      const convertedPath = coordinateConverter.convertPath(prediction);
      
      return (
        <Polyline
          key={`pred-${objectId}`}
          positions={convertedPath}
          color="#ff3366"
          weight={2}
          opacity={0.7}
          dashArray="5, 10"
          smoothFactor={1}
        />
      );
    });
  }, [data?.predictions]);
  
  // Render objects (markers)
  const renderObjects = useCallback(() => {
    if (!data?.paths) return null;
    
    const objects = [];
    
    Object.entries(data.paths).forEach(([objectId, path]) => {
      if (!path || !Array.isArray(path) || path.length === 0) return;
      
      const lastPoint = path[path.length - 1];
      const position = coordinateConverter.convertCentroid(lastPoint);
      if (!position) return;
      
      // Get threat level for this object
      const threat = data?.threats?.[objectId];
      const threatLevel = threat?.level || 'LOW';
      const threatColor = threatColors[threatLevel] || threatColors.LOW;
      
      // Get cluster for this object
      const clusterId = data?.clusters?.[objectId];
      const markerColor = clusterId !== undefined && clusterId !== -1 
        ? clusterColors[clusterId % clusterColors.length] 
        : threatColor;
      
      objects.push(
        <CircleMarker
          key={`object-${objectId}`}
          center={position}
          radius={8}
          fillColor={markerColor}
          color="#ffffff"
          weight={2}
          opacity={1}
          fillOpacity={0.8}
          eventHandlers={{
            click: () => onObjectClick && onObjectClick(objectId, threat, data?.fused?.[objectId])
          }}
        >
          <Popup>
            <div style={{ color: '#000', padding: '5px' }}>
              <strong>Object ID: {objectId}</strong><br />
              <strong>Threat Level:</strong> <span style={{ color: threatColor }}>{threatLevel}</span><br />
              {threat?.score && <><strong>Threat Score:</strong> {(threat.score * 100).toFixed(1)}%<br /></>}
              {data?.fused?.[objectId]?.confidence && (
                <><strong>Fusion Confidence:</strong> {(data.fused[objectId].confidence * 100).toFixed(1)}%<br /></>
              )}
              {clusterId !== undefined && clusterId !== -1 && (
                <><strong>Cluster ID:</strong> {clusterId}<br /></>
              )}
              <strong>Position:</strong> {position[0].toFixed(4)}, {position[1].toFixed(4)}
            </div>
          </Popup>
        </CircleMarker>
      );
    });
    
    return objects;
  }, [data?.paths, data?.threats, data?.clusters, data?.fused, onObjectClick]);
  
  // Render sensors
  const renderSensors = useCallback(() => {
    if (!data?.sensors || !Array.isArray(data.sensors)) return null;
    
    return data.sensors.map((sensor, idx) => {
      if (!sensor.location || !Array.isArray(sensor.location)) return null;
      
      const position = coordinateConverter.convertCentroid(sensor.location);
      if (!position) return null;
      
      return (
        <CircleMarker
          key={`sensor-${sensor.sensor_id || idx}`}
          center={position}
          radius={6}
          fillColor="#33ccff"
          color="#ffffff"
          weight={2}
          opacity={1}
          fillOpacity={0.7}
        >
          <Popup>
            <div style={{ color: '#000', padding: '5px' }}>
              <strong>Sensor ID: {sensor.sensor_id || idx}</strong><br />
              {sensor.speed && <><strong>Speed:</strong> {sensor.speed} m/s<br /></>}
              {sensor.confidence && <><strong>Confidence:</strong> {(sensor.confidence * 100).toFixed(1)}%<br /></>}
            </div>
          </Popup>
        </CircleMarker>
      );
    });
  }, [data?.sensors]);
  
  // Render tactical threat heatmap circles when active
  const renderHeatmap = useCallback(() => {
    if (!showHeatmap || !data?.paths) return null;

    return Object.entries(data.paths).map(([objectId, path]) => {
      if (!path || !Array.isArray(path) || path.length === 0) return null;
      const lastPoint = path[path.length - 1];
      const position = coordinateConverter.convertCentroid(lastPoint);
      if (!position) return null;

      const threat = data?.threats?.[objectId];
      const level = threat?.level || 'LOW';
      const score = threat?.score || (level === 'HIGH' ? 0.9 : level === 'MEDIUM' ? 0.6 : 0.3);

      const color = level === 'HIGH' ? '#ff3366' : level === 'MEDIUM' ? '#ff9933' : '#ffcc33';
      const outerRadius = level === 'HIGH' ? 2200 : level === 'MEDIUM' ? 1600 : 1100;
      const innerRadius = outerRadius * 0.45;

      return (
        <React.Fragment key={`heat-zone-${objectId}`}>
          <Circle
            center={position}
            radius={outerRadius}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.2 * score,
              color: color,
              weight: 1,
              opacity: 0.35,
              dashArray: '4, 4'
            }}
          />
          <Circle
            center={position}
            radius={innerRadius}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.42 * score,
              color: color,
              weight: 1.5,
              opacity: 0.7
            }}
          />
        </React.Fragment>
      );
    });
  }, [showHeatmap, data?.paths, data?.threats]);

  // Render tactical target lock highlight reticle
  const renderTargetLock = useCallback(() => {
    if (!selectedObjectId || !data?.paths || !data.paths[selectedObjectId]) return null;
    const path = data.paths[selectedObjectId];
    if (!path || !Array.isArray(path) || path.length === 0) return null;
    const pos = coordinateConverter.convertCentroid(path[path.length - 1]);
    if (!pos) return null;

    return (
      <CircleMarker
        key={`target-lock-${selectedObjectId}`}
        center={pos}
        radius={18}
        pathOptions={{
          fillColor: 'transparent',
          color: '#00ff88',
          weight: 3,
          dashArray: '5, 5',
          opacity: 0.95
        }}
      />
    );
  }, [selectedObjectId, data?.paths]);

  const currentLayerConfig = MAP_LAYERS[activeLayer] || MAP_LAYERS.satellite;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map Layer Mode Switcher */}
      <div className="map-layer-selector">
        {Object.values(MAP_LAYERS).map(layer => (
          <button
            key={layer.id}
            type="button"
            className={`map-layer-btn ${activeLayer === layer.id ? 'active' : ''}`}
            onClick={() => setActiveLayer(layer.id)}
            title={`Switch to ${layer.label} mode`}
          >
            {layer.label}
          </button>
        ))}
      </div>

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%', background: '#10261c' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <MapUpdater center={mapCenter} zoom={mapZoom} />
        
        {/* Base map layer - 100% free, no API key required */}
        <TileLayer
          key={currentLayerConfig.id}
          attribution={currentLayerConfig.attribution}
          url={currentLayerConfig.url}
          maxZoom={currentLayerConfig.maxZoom}
          className={currentLayerConfig.className}
        />
        
        {/* Render all tactical layers */}
        {renderHeatmap()}
        {renderPaths()}
        {renderPredictions()}
        {renderObjects()}
        {renderSensors()}
        {renderTargetLock()}
      </MapContainer>
    </div>
  );
};

export default MapView;