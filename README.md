<<<<<<< HEAD
# 🎯 Battlefield AI Intelligence System

> **Real-Time Tactical Surveillance, Multi-Sensor Fusion, Kinematic ML Forecasting & Blockchain-Verified Defense Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.1-purple.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black.svg)](https://vercel.com/)

---

## 📌 Problem Statement

Modern defense operations and tactical command centers face critical vulnerabilities in real-time situational awareness:
1. **Data Silos**: Video feeds, satellite imagery, radar pulses, and ground acoustic/seismic sensors operate independently without unified data fusion.
2. **Target Tracking Jitter & Noise**: Raw camera feeds suffer from optical noise, occlusion, and velocity fluctuations.
3. **Convoy Identification Delay**: Manual operators struggle to rapidly identify organized tactical convoys versus isolated vehicles.
4. **Data Spoofing & Tampering**: Lack of immutable cryptographic verifiability exposes battlefield intelligence to manipulation or unauthorized alterations.

---

## 💡 The Solution

The **Battlefield AI Intelligence System** is an end-to-end tactical command platform that unifies real-time UAV video feeds, multi-spectral orbital satellite reconnaissance, and ground sensor data into a single situational dashboard. 

The platform applies **2D Kinematic Kalman Filtering** for forward path extrapolation, **DBSCAN Spatial Clustering** for automatic convoy detection, **Bayesian Multi-Factor Threat Scoring**, **Gemini 3.8 Flash Generative AI** for S-2 tactical briefings, and a **Proof-of-Authority (PoA) Blockchain Ledger** for tamper-proof audit verification.

---

## ⭐ Unique Features & Value Proposition

* 🎯 **2D Kinematic Kalman Path Forecasting**: Predicts target waypoints 45 seconds ahead to anticipate hostile movements before engagement.
* 🛡️ **Smart Civilian vs. Tactical Video Classification**: Automatically distinguishes home/civilian video uploads from military target profiles, categorizing non-combatant footage as `LOW THREAT`.
* 🛸 **Multi-Spectral Satellite Reconnaissance**: Real-time overflight monitoring across Visual RGB, Thermal FLIR, SAR Radar, and Night-Ops spectra.
* 🌐 **Interactive D3 Intelligence Network Graph**: Visualizes sensor cluster hubs, convoy connections, and node telemetry in real-time.
* 🔒 **Cryptographic Blockchain Audit Ledger**: Every video upload, satellite sweep, and threat fusion result is hashed with SHA-256 and signed on a PoA blockchain.
* 🧠 **Gemini 3.8 Flash S-2 Tactical Assistant**: Natural language military SITREP synthesis and strategic recommendations.

---

## 🏗️ System Architecture

```
                                +-----------------------------------+
                                |   TACTICAL DATA INGESTION ENGINE  |
                                |  UAV Feeds | Satellite | Sensors  |
                                +-----------------+-----------------+
                                                  |
                                                  v
                                +-----------------+-----------------+
                                |  TACTICAL MACHINE LEARNING PIPELINE|
                                |  - 2D Kalman Kinematic Tracker    |
                                |  - DBSCAN Convoy Detection         |
                                |  - Bayesian Threat Scorer          |
                                +-----------------+-----------------+
                                                  |
                                +-----------------+-----------------+
                                |                                   |
                                v                                   v
                +---------------+---------------+   +---------------+---------------+
                |   BLOCKCHAIN VERIFICATION     |   |   GEMINI 3.8 FLASH S-2 AI     |
                |   SHA-256 PoA Audit Ledger    |   |   SITREP & Tactical Advisory  |
                +---------------+---------------+   +---------------+---------------+
                                |                                   |
                                +-----------------+-----------------+
                                                  |
                                                  v
                                +-----------------+-----------------+
                                |  REAL-TIME DASHBOARD (REACT 19)   |
                                | Leaflet Maps | D3 Graph | HUD Modals|
                                +-----------------------------------+
=======
 Battlefield AI Intelligence System

Real-Time Tactical Surveillance, Multi-Sensor Fusion, Kinematic ML Forecasting & Blockchain-Verified Defense Platform

 1. Overview

The Battlefield AI Intelligence System is an end-to-end tactical intelligence platform designed to unify multiple surveillance and sensor sources into a centralized situational-awareness dashboard.

The system combines UAV video feeds, satellite reconnaissance, and ground sensor data with machine learning, geospatial analysis, generative AI, and cryptographic verification.

The platform is designed to demonstrate how heterogeneous battlefield intelligence can be processed, analyzed, verified, and presented through a unified command interface.

---

 2. Problem Statement

Modern defense operations and tactical command centers face several challenges in real-time situational awareness:

 2.1 Data Silos

Video feeds, satellite imagery, radar signals, and ground acoustic/seismic sensors often operate independently, making it difficult to obtain a unified operational picture.

 2.2 Target Tracking Noise

Raw surveillance feeds can contain optical noise, occlusion, inaccurate detections, and velocity fluctuations, making consistent target tracking difficult.

 2.3 Convoy Identification Delay

Manual monitoring makes it difficult for operators to rapidly distinguish organized groups of vehicles from isolated targets.

 2.4 Data Spoofing and Tampering

Sensitive intelligence data requires mechanisms for verifying its authenticity and detecting unauthorized modifications.

---

 3. Proposed Solution

The Battlefield AI Intelligence System provides a unified tactical intelligence platform that processes multiple sources of surveillance data through a centralized pipeline.

The system incorporates:

 UAV video-feed ingestion
 Multi-spectral satellite reconnaissance
 Ground sensor data integration
 2D Kinematic Kalman Filtering
 DBSCAN spatial clustering
 Bayesian multi-factor threat scoring
 Generative AI-based intelligence summarization
 Cryptographic audit verification
 Real-time geospatial visualization

The processed intelligence is presented through a real-time dashboard designed for tactical monitoring and situational awareness.

---

 4. Key Features

 4.1 2D Kinematic Kalman Path Forecasting

The system applies a 2D Kinematic Kalman Filter to smooth noisy target trajectories and estimate future positions.

The state vector is represented as:

$$
X_t = [x, y, v_x, v_y]^T
$$

The transition matrix is:

$$
F =
\begin{bmatrix}
1 & 0 & \Delta t & 0 \\
0 & 1 & 0 & \Delta t \\
0 & 0 & 1 & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

The system uses the estimated state to extrapolate future waypoints and visualize predicted movement trajectories.

 4.2 Automated Convoy Detection

DBSCAN clustering is used to identify spatially grouped vehicles or entities.

The system calculates spatial distance between detected targets and groups nearby entities into clusters.

Parameters:

 `epsilon = 0.05°`
 `MinPts = 2`

Entities assigned to:

 `Cluster >= 0` are considered part of a spatial cluster.
 `Cluster = -1` are treated as noise or isolated entities.

 4.3 Multi-Factor Threat Scoring

The platform combines multiple target attributes into a configurable threat score.

The current scoring model is:

$$
Score =
(Prior \times 0.45 +
ClosingVector \times 0.25 +
Speed \times 0.20 +
ConvoyBonus)
\times ConvoyMultiplier
$$

Threat categories:

| Score         | Classification        |
| ------------- | --------------------- |
| `>= 0.75`     | High Threat           |
| `0.45 - 0.74` | Medium Threat         |
| `< 0.45`      | Low Threat / Civilian |

 4.4 Multi-Spectral Reconnaissance

The system is designed to represent multiple satellite observation modes, including:

 RGB / Visual
 Thermal / FLIR
 SAR / Radar
 Night-operations imagery

These sources can be integrated into the intelligence dashboard for comparative analysis.

 4.5 Video Classification

The system provides automated classification of uploaded video content into predefined categories.

Non-target or civilian footage can be classified as low-threat data for prioritization purposes.

 4.6 Intelligence Network Visualization

An interactive D3.js force-directed graph represents relationships between:

 Sensor nodes
 Target clusters
 Convoys
 Intelligence sources
 Telemetry nodes

This provides a visual representation of the relationships between detected entities and data sources.

 4.7 Cryptographic Audit Ledger

Important intelligence events can be hashed using SHA-256 to provide integrity verification.

The ledger can record events such as:

 Video uploads
 Satellite observations
 Sensor events
 Target detections
 Threat-analysis results
 Intelligence reports

The Proof-of-Authority (PoA) model is used to represent an authorized verification mechanism for the audit ledger.

 4.8 AI Intelligence Assistant

The system integrates a generative AI assistant for converting processed intelligence into structured situation reports (SITREPs).

The assistant can help summarize:

 Detected entities
 Sensor observations
 Cluster information
 Movement trends
 Threat scores
 Historical events

---

 5. System Architecture

```text
+------------------------------------------------------+
|              TACTICAL DATA INGESTION ENGINE          |
|                                                      |
|       UAV Feeds | Satellite | Ground Sensors         |
+-------------------------------+----------------------+
                                |
                                v
+------------------------------------------------------+
|             TACTICAL ML PROCESSING PIPELINE         |
|                                                      |
|  Kalman Tracking | DBSCAN Clustering | Threat Score |
+-------------------------------+----------------------+
                                |
                +---------------+---------------+
                |                               |
                v                               v
+---------------------------+       +---------------------------+
| BLOCKCHAIN VERIFICATION   |       | GENERATIVE AI ENGINE      |
|                           |       |                           |
| SHA-256 Audit Ledger      |       | SITREP Generation        |
| PoA Verification          |       | Intelligence Summary     |
+-------------+-------------+       +-------------+-------------+
              |                                   |
              +----------------+------------------+
                               |
                               v
+------------------------------------------------------+
|              REAL-TIME INTELLIGENCE DASHBOARD        |
|                                                      |
|  React | Leaflet | D3.js | Recharts | HUD Interface |
+------------------------------------------------------+
>>>>>>> ce36a3b55ef7a3022b7e059e571b138aba0441b8
```

---

<<<<<<< HEAD
## 🧠 Machine Learning Algorithms & Mathematical Foundations

### 1. 2D Kinematic Kalman Filter
State representation $X_t = [x, y, v_x, v_y]^T$ with transition matrix $F$:

$$F = \begin{bmatrix} 1 & 0 & \Delta t & 0 \\ 0 & 1 & 0 & \Delta t \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \end{bmatrix}$$

Smoothing noisy track points and predicting future waypoints:

$$\hat{X}_{k|k-1} = F_k \hat{X}_{k-1|k-1}$$

---

### 2. DBSCAN Spatial Convoy Clustering
Calculates pairwise euclidean distance $d(a, b) = \sqrt{(lat_a - lat_b)^2 + (lon_a - lon_b)^2}$ across targets using $\epsilon = 0.05^\circ$ (~5.5 km) and $MinPts = 2$.
* Groups tactical units into cluster columns ($Cluster \ge 0$).
* Flags isolated entities as noise ($Cluster = -1$).

---

### 3. Bayesian Multi-Factor Threat Scorer
Combines target lethality priors, closing velocity vectors toward defensive perimeters, transit speed, and convoy multiplier:

$$Score = (Prior \times 0.45 + ClosingVector \times 0.25 + Speed \times 0.20 + ConvoyBonus) \times ConvoyMultiplier$$

* **HIGH THREAT** ($Score \ge 0.75$) — Red Alert.
* **MEDIUM THREAT** ($0.45 \le Score < 0.75$) — Caution Track.
* **LOW THREAT / CIVILIAN** ($Score < 0.45$) — Civilian / Non-combatant.

---

## 💻 Tech Stack

* **Frontend**: React 19, Vite 6, React Router DOM v7, CSS3 Vanilla Design Tokens
* **Geospatial & Mapping**: Leaflet, React-Leaflet, Esri World Imagery (Satellite Tiles)
* **Data Visualization**: D3.js (Force-directed Graph), Recharts
* **Backend Infrastructure**: Node.js, Express.js, TypeScript, Multer
* **Real-Time Communications**: WebSockets (`ws`, `socket.io-client`)
* **AI Engine**: Google `@google/genai` (Gemini 3.8 Flash)
* **Cryptographic Security**: Node `crypto` SHA-256 Proof-of-Authority Ledger
* **Deployment**: Vercel Serverless Functions (`api/index.ts`, `vercel.json`)

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** >= 18.x
* **npm** or **bun**

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/bhishajit2006/Battelfield.git
cd Battelfield
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=3000
```

### 3. Run Locally (Development Mode)
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Build for Production
```bash
npm run build
=======
 6. Machine Learning Pipeline

The system follows the following processing pipeline:

```text
Data Sources
     |
     v
Data Ingestion
     |
     v
Preprocessing
     |
     v
Object / Target Detection
     |
     v
Kalman Tracking
     |
     v
Spatial Clustering
     |
     v
Threat Scoring
     |
     v
Intelligence Fusion
     |
     +--------------------+
     |                    |
     v                    v
Audit Ledger        AI Intelligence
     |                    |
     +---------+----------+
               |
               v
       Real-Time Dashboard
>>>>>>> ce36a3b55ef7a3022b7e059e571b138aba0441b8
```

---

<<<<<<< HEAD
## 📄 License
Distributed under the **MIT License**.
=======
 7. Technology Stack

 Frontend

 React 19
 Vite 6
 React Router DOM v7
 CSS3
 Vanilla CSS Design Tokens

 Mapping and Geospatial Visualization

 Leaflet
 React-Leaflet
 Esri World Imagery

 Data Visualization

 D3.js
 Recharts

 Backend

 Node.js
 Express.js
 TypeScript
 Multer

 Real-Time Communication

 WebSockets
 `ws`
 Socket.IO Client

 Artificial Intelligence

 Google `@google/genai`
 Gemini Flash

 Cryptographic Security

 Node.js `crypto`
 SHA-256 hashing
 Proof-of-Authority audit model

 Deployment

 Vercel
 Serverless Functions

---

 8. Core Modules

The system can be divided into the following modules:

```text
1. Data Ingestion Module
2. Video Intelligence Module
3. Satellite Intelligence Module
4. Sensor Fusion Module
5. Target Tracking Module
6. Convoy Detection Module
7. Threat Analysis Module
8. AI Intelligence Module
9. Blockchain Audit Module
10. Real-Time Dashboard Module
```

---

 9. Data Flow

```text
UAV / Satellite / Ground Sensors
              |
              v
        Data Ingestion
              |
              v
        Data Processing
              |
              v
       Target Detection
              |
              v
       Kalman Tracking
              |
              v
       DBSCAN Clustering
              |
              v
      Threat Score Engine
              |
       +------+------+
       |             |
       v             v
 Blockchain       AI Engine
   Ledger        SITREP/Reports
       |             |
       +------+------+
              |
              v
       Intelligence Dashboard
```

---

 10. Dashboard

The real-time dashboard provides a centralized view of processed intelligence.

Key interface components include:

 Interactive tactical map
 Target markers
 Predicted movement paths
 Cluster visualization
 Threat classification
 Sensor status
 Satellite imagery
 Intelligence network graph
 Audit verification status
 AI-generated situation reports
 Real-time telemetry

---

 11. Security and Data Integrity

The platform incorporates cryptographic verification to provide evidence that intelligence records have not been modified after being recorded.

Each relevant event can be converted into a SHA-256 hash.

Conceptually:

```text
Raw Intelligence Data
        |
        v
     SHA-256
        |
        v
Cryptographic Hash
        |
        v
Verified Audit Record
```

The audit layer provides traceability for intelligence-processing events and helps identify unauthorized modification.

---

 12. Expected Outcome

The proposed system aims to provide a unified intelligence environment capable of:

 Combining multiple surveillance sources
 Reducing target-tracking noise
 Identifying spatially grouped entities
 Estimating future target movement
 Prioritizing detected entities
 Generating structured intelligence summaries
 Maintaining verifiable audit records
 Presenting intelligence through a centralized dashboard

---

 13. Project Objective

The primary objective is to demonstrate an integrated AI-driven intelligence architecture that combines:

Multi-Sensor Fusion + Machine Learning + Geospatial Intelligence + Generative AI + Cryptographic Verification

into a single real-time tactical intelligence platform.

---

 14. Future Enhancements

Potential future extensions include:

 Multi-object tracking using advanced computer vision models
 Real-time object detection using YOLO-based architectures
 Sensor confidence estimation
 Temporal anomaly detection
 Satellite-image change detection
 Edge-AI processing for UAV systems
 Offline-first tactical dashboards
 Role-based access control
 Secure inter-node communication
 Historical intelligence replay
 Automated intelligence report generation
 Advanced geospatial analytics

---

 15. Disclaimer

This project is intended as a research, educational, and simulation platform for demonstrating applications of artificial intelligence, geospatial analytics, sensor fusion, and cybersecurity concepts.

It is not intended to provide autonomous weapons targeting or operational combat instructions.
>>>>>>> ce36a3b55ef7a3022b7e059e571b138aba0441b8
