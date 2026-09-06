/**
 * Tactical Battlefield Machine Learning Engine
 * Implements:
 * 1. 2D Kinematic Kalman Filter for trajectory smoothing and future position prediction
 * 2. DBSCAN (Density-Based Spatial Clustering) for military convoy formation detection
 * 3. Multi-factor Bayesian Threat & Anomaly Scoring Engine
 * 4. Multi-Spectral Satellite Change & Anomaly Detection
 */

// ==========================================
// 1. 2D KINEMATIC KALMAN FILTER
// ==========================================
export class KalmanFilter2D {
  constructor(initialState = [0, 0, 0, 0], processNoise = 0.05, measurementNoise = 0.1) {
    // State: [x, y, vx, vy]
    this.x = [...initialState];
    // Error covariance matrix (4x4)
    this.P = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];
    this.q = processNoise;
    this.r = measurementNoise;
    this.lastTime = Date.now();
  }

  predict(dt = 1.0) {
    // State transition matrix F
    // x = x + vx * dt, y = y + vy * dt
    this.x[0] += this.x[2] * dt;
    this.x[1] += this.x[3] * dt;

    // Process covariance extrapolation Q
    const dt2 = dt * dt;
    const dt3 = dt2 * dt;
    const dt4 = dt3 * dt;
    const q1 = (dt4 / 4) * this.q;
    const q2 = (dt3 / 2) * this.q;
    const q3 = dt2 * this.q;

    // Update P = F * P * F^T + Q
    this.P[0][0] += 2 * dt * this.P[0][2] + dt2 * this.P[2][2] + q1;
    this.P[1][1] += 2 * dt * this.P[1][3] + dt2 * this.P[3][3] + q1;
    this.P[0][2] += dt * this.P[2][2] + q2;
    this.P[1][3] += dt * this.P[3][3] + q2;
    this.P[2][0] = this.P[0][2];
    this.P[3][1] = this.P[1][3];
    this.P[2][2] += q3;
    this.P[3][3] += q3;

    return [...this.x];
  }

  update(measurement) {
    const [zx, zy] = measurement;

    // Innovation residual: y = z - H * x
    const y0 = zx - this.x[0];
    const y1 = zy - this.x[1];

    // Residual covariance: S = H * P * H^T + R
    const s00 = this.P[0][0] + this.r;
    const s11 = this.P[1][1] + this.r;

    // Kalman Gain: K = P * H^T * S^-1
    const k00 = this.P[0][0] / s00;
    const k11 = this.P[1][1] / s11;
    const k20 = this.P[2][0] / s00;
    const k31 = this.P[3][1] / s11;

    // Update state: x = x + K * y
    this.x[0] += k00 * y0;
    this.x[1] += k11 * y1;
    this.x[2] += k20 * y0;
    this.x[3] += k31 * y1;

    // Update covariance: P = (I - K * H) * P
    this.P[0][0] *= (1 - k00);
    this.P[1][1] *= (1 - k11);
    this.P[2][0] *= (1 - k00);
    this.P[3][1] *= (1 - k11);
    this.P[2][2] -= k20 * this.P[0][2];
    this.P[3][3] -= k31 * this.P[1][3];

    return [...this.x];
  }

  /**
   * Forecast future trajectory waypoints using current velocity and process model
   */
  forecast(steps = 3, dt = 1.5) {
    const trajectory = [];
    let curX = this.x[0];
    let curY = this.x[1];
    const vx = this.x[2];
    const vy = this.x[3];

    for (let i = 1; i <= steps; i++) {
      curX += vx * dt;
      curY += vy * dt;
      trajectory.push([
        parseFloat(curX.toFixed(5)),
        parseFloat(curY.toFixed(5))
      ]);
    }
    return trajectory;
  }
}

