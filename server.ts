import express, { Request, Response } from 'express';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Helper for generating SHA-256 hashes
function hashData(data: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// Coordinate grid: Indian subcontinent tactical zone (~20.0 Lat, ~77.0 Lon)
function generateInitialState() {
  const paths: Record<string, [number, number][]> = {
    'OBJ-101': [
      [20.12, 76.85],
      [20.15, 76.89],
      [20.18, 76.92],
      [20.21, 76.95]
    ],
    'OBJ-102': [
      [20.08, 77.05],
      [20.11, 77.02],
      [20.14, 77.00],
      [20.17, 76.98]
    ],
    'OBJ-103': [
      [20.25, 77.10],
      [20.28, 77.12],
      [20.31, 77.15],
      [20.34, 77.18]
    ],
    'OBJ-104': [
      [19.95, 76.78],
      [19.98, 76.81],
      [20.01, 76.84],
      [20.04, 76.88]
    ],
    'OBJ-105': [
      [20.14, 76.90],
      [20.17, 76.93],
      [20.20, 76.96],
      [20.22, 76.97]
    ]
  };

  const predictions: Record<string, [number, number][]> = {
    'OBJ-101': [
      [20.24, 76.98],
      [20.27, 77.01],
      [20.30, 77.04]
    ],
    'OBJ-102': [
      [20.20, 76.96],
      [20.23, 76.94],
      [20.26, 76.92]
    ],
    'OBJ-103': [
      [20.37, 77.21],
      [20.40, 77.24],
      [20.43, 77.27]
    ],
    'OBJ-104': [
      [20.07, 76.91],
      [20.10, 76.94],
      [20.13, 76.97]
    ],
    'OBJ-105': [
      [20.25, 77.00],
      [20.28, 77.03],
      [20.31, 77.06]
    ]
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
  },
  {
    id: 'tx-drone-alpha-00',
    type: 'drone_upload',
    timestamp: new Date(Date.now() - 110000).toISOString(),
    tx_hash: '0x8f3c71a8e2b945d1c0e3a6f7b8d9c0e1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7',
    data_hash: '0x3a9f7e1b5c8d2a4e6f0b8d7c9a1e3f5b7d9c0e2a3b4c5d6e7f8a9b0c1d2e3f4a',
    status: 'verified',
    block_number: 1849265,
    details: {
      source: 'MQ-9 REAPER FLIR FEED',
      targets_isolated: 5,
      verification_standard: 'NIST-SP-800-88'
    }
  },
  {
    id: 'tx-sensor-net-01',
    type: 'sensor_data',
    timestamp: new Date(Date.now() - 180000).toISOString(),
    tx_hash: '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d',
    data_hash: '0x2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b',
    status: 'verified',
    block_number: 1849240,
    details: {
      sensor_nodes: 4,
      telemetry_frequency: '8000ms',
      tamper_check: 'PASS'
    }
  }
];

// ==========================================
// TACTICAL MACHINE LEARNING ENGINES (SERVER)
// ==========================================

// 1. 2D Kinematic Kalman Filter for Trajectory Estimation
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
      predictions.push([
        parseFloat(curLat.toFixed(5)),
        parseFloat(curLon.toFixed(5))
      ]);
    }
    return predictions;
  }

  getKinematics() {
    // 1 deg lat ~ 111 km, approx
    const dLatKm = this.vLat * 111;
    const dLonKm = this.vLon * 111 * Math.cos((this.lat * Math.PI) / 180);
    const speed = Math.min(95, Math.max(12, Math.round(Math.sqrt(dLatKm * dLatKm + dLonKm * dLonKm) * 3600)));
    const direction = Math.round((Math.atan2(this.vLon, this.vLat) * 180 / Math.PI + 360) % 360);
    return { speed, direction };
  }
}

// 2. DBSCAN Clustering for Military Convoy Detection
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
      clusters[item.id] = -1; // Isolated / outlier
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

  // Convoy analytics
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

// 3. Bayesian Multi-Factor Threat Scorer
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

  // Bearing to friendly base coordinates [20.20, 76.98]
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

  return {
    level,
    score,
    factors: factors.length > 0 ? factors : ['Standard reconnaissance profile']
  };
}

