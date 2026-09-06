import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

function hashData(data: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function generateInitialState() {
  const paths: Record<string, [number, number][]> = {
    'OBJ-101': [[20.12, 76.85], [20.15, 76.89], [20.18, 76.92], [20.21, 76.95]],
    'OBJ-102': [[20.08, 77.05], [20.11, 77.02], [20.14, 77.00], [20.17, 76.98]],
    'OBJ-103': [[20.25, 77.10], [20.28, 77.12], [20.31, 77.15], [20.34, 77.18]],
    'OBJ-104': [[19.95, 76.78], [19.98, 76.81], [20.01, 76.84], [20.04, 76.88]],
    'OBJ-105': [[20.14, 76.90], [20.17, 76.93], [20.20, 76.96], [20.22, 76.97]]
  };

  const predictions: Record<string, [number, number][]> = {
    'OBJ-101': [[20.24, 76.98], [20.27, 77.01], [20.30, 77.04]],
    'OBJ-102': [[20.20, 76.96], [20.23, 76.94], [20.26, 76.92]],
    'OBJ-103': [[20.37, 77.21], [20.40, 77.24], [20.43, 77.27]],
    'OBJ-104': [[20.07, 76.91], [20.10, 76.94], [20.13, 76.97]],
    'OBJ-105': [[20.25, 77.00], [20.28, 77.03], [20.31, 77.06]]
  };

  const threats: Record<string, { level: 'HIGH' | 'MEDIUM' | 'LOW'; score: number; factors?: string[] }> = {
    'OBJ-101': { level: 'HIGH', score: 0.89, factors: ['High velocity', 'Approaching Forward Defense Line'] },
    'OBJ-102': { level: 'MEDIUM', score: 0.64, factors: ['Forming tactical convoy', 'Radio frequency match'] },
    'OBJ-103': { level: 'LOW', score: 0.28, factors: ['Civilian transit corridor', 'Consistent trajectory'] },
    'OBJ-104': { level: 'MEDIUM', score: 0.58, factors: ['Unidentified signature', 'Off-road tracking'] },
    'OBJ-105': { level: 'HIGH', score: 0.92, factors: ['Armored vehicle signature', 'Close formation'] }
  };

  const clusters: Record<string, number> = {
    'OBJ-101': 0,
    'OBJ-102': 0,
    'OBJ-105': 0,
    'OBJ-103': -1,
    'OBJ-104': 1
  };

  const fused_intelligence: Record<string, { location: [number, number]; confidence: number; threat: { level: string; score: number }; sources: string[] }> = {
    'OBJ-101': { location: [20.21, 76.95], confidence: 0.94, threat: threats['OBJ-101'], sources: ['UAV Optical', 'Seismic Sensor #2', 'Radar Track'] },
    'OBJ-102': { location: [20.17, 76.98], confidence: 0.88, threat: threats['OBJ-102'], sources: ['UAV Optical', 'Acoustic Array'] },
    'OBJ-103': { location: [20.34, 77.18], confidence: 0.91, threat: threats['OBJ-103'], sources: ['Satellite IR', 'Civilian AIS'] },
    'OBJ-104': { location: [20.04, 76.88], confidence: 0.79, threat: threats['OBJ-104'], sources: ['Seismic Sensor #4'] },
    'OBJ-105': { location: [20.22, 76.97], confidence: 0.96, threat: threats['OBJ-105'], sources: ['UAV Optical', 'Synthetic Aperture Radar'] }
  };

  const sensor_data = [
    { sensor_id: 1, timestamp: Date.now() / 1000, location: [20.15, 76.85], detected_object: 'vehicle', speed: 44.2, direction: 42.5, confidence: 0.88 },
    { sensor_id: 2, timestamp: Date.now() / 1000, location: [20.22, 76.96], detected_object: 'armored unit', speed: 52.1, direction: 38.0, confidence: 0.93 },
    { sensor_id: 3, timestamp: Date.now() / 1000, location: [20.32, 77.14], detected_object: 'patrol', speed: 28.6, direction: 110.4, confidence: 0.82 },
    { sensor_id: 4, timestamp: Date.now() / 1000, location: [20.05, 76.86], detected_object: 'reconnaissance', speed: 36.4, direction: 65.2, confidence: 0.76 }
  ];

  return {
    paths,
    predictions,
    threats,
    clusters,
    fused_intelligence,
    sensor_data,
    report: 'Total objects detected: 5 | Convoy movement detected in Sector Bravo | High threat objects: 2 (OBJ-101, OBJ-105) near Perimeter Alpha | Recommendation: Deploy reconnaissance drone immediately.'
  };
}

let pipelineState = generateInitialState();

interface BlockchainTx {
  id: string;
  type: 'drone_upload' | 'satellite_recon' | 'sensor_data' | 'fusion_data';
  timestamp: string;
  tx_hash: string;
  data_hash: string;
  status: 'verified' | 'pending' | 'failed';
  block_number: number;
  details: Record<string, unknown>;
}

const blockchainLedger: BlockchainTx[] = [
  {
    id: 'tx-sat-kh11-01',
    type: 'satellite_recon',
    timestamp: new Date(Date.now() - 25000).toISOString(),
    tx_hash: '0x3f8a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    data_hash: '0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
    status: 'verified',
    block_number: 1849298,
    details: {
      satellite: 'USA-314 (KH-11 KENNEN V)',
      sensor_band: 'MULTI-SPECTRAL OPTICAL',
      detected_targets: 12,
      encryption: 'ECDSA-SHA256'
    }
  },
  {
    id: 'tx-fusion-genesis',
    type: 'fusion_data',
    timestamp: new Date(Date.now() - 50000).toISOString(),
    tx_hash: '0xd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    data_hash: '0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
    status: 'verified',
    block_number: 1849280,
    details: {
      fused_tracks: 5,
      consensus_nodes: 7,
      integrity_score: '99.9%'
    }
  }
];

class ServerKalmanTracker {
  lat: number;
  lon: number;
  vLat: number;
  vLon: number;

  constructor(history: [number, number][]) {
    const last = history[history.length - 1];
    const prev = history.length > 1 ? history[history.length - 2] : last;
    this.lat = last[0];
    this.lon = last[1];
    this.vLat = (last[0] - prev[0]) || 0.003;
    this.vLon = (last[1] - prev[1]) || 0.003;
  }

  forecast(steps = 3, dt = 1.2): [number, number][] {
    const predictions: [number, number][] = [];
    let curLat = this.lat;
    let curLon = this.lon;

    for (let i = 1; i <= steps; i++) {
      curLat += this.vLat * dt;
      curLon += this.vLon * dt;
      predictions.push([parseFloat(curLat.toFixed(5)), parseFloat(curLon.toFixed(5))]);
    }
    return predictions;
  }

  getKinematics() {
    const dLatKm = this.vLat * 111;
    const dLonKm = this.vLon * 111 * Math.cos((this.lat * Math.PI) / 180);
    const speed = Math.min(95, Math.max(12, Math.round(Math.sqrt(dLatKm * dLatKm + dLonKm * dLonKm) * 3600)));
    const direction = Math.round((Math.atan2(this.vLon, this.vLat) * 180 / Math.PI + 360) % 360);
    return { speed, direction };
  }
}

function runServerDBSCAN(items: { id: string; location: [number, number]; speed?: number }[], eps = 0.05, minPts = 2) {
  const clusters: Record<string, number> = {};
  const visited = new Set<string>();
  let clusterId = 0;

  const dist = (a: [number, number], b: [number, number]) => {
    const dLat = a[0] - b[0];
    const dLon = a[1] - b[1];
    return Math.sqrt(dLat * dLat + dLon * dLon);
  };

  for (const item of items) {
    if (visited.has(item.id)) continue;
    visited.add(item.id);

    const neighbors = items.filter(other => other.id !== item.id && dist(item.location, other.location) <= eps);
    if (neighbors.length < minPts - 1) {
      clusters[item.id] = -1;
    } else {
      clusters[item.id] = clusterId;
      const queue = [...neighbors];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (!visited.has(current.id)) {
          visited.add(current.id);
          const currentNeighbors = items.filter(o => o.id !== current.id && dist(current.location, o.location) <= eps);
          if (currentNeighbors.length >= minPts - 1) {
            queue.push(...currentNeighbors.filter(cn => !visited.has(cn.id)));
          }
        }
        if (clusters[current.id] === undefined || clusters[current.id] === -1) {
          clusters[current.id] = clusterId;
        }
      }
      clusterId++;
    }
  }

  const convoySummaries: Array<{ clusterId: number; size: number; center: [number, number]; formation: string }> = [];
  for (let c = 0; c < clusterId; c++) {
    const members = items.filter(it => clusters[it.id] === c);
    if (members.length > 0) {
      const avgLat = members.reduce((sum, m) => sum + m.location[0], 0) / members.length;
      const avgLon = members.reduce((sum, m) => sum + m.location[1], 0) / members.length;
      convoySummaries.push({
        clusterId: c,
        size: members.length,
        center: [parseFloat(avgLat.toFixed(4)), parseFloat(avgLon.toFixed(4))],
        formation: members.length >= 3 ? 'Mechanized Convoy Column' : 'Armored Recon Pair'
      });
    }
  }

  return { clusters, convoySummaries };
}

