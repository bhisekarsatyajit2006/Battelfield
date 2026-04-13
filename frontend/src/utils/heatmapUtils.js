// Heatmap utility for threat intensity visualization
class HeatmapUtils {
  constructor() {
    this.heatmapData = [];
    this.intensityScale = [0, 0.3, 0.6, 1];
  }
  
  // Generate heatmap points from threats and objects
  generateHeatmapPoints(paths, threats) {
    const points = [];
    
    if (!paths) return points;
    
    Object.entries(paths).forEach(([objectId, path]) => {
      if (!path || path.length === 0) return;
      
      const lastPoint = path[path.length - 1];
      const threat = threats?.[objectId];
      
      // Calculate intensity based on threat level
      let intensity = 0.3; // Default low intensity
      if (threat) {
        switch(threat.level) {
          case 'HIGH':
            intensity = 1.0;
            break;
          case 'MEDIUM':
            intensity = 0.7;
            break;
          case 'LOW':
            intensity = 0.4;
            break;
        }
        
        // Multiply by confidence score if available
        if (threat.score) {
          intensity *= threat.score;
        }
      }
      
      points.push({
        lat: lastPoint[1],
        lng: lastPoint[0],
        intensity: intensity,
        objectId: objectId
      });
    });
    
    return points;
  }
  
  // Create heatmap layer configuration
  getHeatmapConfig(points) {
    return {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      minOpacity: 0.3,
      maxOpacity: 0.8,
      gradient: {
        0.0: '#00ff88',
        0.4: '#ffff00',
        0.6: '#ff9933',
        0.8: '#ff3366',
        1.0: '#ff0000'
      },
      data: points
    };
  }
}

export default new HeatmapUtils();