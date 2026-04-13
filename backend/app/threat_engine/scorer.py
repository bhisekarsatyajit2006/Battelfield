from app.threat_engine.xgb_model import predict_threat
import math


def compute_location_risk(pos):
    """
    Simulate sensitive zone risk
    Closer to center → higher risk
    """
    sx, sy = 500, 500  # mock sensitive zone

    dist = math.sqrt((pos[0] - sx) ** 2 + (pos[1] - sy) ** 2)

    # normalize risk
    risk = max(0, 1 - dist / 1000)

    return round(risk, 2)


def compute_threat(paths, motion, detections, clusters):
    """
    Compute threat using XGBoost model
    Features:
        [object_type, speed, group_size, location_risk]
    """

    threats = {}

    for obj_id, path in paths.items():
        if not path:
            continue

        # --- SPEED (BOOSTED) ---
        raw_speed = motion.get(obj_id, {}).get("speed", 0)

        # ensure minimum speed impact (important fix)
        speed = max(raw_speed, 30)

        # --- CLUSTER / CONVOY (STRONG BOOST) ---
        cluster_id = clusters.get(obj_id, -1)

        if cluster_id != -1:
            group_size = 5  # strong convoy boost
        else:
            group_size = 1

        # --- OBJECT TYPE ---
        obj_class = 2  # default = car

        for det in reversed(detections):
            if det.get("object_id") == obj_id:
                obj_class = det.get("class_id", 2)
                break

        # --- LOCATION RISK (DYNAMIC) ---
        location_risk = compute_location_risk(path[-1])

        # --- FEATURE VECTOR ---
        features = [
            obj_class,
            speed,
            group_size,
            location_risk
        ]

        # --- PREDICT THREAT ---
        level = predict_threat(features)

        # --- CONFIDENCE (IMPROVED) ---
        confidence = 0.5
        confidence += min(speed / 100, 0.3)
        confidence += 0.2 if cluster_id != -1 else 0
        confidence += location_risk * 0.2

        confidence = round(min(confidence, 0.99), 2)

        # --- DEBUG (VERY IMPORTANT) ---
        print("=== THREAT DEBUG ===")
        print("Object ID:", obj_id)
        print("Class:", obj_class)
        print("Speed:", speed)
        print("Cluster:", cluster_id)
        print("Location Risk:", location_risk)
        print("Features:", features)
        print("Predicted Level:", level)
        print("Confidence:", confidence)
        print("====================")

        threats[obj_id] = {
            "level": level,
            "confidence": confidence,
            "features": {
                "object_type": obj_class,
                "speed": speed,
                "group_size": group_size,
                "location_risk": location_risk
            }
        }

    return threats