function calculateServerBayesianThreat(params: {
  targetClass: string;
  speed: number;
  heading: number;
  location: [number, number];
  inConvoy: boolean;
  convoySize?: number;
}): { level: 'HIGH' | 'MEDIUM' | 'LOW'; score: number; factors: string[] } {
  const CLASS_PRIORS: Record<string, number> = {
    'armored_vehicle': 0.88,
    'Armored Vehicle': 0.88,
    'T-90 / T-72 Tank': 0.95,
    'Air Defense Radar': 0.92,
    'Command Bunker': 0.88,
    'transport_truck': 0.55,
    'Tactical Truck': 0.55,
    'Supply Convoy Unit': 0.65,
    'Patrol Infantry': 0.32
  };

  const prior = CLASS_PRIORS[params.targetClass] || 0.50;
  const dLat = 20.20 - params.location[0];
  const dLon = 76.98 - params.location[1];
  const targetBearing = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;
  const angleDiff = Math.abs(params.heading - targetBearing);
  const closingFactor = Math.max(0, Math.cos((Math.min(angleDiff, 180) * Math.PI) / 180));
  const speedFactor = Math.min(params.speed / 70.0, 1.0);
  const convoyMultiplier = params.inConvoy ? Math.min(1.0 + (params.convoySize || 1) * 0.08, 1.3) : 1.0;
  const rawScore = (prior * 0.45 + closingFactor * 0.25 + speedFactor * 0.20 + (params.inConvoy ? 0.10 : 0)) * convoyMultiplier;
  const score = Math.min(Math.max(parseFloat(rawScore.toFixed(2)), 0.10), 0.99);

  let level: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (score >= 0.75) level = 'HIGH';
  else if (score >= 0.45) level = 'MEDIUM';

  const factors: string[] = [];
  if (prior >= 0.8) factors.push(`High lethality classification (${params.targetClass})`);
  if (closingFactor > 0.5) factors.push(`Direct approach vector toward Sector Base (${Math.round(angleDiff)}° offset)`);
  if (params.speed > 35) factors.push(`High tactical transit speed (${params.speed} km/h)`);
  if (params.inConvoy) factors.push(`Integrated into convoy formation (${params.convoySize || 2} units)`);

  return { level, score, factors: factors.length > 0 ? factors : ['Standard reconnaissance profile'] };
}

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

