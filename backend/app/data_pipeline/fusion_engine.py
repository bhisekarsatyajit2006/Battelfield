# backend/app/data_pipeline/fusion_engine.py

import math


def distance(p1, p2):
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)


def bayesian_fusion(p_drone, p_sensor):
    """
    Bayesian update for combining probabilities
    avoids overconfidence explosion
    """
    denominator = (p_drone * p_sensor) + ((1 - p_drone) * (1 - p_sensor))
    
    if denominator == 0:
        return p_drone  # safe fallback

    return (p_drone * p_sensor) / denominator


def fuse_data(paths, detections, sensor_data, proximity_threshold=100):
    fused_objects = {}

    for obj_id, path in paths.items():
        if not path:
            continue

        last_pos = path[-1]

        # Base drone confidence
        drone_conf = 0.6

        matched_sensors = []
        sensor_conf_total = 0

        # 🔍 Match sensors based on proximity
        for sensor in sensor_data:
            sensor_pos = sensor["location"]

            if distance(last_pos, sensor_pos) < proximity_threshold:
                matched_sensors.append(sensor)
                sensor_conf_total += sensor.get("confidence", 0.5)

        # 📊 Sensor aggregation
        if matched_sensors:
            sensor_conf_avg = sensor_conf_total / len(matched_sensors)

            # 🧠 Bayesian fusion
            final_conf = bayesian_fusion(drone_conf, sensor_conf_avg)

        else:
            final_conf = drone_conf

        fused_objects[obj_id] = {
            "location": last_pos,
            "confidence": round(final_conf, 3),
            "sources": {
                "drone": True,
                "sensor": len(matched_sensors) > 0
            },
            "sensor_count": len(matched_sensors),
            "sensor_matches": matched_sensors
        }

    return fused_objects