# backend/app/services/video_processor.py

import cv2
import os
import uuid
from collections import defaultdict

from app.ai_models.detection import detect_objects
from app.ai_models.prediction import KalmanPredictor
from app.threat_engine.scorer import compute_threat
from app.data_pipeline.fusion_engine import fuse_data
from app.services.sensor_generator import generate_sensor_data
from app.data_pipeline.clustering import cluster_objects

from deep_sort_realtime.deepsort_tracker import DeepSort

# ✅ FIXED IMPORT
from app.blockchain.contract import log_to_blockchain


# =============================
# VIDEO SAVE
# =============================
def save_video(file):
    filename = f"temp_{uuid.uuid4()}.mp4"
    filepath = os.path.join("temp", filename)

    os.makedirs("temp", exist_ok=True)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    return filepath


# =============================
# MAIN PROCESS
# =============================
def process_video(video_path, frame_skip=5, resize=(640, 480)):
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise RuntimeError("Failed to open video file")

    tracker = DeepSort(max_age=30)
    predictor = KalmanPredictor()

    frame_id = 0
    all_detections = []
    paths = defaultdict(list)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.resize(frame, resize)

        if frame_id % frame_skip == 0:
            detections = detect_objects(frame)

            ds_detections = []

            for det in detections:
                x1, y1, x2, y2 = det["bbox"]
                conf = det["confidence"]
                cls = det["class_id"]

                # DeepSORT expects (x, y, w, h)
                ds_detections.append(([x1, y1, x2 - x1, y2 - y1], conf, cls))

            tracks = tracker.update_tracks(ds_detections, frame=frame)

            for track in tracks:
                if not track.is_confirmed():
                    continue

                track_id = track.track_id
                l, t, w, h = track.to_ltrb()

                cx = (l + w) / 2
                cy = (t + h) / 2

                paths[track_id].append((cx, cy))

                det_obj = {
                    "object_id": track_id,
                    "bbox": [l, t, w, h],
                    "frame_id": frame_id
                }

                all_detections.append(det_obj)

        frame_id += 1

    cap.release()

    # =============================
    # MOTION
    # =============================
    motion = {}
    for obj_id, path in paths.items():
        if len(path) < 2:
            continue

        x1, y1 = path[-2]
        x2, y2 = path[-1]

        dx = x2 - x1
        dy = y2 - y1

        speed = (dx**2 + dy**2) ** 0.5

        motion[obj_id] = {
            "speed": speed,
            "direction": 0 if dx == 0 else (dy / (dx + 1e-6))
        }

    # =============================
    # PREDICTIONS
    # =============================
    predictions = {
        obj_id: predictor.predict_path(path, steps=5)
        for obj_id, path in paths.items()
        if len(path) >= 2
    }

    # =============================
    # CLUSTERING
    # =============================
    clusters = cluster_objects(paths)

    # =============================
    # THREAT (XGBoost)
    # =============================
    try:
        threats = compute_threat(paths, motion, all_detections, clusters)
    except Exception as e:
        print("Threat error:", e)
        threats = {}

    # =============================
    # SENSOR + FUSION
    # =============================
    sensor_data = generate_sensor_data(num=5)

    try:
        fused = fuse_data(paths, all_detections, sensor_data)
    except Exception as e:
        print("Fusion error:", e)
        fused = {}

    # =============================
    # ✅ BLOCKCHAIN LOGGING (FIXED)
    # =============================
    try:
        blockchain_log = log_to_blockchain({
            "threats": threats,
            "fused": fused
        })
    except Exception as e:
        print("Blockchain error:", e)
        blockchain_log = {}

    # =============================
    # FINAL RESPONSE
    # =============================
    return {
        "total_objects": len(paths),
        "detections": all_detections[:100],
        "paths": dict(paths),
        "motion": motion,
        "predictions": predictions,
        "clusters": clusters,
        "threats": threats,
        "fused_intelligence": fused,
        "sensor_data": sensor_data,
        "blockchain": blockchain_log
    }