// ==========================================
// 2. DBSCAN CONVOY FORMATION CLUSTERING
// ==========================================
export function dbscanClustering(pointsWithIds, eps = 0.04, minPts = 2) {
  // pointsWithIds = [{ id: 'UAV-01', location: [lat, lon], speed: 40, direction: 135 }, ...]
  const clusters = {};
  const visited = new Set();
  const noise = new Set();
  let clusterId = 0;

  const distance = (p1, p2) => {
    const dx = p1.location[0] - p2.location[0];
    const dy = p1.location[1] - p2.location[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getNeighbors = (point) => {
    return pointsWithIds.filter(p => p.id !== point.id && distance(point, p) <= eps);
  };

  for (const point of pointsWithIds) {
    if (visited.has(point.id)) continue;
    visited.add(point.id);

    const neighbors = getNeighbors(point);
    if (neighbors.length < minPts - 1) {
      noise.add(point.id);
      clusters[point.id] = -1; // Noise / isolated vehicle
    } else {
      clusters[point.id] = clusterId;
      const queue = [...neighbors];

      while (queue.length > 0) {
        const neighbor = queue.shift();
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          const nextNeighbors = getNeighbors(neighbor);
          if (nextNeighbors.length >= minPts - 1) {
            queue.push(...nextNeighbors.filter(nn => !visited.has(nn.id)));
          }
        }
        if (clusters[neighbor.id] === undefined || clusters[neighbor.id] === -1) {
          clusters[neighbor.id] = clusterId;
        }
      }
      clusterId++;
    }
  }

  // Calculate convoy cohesion metrics for each cluster
  const convoyMetrics = {};
  for (let c = 0; c < clusterId; c++) {
    const members = pointsWithIds.filter(p => clusters[p.id] === c);
    if (members.length > 0) {
      const avgSpeed = members.reduce((sum, m) => sum + (m.speed || 0), 0) / members.length;
      const lats = members.map(m => m.location[0]);
      const lons = members.map(m => m.location[1]);
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLon = lons.reduce((a, b) => a + b, 0) / lons.length;

      // Heading variance to verify unified directional movement
      const headings = members.map(m => m.direction || 0);
      const headingVariance = headings.length > 1
        ? headings.reduce((sum, h) => sum + Math.abs(h - headings[0]), 0) / headings.length
        : 0;

      convoyMetrics[c] = {
        clusterId: c,
        size: members.length,
        center: [centerLat, centerLon],
        averageSpeed: parseFloat(avgSpeed.toFixed(1)),
        isCohesiveConvoy: headingVariance < 45, // Directionally aligned
        formationType: members.length >= 4 ? 'Mechanized Battalion' : 'Armored Recon Patrol'
      };
    }
  }

  return { clusters, convoyMetrics };
}

// ==========================================
// 3. BAYESIAN TACTICAL THREAT SCORING ENGINE
// ==========================================
export function calculateTacticalThreatML({
  targetClass,
  speedKmh = 0,
  headingDeg = 0,
  location = [20.18, 76.95],
  friendlyBaseLocation = [20.20, 76.98],
  inConvoy = false,
  convoySize = 1,
  rfEmissions = false,
  confidence = 0.9
}) {
  // Class base prior probabilities
  const CLASS_PRIORS = {
    'Armored Vehicle': 0.88,
    'armored_vehicle': 0.88,
    'T-90 / T-72 Tank': 0.94,
    'Air Defense Radar': 0.92,
    'radar': 0.92,
    'Command Bunker': 0.89,
    'infrastructure': 0.89,
    'Tactical Truck': 0.58,
    'transport': 0.58,
    'Supply Convoy Unit': 0.65,
    'Patrol Infantry': 0.35,
    'personnel': 0.35
  };

  const basePrior = CLASS_PRIORS[targetClass] || 0.5;

  // Factor 1: Vector approach towards friendly base
  // Calculate bearing from object to friendly base
  const dLat = friendlyBaseLocation[0] - location[0];
  const dLon = friendlyBaseLocation[1] - location[1];
  const targetBearing = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;
  
  // Angle difference between current heading and vector to friendly base
  const angleDiff = Math.abs(headingDeg - targetBearing);
  const closingFactor = Math.cos((Math.min(angleDiff, 180) * Math.PI) / 180); // 1 = directly closing, -1 = retreating

  // Factor 2: Speed / Kinematic urgency
  const speedNormalized = Math.min(speedKmh / 70.0, 1.0); // 0 to 1

  // Factor 3: Convoy force multiplier
  const convoyMultiplier = inConvoy ? Math.min(1.0 + convoySize * 0.08, 1.35) : 1.0;

  // Factor 4: Electronic warfare / RF emissions
  const rfMultiplier = rfEmissions ? 1.15 : 1.0;

  // Bayesian update
  // Likelihood ratio of aggressive intent vs benign
  const evidenceScore = (
    basePrior * 0.45 +
    Math.max(0, closingFactor) * 0.25 +
    speedNormalized * 0.20 +
    (inConvoy ? 0.10 : 0.0)
  ) * convoyMultiplier * rfMultiplier * confidence;

  const finalScore = Math.min(Math.max(parseFloat(evidenceScore.toFixed(2)), 0.05), 0.99);

  let level = 'LOW';
  if (finalScore >= 0.75) level = 'HIGH';
  else if (finalScore >= 0.45) level = 'MEDIUM';

  const riskFactors = [];
  if (basePrior >= 0.8) riskFactors.push(`High-lethality asset (${targetClass})`);
  if (closingFactor > 0.5) riskFactors.push(`Closing intercept vector toward Sector Base (${Math.round(angleDiff)}° offset)`);
  if (speedKmh > 35) riskFactors.push(`Tactical operational transit speed (${speedKmh} km/h)`);
  if (inConvoy) riskFactors.push(`Integrated in active ${convoySize}-vehicle convoy group`);
  if (rfEmissions) riskFactors.push('Active military radar/radio emissions detected');

  return {
    score: finalScore,
    level,
    factors: riskFactors.length > 0 ? riskFactors : ['Standard patrol pattern'],
    recommendedAction: level === 'HIGH'
      ? 'Alert Sector QRF; queue tactical UAV strike verification.'
      : level === 'MEDIUM'
      ? 'Maintain persistent electro-optical track; log to surveillance ledger.'
      : 'Continue routine background radar sweep.'
  };
}

// ==========================================
// 4. MULTI-SPECTRAL CHANGE & ANOMALY DETECTION
// ==========================================
export function analyzeSatelliteSpectralAnomaly(spectralBand, target) {
  // Analyzes target under specific spectral conditions
  const bandProfiles = {
    optical: {
      penetration: 'Surface Only',
      camouflageSusceptibility: 'High',
      cloudDegradation: 'Moderate',
      confidenceMultiplier: 1.0,
      dominantSignature: 'Visual Geometry & Solar Reflection'
    },
    flir: {
      penetration: 'Thermal Radiation',
      camouflageSusceptibility: 'Low',
      cloudDegradation: 'Low',
      confidenceMultiplier: 1.12,
      dominantSignature: 'Engine & Heat Exhaust Dissipation (300K-450K)'
    },
    sar: {
      penetration: 'All-Weather / Foliage Penetration',
      camouflageSusceptibility: 'Very Low',
      cloudDegradation: 'Zero',
      confidenceMultiplier: 1.25,
      dominantSignature: 'Dielectric Metallic Corner Reflector Scatter'
    },
    night: {
      penetration: 'Low-Light Amplification',
      camouflageSusceptibility: 'Moderate',
      cloudDegradation: 'High',
      confidenceMultiplier: 0.95,
      dominantSignature: 'Convoy Headlight & Ambient Photon Amplification'
    }
  };

  const profile = bandProfiles[spectralBand] || bandProfiles.optical;
  const isCovered = target.category === 'armor' || target.category === 'radar';

  return {
    band: spectralBand.toUpperCase(),
    effectiveResolution: spectralBand === 'sar' ? '0.25m SAR Spot' : '0.12m Panchromatic',
    signatureType: profile.dominantSignature,
    weatherPenetration: profile.penetration,
    camouflageDetected: isCovered && (spectralBand === 'flir' || spectralBand === 'sar'),
    adjustedConfidence: Math.min(0.99, parseFloat((target.confidence * profile.confidenceMultiplier).toFixed(2))),
    tacticalImplication: spectralBand === 'sar'
      ? 'SAR microwave backscatter confirms metallic density consistent with heavy armored chassis.'
      : spectralBand === 'flir'
      ? 'Thermal sensor isolates internal combustion engine running temperature.'
      : 'Optical image provides visual paint scheme and silhouette confirmation.'
  };
}

// Multi-spectral anomaly & camouflage detection alias
export const analyzeMultiSpectralAnomaly = analyzeSatelliteSpectralAnomaly;