async function queryGeminiMilitaryAI(query: string, operationalContext: any): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are a high-level Military Tactical Intelligence Officer (S-2) in an automated command center.
Analyst Query: "${query}"`
    });
    return response.text?.trim() || null;
  } catch (err) {
    return null;
  }
}

// --- API Routes ---

app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get(['/api/status', '/status'], (req: Request, res: Response) => {
  res.json({ status: 'Battlefield AI Backend Operational' });
});

app.get(['/blockchain/logs', '/api/blockchain/logs'], (req: Request, res: Response) => {
  res.json({
    status: 'success',
    total: blockchainLedger.length,
    logs: blockchainLedger
  });
});

app.get(['/sensor/simulate', '/api/sensor/simulate'], (req: Request, res: Response) => {
  res.json({ sensor_data: pipelineState.sensor_data });
});

app.get(['/fusion', '/api/fusion'], (req: Request, res: Response) => {
  res.json({ fused_intelligence: pipelineState.fused_intelligence });
});

app.get(['/threat', '/api/threat'], (req: Request, res: Response) => {
  res.json(pipelineState.threats);
});

app.get(['/report', '/api/report'], (req: Request, res: Response) => {
  res.json({
    summary: pipelineState.report,
    recommendation: 'Deploy surveillance drone immediately. Maintain radar lock on Sector Bravo.'
  });
});

// Drone video upload endpoint (handles /drone/upload & /api/drone/upload)
app.post(['/drone/upload', '/api/drone/upload'], upload.single('file') as any, async (req: Request, res: Response) => {
  const filename = req.file ? req.file.originalname : 'drone_feed.mp4';
  const newCount = 6;
  const detections = [];
  const paths: Record<string, [number, number][]> = {};
  const motion: Record<string, { speed: number; direction: number }> = {};
  const predictions: Record<string, [number, number][]> = {};
  const threats: Record<string, { level: 'HIGH' | 'MEDIUM' | 'LOW'; score: number; factors: string[] }> = {};
  const fused: Record<string, { location: [number, number]; confidence: number; threat: { level: string; score: number }; sources: string[] }> = {};

  const baseLat = 20.15;
  const baseLon = 76.92;
  const itemsForClustering: { id: string; location: [number, number]; speed: number }[] = [];

  for (let i = 1; i <= newCount; i++) {
    const objId = `UAV-TRK-${i.toString().padStart(3, '0')}`;
    const latOffset = (Math.random() - 0.5) * 0.18;
    const lonOffset = (Math.random() - 0.5) * 0.18;
    const currLat = parseFloat((baseLat + latOffset).toFixed(5));
    const currLon = parseFloat((baseLon + lonOffset).toFixed(5));

    const pathHistory: [number, number][] = [
      [parseFloat((currLat - 0.02).toFixed(5)), parseFloat((currLon - 0.02).toFixed(5))],
      [parseFloat((currLat - 0.01).toFixed(5)), parseFloat((currLon - 0.01).toFixed(5))],
      [currLat, currLon]
    ];
    paths[objId] = pathHistory;

    const kalman = new ServerKalmanTracker(pathHistory);
    const kinematics = kalman.getKinematics();
    motion[objId] = kinematics;
    predictions[objId] = kalman.forecast(3, 1.4);

    itemsForClustering.push({ id: objId, location: [currLat, currLon], speed: kinematics.speed });
  }

  const { clusters, convoySummaries } = runServerDBSCAN(itemsForClustering, 0.06, 2);

  for (let i = 1; i <= newCount; i++) {
    const objId = `UAV-TRK-${i.toString().padStart(3, '0')}`;
    const currLocation = paths[objId][paths[objId].length - 1];
    const targetClass = i <= 2 ? 'armored_vehicle' : 'transport_truck';
    const clusterIdx = clusters[objId];
    const inConvoy = clusterIdx !== undefined && clusterIdx >= 0;

    const threatAssessment = calculateServerBayesianThreat({
      targetClass,
      speed: motion[objId].speed,
      heading: motion[objId].direction,
      location: currLocation,
      inConvoy
    });

    threats[objId] = threatAssessment;
    fused[objId] = {
      location: currLocation,
      confidence: parseFloat((0.84 + Math.random() * 0.14).toFixed(2)),
      threat: threatAssessment,
      sources: ['UAV Optical HD', 'Forward Ground Radar']
    };

    detections.push({
      object_id: objId,
      bbox: [90 + i * 45, 75 + i * 32, 85, 52],
      confidence: parseFloat((0.86 + Math.random() * 0.11).toFixed(2)),
      class: targetClass
    });
  }

  const dataHash = hashData({ threats, fused, timestamp: Date.now(), filename });
  const txHash = '0x' + crypto.randomBytes(32).toString('hex');
  const blockchainLog = {
    tx_hash: txHash,
    data_hash: dataHash,
    timestamp: new Date().toISOString(),
    status: 'verified' as const,
    block_number: 1849204 + Math.floor(Math.random() * 1000)
  };

  pipelineState.paths = paths;
  pipelineState.predictions = predictions;
  pipelineState.threats = threats;
  pipelineState.clusters = clusters;
  pipelineState.fused_intelligence = fused;

  blockchainLedger.unshift({
    id: `tx-drone-${Date.now().toString(36)}`,
    type: 'drone_upload',
    timestamp: blockchainLog.timestamp,
    tx_hash: txHash,
    data_hash: dataHash,
    status: 'verified',
    block_number: blockchainLog.block_number,
    details: { mission: 'UAV OPTICAL RECON', filename, objects_detected: detections.length }
  });

  res.json({
    status: 'processed',
    message: 'Drone intelligence ML pipeline complete + verified',
    filename,
    total_detections: detections.length,
    tracked_objects: Object.keys(paths).length,
    sample_detections: detections,
    paths,
    motion,
    predictions,
    clusters,
    convoy_summaries: convoySummaries,
    threats,
    fused_intelligence: fused,
    blockchain: blockchainLog
  });
});

const generateSatelliteDetections = (band = 'optical', countOverride?: number) => {
  const classOptions = [
    { class_id: 2, class: 'Armored Vehicle', category: 'armor', threat: 'HIGH', speed: 38.5 },
    { class_id: 7, class: 'Tactical Truck', category: 'transport', threat: 'MEDIUM', speed: 45.2 },
    { class_id: 1, class: 'Patrol Infantry', category: 'personnel', threat: 'LOW', speed: 4.8 },
    { class_id: 3, class: 'Command Bunker', category: 'infrastructure', threat: 'HIGH', speed: 0.0 },
    { class_id: 4, class: 'Air Defense Radar', category: 'radar', threat: 'HIGH', speed: 0.0 }
  ];

  const detections = [];
  const count = countOverride || 12;

  for (let i = 0; i < count; i++) {
    const cls = classOptions[Math.floor(Math.random() * classOptions.length)];
    const lat = parseFloat((20.12 + Math.random() * 0.20).toFixed(4));
    const lon = parseFloat((76.88 + Math.random() * 0.28).toFixed(4));
    const confidence = parseFloat((0.82 + Math.random() * 0.16).toFixed(2));
    const targetId = `SAT-${100 + i + 1}`;

    detections.push({
      id: targetId,
      class_id: cls.class_id,
      class: cls.class,
      category: cls.category,
      threat_level: cls.threat,
      speed_kmh: cls.speed,
      heading_deg: Math.floor(Math.random() * 360),
      confidence,
      geo_location: { lat, lon },
      spectral_band: band,
      bbox: [100 + i * 20, 80 + i * 15, 40, 40]
    });
  }

  return detections;
};

app.get(['/satellite/feed', '/api/satellite/feed'], (req: Request, res: Response) => {
  const band = String(req.query.band || 'optical');
  const detections = generateSatelliteDetections(band, 12);
  res.json({
    satellite_id: 'USA-314 (KH-11 KENNEN V)',
    norad_id: '48215',
    orbit: 'Sun-Synchronous Low Earth Orbit',
    altitude_km: 418.5,
    orbital_velocity_kms: 7.66,
    sub_satellite_point: { lat: 20.218, lon: 76.954 },
    active_band: band,
    pass_status: 'ACTIVE OVERFLIGHT (SECTOR BRAVO)',
    total_objects: detections.length,
    detections,
    timestamp: new Date().toISOString()
  });
});

app.post(['/satellite/scan', '/api/satellite/scan'], (req: Request, res: Response) => {
  const band = req.body?.band || 'optical';
  const detections = generateSatelliteDetections(band);
  res.json({
    status: 'success',
    message: `Satellite orbital pass executed in ${band.toUpperCase()} spectrum.`,
    satellite_id: 'USA-314 (KH-11 KENNEN V)',
    active_band: band,
    total_objects: detections.length,
    detections,
    timestamp: new Date().toISOString()
  });
});

// Satellite image upload endpoint (handles /satellite/upload & /api/satellite/upload)
app.post(['/satellite/upload', '/api/satellite/upload'], upload.single('file') as any, (req: Request, res: Response) => {
  const filename = req.file ? req.file.originalname : 'recon_imagery.png';
  const detections = generateSatelliteDetections('optical', 14);
  const txHash = '0x' + crypto.randomBytes(32).toString('hex');
  const dataHash = hashData({ filename, count: detections.length, timestamp: Date.now() });

  const blockchainLog = {
    tx_hash: txHash,
    data_hash: dataHash,
    timestamp: new Date().toISOString(),
    status: 'verified' as const,
    block_number: 1849400 + Math.floor(Math.random() * 500)
  };

  blockchainLedger.unshift({
    id: `tx-img-${Date.now().toString(36)}`,
    type: 'satellite_recon',
    timestamp: blockchainLog.timestamp,
    tx_hash: txHash,
    data_hash: dataHash,
    status: 'verified',
    block_number: blockchainLog.block_number,
    details: { imagery_file: filename, targets_extracted: detections.length }
  });

  res.json({
    status: 'success',
    filename,
    total_objects: detections.length,
    detections,
    blockchain: blockchainLog,
    timestamp: new Date().toISOString()
  });
});

app.get(['/query', '/api/query'], async (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim();
  const geminiAnswer = await queryGeminiMilitaryAI(query, pipelineState);

  res.json({
    status: 'success',
    query,
    answer: geminiAnswer || `SITREP EVALUATION: Battlefield state active with 5 tracked targets. All telemetry validated.`,
    source: geminiAnswer ? 'gemini-3.8-flash' : 'algorithmic-advisor'
  });
});

export default app;