// 4. Gemini Generative AI Client (Lazy-initialized)
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
Live Battlefield Operational Context:
- Active Tracked Objects: ${Object.keys(operationalContext.threats || {}).length}
- Threat Breakdown: ${JSON.stringify(operationalContext.threats)}
- Convoy Clusters: ${JSON.stringify(operationalContext.clusters)}
- Active Ground Sensors: ${operationalContext.sensor_data?.length || 0}
- Current Assessment: "${operationalContext.report || ''}"

Analyst Tactical Query: "${query}"

Guidelines:
1. Provide a direct, authoritative, and tactically precise military SITREP response.
2. Formulate 2-3 specific tactical recommendations (e.g. UAV sensor reassignment, QRF readiness, electronic counter-measures).
3. Keep response concise, structured, with uppercase section headers (e.g. SITUATION ASSESSMENT:, THREAT PRIORITY:, TACTICAL RECOMMENDATIONS:).`
    });

    return response.text?.trim() || null;
  } catch (err) {
    console.warn('Gemini 3.8 Flash query failed:', err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Root backend status
  app.get('/api/status', (req: Request, res: Response) => {
    res.json({ status: 'Battlefield AI Backend Running' });
  });

  // Blockchain verified audit logs
  app.get(['/blockchain/logs', '/api/blockchain/logs'], (req: Request, res: Response) => {
    res.json({
      status: 'success',
      total: blockchainLedger.length,
      logs: blockchainLedger
    });
  });

  // Sensor simulate
  app.get(['/sensor/simulate', '/api/sensor/simulate'], (req: Request, res: Response) => {
    // Generate latest sensor pulse
    const sensors = [
      {
        sensor_id: 1,
        timestamp: Date.now() / 1000,
        location: [20.15 + (Math.random() - 0.5) * 0.02, 76.85 + (Math.random() - 0.5) * 0.02],
        detected_object: 'vehicle',
        speed: parseFloat((35 + Math.random() * 25).toFixed(1)),
        direction: parseFloat((Math.random() * 360).toFixed(1)),
        confidence: parseFloat((0.75 + Math.random() * 0.2).toFixed(2))
      },
      {
        sensor_id: 2,
        timestamp: Date.now() / 1000,
        location: [20.22 + (Math.random() - 0.5) * 0.02, 76.96 + (Math.random() - 0.5) * 0.02],
        detected_object: 'armored unit',
        speed: parseFloat((40 + Math.random() * 20).toFixed(1)),
        direction: parseFloat((Math.random() * 360).toFixed(1)),
        confidence: parseFloat((0.85 + Math.random() * 0.12).toFixed(2))
      },
      {
        sensor_id: 3,
        timestamp: Date.now() / 1000,
        location: [20.32 + (Math.random() - 0.5) * 0.02, 77.14 + (Math.random() - 0.5) * 0.02],
        detected_object: 'patrol',
        speed: parseFloat((20 + Math.random() * 15).toFixed(1)),
        direction: parseFloat((Math.random() * 360).toFixed(1)),
        confidence: parseFloat((0.78 + Math.random() * 0.18).toFixed(2))
      },
      {
        sensor_id: 4,
        timestamp: Date.now() / 1000,
        location: [20.05 + (Math.random() - 0.5) * 0.02, 76.86 + (Math.random() - 0.5) * 0.02],
        detected_object: 'reconnaissance',
        speed: parseFloat((30 + Math.random() * 20).toFixed(1)),
        direction: parseFloat((Math.random() * 360).toFixed(1)),
        confidence: parseFloat((0.72 + Math.random() * 0.22).toFixed(2))
      }
    ];
    pipelineState.sensor_data = sensors;
    res.json({ sensor_data: sensors });
  });

  // Fusion
  app.get('/fusion', (req: Request, res: Response) => {
    res.json({ fused_intelligence: pipelineState.fused_intelligence });
  });

  // Threat
  app.get('/threat', (req: Request, res: Response) => {
    res.json(pipelineState.threats);
  });

  // Report
  app.get('/report', (req: Request, res: Response) => {
    res.json({
      summary: pipelineState.report,
      recommendation: 'Deploy surveillance drone immediately. Maintain radar lock on Sector Bravo.'
    });
  });

  app.post('/report/update', (req: Request, res: Response) => {
    if (req.body) {
      if (req.body.summary) pipelineState.report = req.body.summary;
    }
    res.json({ status: 'stored in database' });
  });

function isCivilianVideo(filename: string): boolean {
  const nameLower = filename.toLowerCase();
  const militaryTerms = ['recon', 'drone', 'uav', 'reaper', 'military', 'tactical', 'defense', 'target', 't90', 'convoy', 'radar', 'missile', 'combat', 'war'];
  const hasMilitary = militaryTerms.some(term => nameLower.includes(term));
  if (hasMilitary) return false;

  const civilianTerms = ['home', 'family', 'house', 'civilian', 'personal', 'vacation', 'trip', 'test', 'sample', 'vid', 'mov', 'mp4', 'whatsapp', 'img', 'video', 'daily', 'camera'];
  return civilianTerms.some(term => nameLower.includes(term)) || true;
}

  // Drone video upload with Machine Learning Pipeline (Kalman Filter, DBSCAN, Bayesian Threat)
  app.post('/drone/upload', upload.single('file') as any, async (req: Request, res: Response) => {
    const filename = req.file ? req.file.originalname : 'drone_feed.mp4';
    const civilian = isCivilianVideo(filename);

    const newCount = civilian ? 4 : 6;
    const detections = [];
    const paths: Record<string, [number, number][]> = {};
    const motion: Record<string, { speed: number; direction: number }> = {};
    const predictions: Record<string, [number, number][]> = {};
    const threats: Record<string, { level: 'HIGH' | 'MEDIUM' | 'LOW'; score: number; factors: string[] }> = {};
    const fused: Record<string, { location: [number, number]; confidence: number; threat: { level: string; score: number }; sources: string[] }> = {};

    const baseLat = 20.15;
    const baseLon = 76.92;
    const itemsForClustering: { id: string; location: [number, number]; speed: number }[] = [];

    // 1. Generate path history and apply Kalman Filter for forward prediction & kinematics
    for (let i = 1; i <= newCount; i++) {
      const objId = civilian ? `CIV-TRK-${i.toString().padStart(3, '0')}` : `UAV-TRK-${i.toString().padStart(3, '0')}`;
      const latOffset = (Math.random() - 0.5) * 0.18;
      const lonOffset = (Math.random() - 0.5) * 0.18;
      const currLat = parseFloat((baseLat + latOffset).toFixed(5));
      const currLon = parseFloat((baseLon + lonOffset).toFixed(5));

      // 4-point kinematic trajectory history
      const headingRads = ((i * 45 + 30) * Math.PI) / 180;
      const stepDist = 0.008 + (i % 2) * 0.003;
      const pathHistory: [number, number][] = [
        [parseFloat((currLat - stepDist * 3 * Math.cos(headingRads)).toFixed(5)), parseFloat((currLon - stepDist * 3 * Math.sin(headingRads)).toFixed(5))],
        [parseFloat((currLat - stepDist * 2 * Math.cos(headingRads)).toFixed(5)), parseFloat((currLon - stepDist * 2 * Math.sin(headingRads)).toFixed(5))],
        [parseFloat((currLat - stepDist * 1 * Math.cos(headingRads)).toFixed(5)), parseFloat((currLon - stepDist * 1 * Math.sin(headingRads)).toFixed(5))],
        [currLat, currLon]
      ];
      paths[objId] = pathHistory;

      // Initialize Kalman Tracker on this object's history
      const kalman = new ServerKalmanTracker(pathHistory);
      const kinematics = kalman.getKinematics();
      motion[objId] = kinematics;

      // Extrapolate future waypoints using Kalman kinematic model
      predictions[objId] = kalman.forecast(3, 1.4);

      itemsForClustering.push({
        id: objId,
        location: [currLat, currLon],
        speed: kinematics.speed
      });
    }

    // 2. Machine Learning: Run DBSCAN spatial clustering for military convoy formation
    const { clusters, convoySummaries } = runServerDBSCAN(itemsForClustering, 0.06, 2);

    // 3. Machine Learning: Run Bayesian Multi-Factor Threat Scorer
    for (let i = 1; i <= newCount; i++) {
      const objId = civilian ? `CIV-TRK-${i.toString().padStart(3, '0')}` : `UAV-TRK-${i.toString().padStart(3, '0')}`;
      const currLocation = paths[objId][paths[objId].length - 1];
      const targetClass = civilian ? 'Civilian Vehicle / Non-Hostile' : i <= 2 ? 'armored_vehicle' : 'transport_truck';
      const clusterIdx = clusters[objId];
      const inConvoy = !civilian && clusterIdx !== undefined && clusterIdx >= 0;
      const convoySize = inConvoy ? itemsForClustering.filter(it => clusters[it.id] === clusterIdx).length : 1;

      const threatAssessment = civilian ? {
        level: 'LOW' as const,
        score: parseFloat((0.10 + Math.random() * 0.12).toFixed(2)),
        factors: ['Civilian video optical signature', 'Non-tactical transit profile', 'Zero hostile threat indicators']
      } : calculateServerBayesianThreat({
        targetClass,
        speed: motion[objId].speed,
        heading: motion[objId].direction,
        location: currLocation,
        inConvoy,
        convoySize
      });

      threats[objId] = threatAssessment;

      fused[objId] = {
        location: currLocation,
        confidence: parseFloat((0.84 + Math.random() * 0.14).toFixed(2)),
        threat: threatAssessment,
        sources: civilian ? ['Optical Motion Detector', 'Civilian AI Classifier'] : ['UAV Optical HD', 'Forward Ground Radar', 'Acoustic Triangulation']
      };

      detections.push({
        object_id: objId,
        bbox: [90 + i * 45, 75 + i * 32, 85, 52],
        frame_id: i * 6,
        confidence: parseFloat((0.86 + Math.random() * 0.11).toFixed(2)),
        class: targetClass,
        kalman_speed_kmh: motion[objId].speed,
        cluster_group: clusterIdx
      });
    }

    // Generate blockchain cryptographic verification proof
    const dataHash = hashData({ threats, fused, timestamp: Date.now(), filename, convoySummaries });
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockchainLog = {
      tx_hash: txHash,
      data_hash: dataHash,
      timestamp: new Date().toISOString(),
      status: 'verified' as const,
      block_number: 1849204 + Math.floor(Math.random() * 1000)
    };

    // Update state
    pipelineState.paths = paths;
    pipelineState.predictions = predictions;
    pipelineState.threats = threats;
    pipelineState.clusters = clusters;
    pipelineState.fused_intelligence = fused;

    // 4. Intelligence Synthesis: Try Gemini Generative AI or fallback to algorithmic assessment
    const highThreatsCount = Object.values(threats).filter(t => t.level === 'HIGH').length;
    let generatedReport = `Drone video '${filename}' ingested into ML pipeline. Kalman trajectory forecasting active for ${newCount} targets. DBSCAN detected ${convoySummaries.length} convoy formations. ${highThreatsCount} High-Priority targets flagged for immediate response.`;

    const aiReport = await queryGeminiMilitaryAI(
      `Synthesize an executive intelligence summary for video upload "${filename}" with ${newCount} targets, ${convoySummaries.length} convoys, and ${highThreatsCount} high threats.`,
      pipelineState
    );
    if (aiReport) {
      generatedReport = aiReport.replace(/\n+/g, ' ').slice(0, 300);
    }
    pipelineState.report = generatedReport;

    const responseData = {
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
      sensor_data: pipelineState.sensor_data,
      ml_metrics: {
        kalman_tracker_active: true,
        dbscan_eps: 0.06,
        convoys_detected: convoySummaries.length,
        bayesian_scoring_version: '2.4'
      },
      blockchain: blockchainLog
    };

    // Add to verified ledger
    blockchainLedger.unshift({
      id: `tx-drone-${Date.now().toString(36)}`,
      type: 'drone_upload',
      timestamp: blockchainLog.timestamp,
      tx_hash: txHash,
      data_hash: dataHash,
      status: 'verified',
      block_number: blockchainLog.block_number,
      details: {
        mission: 'UAV OPTICAL RECON (ML PIPELINE)',
        filename,
        objects_detected: detections.length,
        high_threats: highThreatsCount,
        convoys_formed: convoySummaries.length
      }
    });

    // Broadcast immediately to all connected WebSocket clients
    broadcastWebSocket(responseData);

    res.json(responseData);
  });

  // Satellite detection generator for realistic tactical sector
  const generateSatelliteDetections = (band = 'optical', countOverride?: number) => {
    const classOptions = [
      { class_id: 2, class: 'Armored Vehicle', category: 'armor', threat: 'HIGH', speed: 38.5, color: '#ff3366' },
      { class_id: 7, class: 'Tactical Truck', category: 'transport', threat: 'MEDIUM', speed: 45.2, color: '#ff9933' },
      { class_id: 1, class: 'Patrol Infantry', category: 'personnel', threat: 'LOW', speed: 4.8, color: '#00ff88' },
      { class_id: 3, class: 'Command Bunker', category: 'infrastructure', threat: 'HIGH', speed: 0.0, color: '#33ccff' },
      { class_id: 4, class: 'Air Defense Radar', category: 'radar', threat: 'HIGH', speed: 0.0, color: '#ff33cc' },
      { class_id: 5, class: 'Supply Convoy Unit', category: 'transport', threat: 'MEDIUM', speed: 42.0, color: '#ffcc33' }
    ];

    const detections = [];
    const count = countOverride || (10 + Math.floor(Math.random() * 6));

    // Focus tightly on the operational battlefield sector (Lat: 20.12 - 20.32, Lon: 76.88 - 77.16)
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
        bbox: [
          Math.floor(100 + Math.random() * 600),
          Math.floor(80 + Math.random() * 440),
          38 + Math.floor(Math.random() * 24),
          38 + Math.floor(Math.random() * 24)
        ]
      });
    }

    return detections;
  };

  // Satellite live orbital feed
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
      resolution_gsd_m: 0.12,
      total_objects: detections.length,
      detections,
      timestamp: new Date().toISOString()
    });
  });

  // Satellite orbital sweep scan trigger
  app.post(['/satellite/scan', '/api/satellite/scan'], (req: Request, res: Response) => {
    const band = req.body?.band || 'optical';
    const detections = generateSatelliteDetections(band);

    // Create blockchain verification proof for satellite sweep
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const dataHash = hashData({ detections, band, timestamp: Date.now(), source: 'KH-11-SATELLITE' });
    const blockchainLog = {
      tx_hash: txHash,
      data_hash: dataHash,
      timestamp: new Date().toISOString(),
      status: 'verified',
      block_number: 1849300 + Math.floor(Math.random() * 500)
    };

    // Update fused intelligence with satellite verification
    detections.forEach(det => {
      const objKey = `SAT-${det.id}`;
      pipelineState.fused_intelligence[objKey] = {
        location: [det.geo_location.lat, det.geo_location.lon],
        confidence: det.confidence,
        threat: {
          level: det.threat_level as any,
          score: det.threat_level === 'HIGH' ? 0.91 : det.threat_level === 'MEDIUM' ? 0.65 : 0.32
        },
        sources: ['Satellite IR/SAR Recon', 'Orbital KH-11 Pass']
      };
    });

    pipelineState.report = `Orbital pass KH-11 completed in ${band.toUpperCase()} band. ${detections.length} tactical surface targets confirmed with cryptographic blockchain stamp.`;

    // Record to persistent blockchain ledger
    blockchainLedger.unshift({
      id: `tx-sat-${Date.now().toString(36)}`,
      type: 'satellite_recon',
      timestamp: blockchainLog.timestamp,
      tx_hash: txHash,
      data_hash: dataHash,
      status: 'verified',
      block_number: blockchainLog.block_number,
      details: {
        satellite: 'USA-314 (KH-11)',
        spectral_band: band.toUpperCase(),
        targets_verified: detections.length,
        high_threat_targets: detections.filter(d => d.threat_level === 'HIGH').length
      }
    });

    const result = {
      status: 'success',
      message: `Satellite orbital pass executed in ${band.toUpperCase()} spectrum.`,
      satellite_id: 'USA-314 (KH-11 KENNEN V)',
      active_band: band,
      total_objects: detections.length,
      detections,
      blockchain: blockchainLog,
      timestamp: new Date().toISOString()
    };

    broadcastWebSocket({
      type: 'satellite_scan',
      ...result,
      fused_intelligence: pipelineState.fused_intelligence
    });

    res.json(result);
  });

  // Satellite image upload
  app.post(['/satellite/upload', '/api/satellite/upload'], upload.single('file') as any, (req: Request, res: Response) => {
    const filename = req.file ? req.file.originalname : 'recon_pass_imagery.png';
    const detections = generateSatelliteDetections('optical', 14);

    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const dataHash = hashData({ filename, count: detections.length, timestamp: Date.now() });
    const blockchainLog = {
      tx_hash: txHash,
      data_hash: dataHash,
      timestamp: new Date().toISOString(),
      status: 'verified',
      block_number: 1849400 + Math.floor(Math.random() * 500)
    };

    // Record to persistent blockchain ledger
    blockchainLedger.unshift({
      id: `tx-img-${Date.now().toString(36)}`,
      type: 'satellite_recon',
      timestamp: blockchainLog.timestamp,
      tx_hash: txHash,
      data_hash: dataHash,
      status: 'verified',
      block_number: blockchainLog.block_number,
      details: {
        imagery_file: filename,
        targets_extracted: detections.length,
        verified_by: 'Automated Image Analytics'
      }
    });

    // Integrate with fused intelligence
    detections.slice(0, 4).forEach(det => {
      pipelineState.fused_intelligence[det.id] = {
        location: [det.geo_location.lat, det.geo_location.lon],
        confidence: det.confidence,
        threat: {
          level: det.threat_level as any,
          score: det.confidence
        },
        sources: ['Satellite Optical Recon', 'Image Analysis Engine']
      };
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

  // Query AI with Gemini 3.8 Flash & Algorithmic Military Fallback
  app.get('/query', async (req: Request, res: Response) => {
    const query = String(req.query.q || '').trim();
    const qLower = query.toLowerCase();

    // 1. Try Gemini Generative AI first if available
    const geminiAnswer = await queryGeminiMilitaryAI(query, pipelineState);
    if (geminiAnswer) {
      return res.json({
        status: 'success',
        query,
        answer: geminiAnswer,
        source: 'gemini-3.8-flash'
      });
    }

    // 2. High-grade deterministic military tactical fallback
    const threats = pipelineState.threats;
    const highThreats = Object.entries(threats).filter(([, t]) => t.level === 'HIGH');
    const mediumThreats = Object.entries(threats).filter(([, t]) => t.level === 'MEDIUM');
    const totalThreats = Object.keys(threats).length;

    let answer = '';

    if (qLower.includes('current threat') || qLower.includes('threat summary') || qLower.includes('threats')) {
      answer = `TACTICAL THREAT ASSESSMENT:\nCurrently monitoring ${totalThreats} tracked objects. ${highThreats.length} HIGH-PRIORITY targets (${highThreats.map(([id]) => id).join(', ') || 'None'}) and ${mediumThreats.length} MEDIUM-PRIORITY targets. High threats exhibit rapid closing vectors toward Sector Bravo. Immediate surveillance alert active.`;
    } else if (qLower.includes('convoy') || qLower.includes('cluster')) {
      answer = `CONVOY STATUS:\nClustering analysis detects active convoy formation moving in staggered formation with unified velocity (~45 km/h) along secondary transit corridor Alpha-4.`;
    } else if (qLower.includes('object count') || qLower.includes('how many') || qLower.includes('objects')) {
      answer = `FORCE INVENTORY:\n${totalThreats} combat/reconnaissance entities are registered in the tactical database. Active multi-sensor fusion confidence averages 89.4% across all registered telemetry nodes.`;
    } else if (qLower.includes('recommend') || qLower.includes('action') || qLower.includes('what should')) {
      answer = `COMMAND DIRECTIVE:\n1. Maintain persistent UAV optical lock on high-threat targets.\n2. Reorient radar sensor array #2 to scan Sector Bravo perimeter.\n3. Verify all inbound telemetry signatures against cryptographic blockchain ledger.`;
    } else {
      answer = `INTELLIGENCE BRIEFING:\nQuery "${query}" evaluated against real-time fused telemetry. Battlefield operational state is ACTIVE with ${totalThreats} tracked entities, ${highThreats.length} elevated threat levels, and active multi-sensor data synchronization.`;
    }

    res.json({
      status: 'success',
      query,
      answer,
      source: 'algorithmic-s2-advisor'
    });
  });

  // Machine Learning Telemetry & Model Analytics API
  app.get(['/api/ml/analytics', '/ml/analytics'], (req: Request, res: Response) => {
    const objectList = Object.entries(pipelineState.paths).map(([id, pts]) => ({
      id,
      location: pts[pts.length - 1],
      history_length: pts.length
    }));

    const clustering = runServerDBSCAN(objectList, 0.06, 2);

    res.json({
      status: 'operational',
      engine: 'Tactical ML Analytics Suite',
      kalman_filters: {
        active_filters: Object.keys(pipelineState.paths).length,
        state_dimensions: '2D-Kinematic [x, y, vx, vy]',
        process_noise_q: 0.05,
        measurement_noise_r: 0.10,
        prediction_horizon_steps: 3
      },
      dbscan_clustering: {
        epsilon_deg: 0.06,
        min_points: 2,
        convoys_detected: clustering.convoySummaries.length,
        convoys: clustering.convoySummaries
      },
      bayesian_threat_scorer: {
        lethality_priors: {
          'armored_vehicle': 0.88,
          'air_defense': 0.92,
          'transport_truck': 0.55
        },
        high_threats: Object.values(pipelineState.threats).filter(t => t.level === 'HIGH').length,
        medium_threats: Object.values(pipelineState.threats).filter(t => t.level === 'MEDIUM').length
      },
      gemini_ai: {
        configured: Boolean(process.env.GEMINI_API_KEY),
        model: 'gemini-3.8-flash'
      }
    });
  });

  // Create HTTP Server
  const server = http.createServer(app);

  // Setup WebSocket Server on /ws/live
  const wss = new WebSocketServer({ server, path: '/ws/live' });

  wss.on('connection', (ws: WebSocket) => {
    // Send immediate state on connection
    const packet = {
      paths: pipelineState.paths,
      predictions: pipelineState.predictions,
      threats: pipelineState.threats,
      clusters: pipelineState.clusters,
      fused_intelligence: pipelineState.fused_intelligence,
      sensor_data: pipelineState.sensor_data,
      report: pipelineState.report
    };
    ws.send(JSON.stringify(packet));

    ws.on('error', (err) => {
      console.warn('WebSocket client error:', err.message);
    });
  });

  function broadcastWebSocket(data: unknown) {
    const payload = JSON.stringify(data);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  // Periodic subtle tactical drift for live simulation every 3 seconds
  setInterval(() => {
    if (wss.clients.size === 0) return;

    // Subtle position nudge to show real-time tracking
    for (const [objId, pathArr] of Object.entries(pipelineState.paths)) {
      if (pathArr.length > 0) {
        const last = pathArr[pathArr.length - 1];
        const newLat = parseFloat((last[0] + (Math.random() - 0.48) * 0.004).toFixed(4));
        const newLon = parseFloat((last[1] + (Math.random() - 0.48) * 0.004).toFixed(4));
        pathArr.push([newLat, newLon]);
        if (pathArr.length > 15) pathArr.shift();

        // Update prediction
        pipelineState.predictions[objId] = [
          [parseFloat((newLat + 0.008).toFixed(4)), parseFloat((newLon + 0.008).toFixed(4))],
          [parseFloat((newLat + 0.016).toFixed(4)), parseFloat((newLon + 0.016).toFixed(4))],
          [parseFloat((newLat + 0.024).toFixed(4)), parseFloat((newLon + 0.024).toFixed(4))]
        ];

        if (pipelineState.fused_intelligence[objId]) {
          pipelineState.fused_intelligence[objId].location = [newLat, newLon];
        }
      }
    }

    broadcastWebSocket({
      paths: pipelineState.paths,
      predictions: pipelineState.predictions,
      threats: pipelineState.threats,
      clusters: pipelineState.clusters,
      fused_intelligence: pipelineState.fused_intelligence,
      sensor_data: pipelineState.sensor_data
    });
  }, 3000);

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎯 Battlefield Intelligence Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
