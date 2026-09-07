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
```

---

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
```

---

## 📄 License
Distributed under the **MIT License**.
