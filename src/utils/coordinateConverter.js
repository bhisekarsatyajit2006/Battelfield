// Coordinate conversion utility
class CoordinateConverter {
  constructor() {
    // Default map bounds (you can adjust these based on your demo area)
    this.mapBounds = {
      minLat: 18.0,   // South
      maxLat: 22.0,   // North
      minLng: 72.0,   // West
      maxLng: 78.0    // East
    };
    
    // Default pixel range from backend (assuming 0-1000 range)
    this.pixelRange = {
      minX: 0,
      maxX: 1000,
      minY: 0,
      maxY: 1000
    };
  }
  
  // Convert pixel X to longitude
  pixelToLng(x, minX = null, maxX = null) {
    const min = minX !== null ? minX : this.pixelRange.minX;
    const max = maxX !== null ? maxX : this.pixelRange.maxX;
    
    // Linear interpolation
    const t = (x - min) / (max - min);
    return this.mapBounds.minLng + t * (this.mapBounds.maxLng - this.mapBounds.minLng);
  }
  
  // Convert pixel Y to latitude (inverted because Y increases downward in pixel coordinates)
  pixelToLat(y, minY = null, maxY = null) {
    const min = minY !== null ? minY : this.pixelRange.minY;
    const max = maxY !== null ? maxY : this.pixelRange.maxY;
    
    // Y is inverted because pixel Y=0 is top, but map latitude increases upward
    const t = 1 - ((y - min) / (max - min));
    return this.mapBounds.minLat + t * (this.mapBounds.maxLat - this.mapBounds.minLat);
  }
  
  // Determine if coordinate is already geographic [lat, lng]
  isGeoCoordinate(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      // Check typical tactical region or global geo bounds
      ((lat >= 5 && lat <= 40 && lng >= 50 && lng <= 105) || (lat < 90 && lng > 90))
    );
  }

  // Convert array of pixel coordinates or geo coordinates to lat/lng
  convertPath(pixelPath) {
    if (!pixelPath || !Array.isArray(pixelPath)) return [];
    
    return pixelPath.map(point => {
      if (Array.isArray(point) && point.length >= 2) {
        if (this.isGeoCoordinate(point[0], point[1])) {
          return [point[0], point[1]];
        }
        return [this.pixelToLat(point[1]), this.pixelToLng(point[0])];
      }
      return point;
    });
  }
  
  // Convert bbox [x1, y1, x2, y2] to lat/lng bounds
  convertBbox(bbox) {
    if (!bbox || bbox.length !== 4) return null;
    
    const [x1, y1, x2, y2] = bbox;
    return {
      southWest: [this.pixelToLat(y2), this.pixelToLng(x1)],
      northEast: [this.pixelToLat(y1), this.pixelToLng(x2)]
    };
  }
  
  // Convert centroid [x, y] or [lat, lon] to lat/lng
  convertCentroid(centroid) {
    if (!centroid || centroid.length !== 2) return null;
    if (this.isGeoCoordinate(centroid[0], centroid[1])) {
      return [centroid[0], centroid[1]];
    }
    return [this.pixelToLat(centroid[1]), this.pixelToLng(centroid[0])];
  }
  
  // Update map bounds dynamically based on data
  updateBoundsFromData(allPoints) {
    if (!allPoints || allPoints.length === 0) return;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    allPoints.forEach(point => {
      if (point[0] < minX) minX = point[0];
      if (point[0] > maxX) maxX = point[0];
      if (point[1] < minY) minY = point[1];
      if (point[1] > maxY) maxY = point[1];
    });
    
    // Add padding
    const padding = 50;
    this.pixelRange.minX = Math.max(0, minX - padding);
    this.pixelRange.maxX = maxX + padding;
    this.pixelRange.minY = Math.max(0, minY - padding);
    this.pixelRange.maxY = maxY + padding;
  }
}

export default new CoordinateConverter();