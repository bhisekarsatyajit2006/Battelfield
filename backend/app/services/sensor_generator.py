import random
import time


def generate_sensor_data(num=10):
    data = []

    for i in range(num):
        data.append({
            "sensor_id": i,
            "timestamp": time.time(),
            "location": (
                random.randint(0, 1000),
                random.randint(0, 1000)
            ),
            "detected_object": "vehicle",
            "speed": random.uniform(10, 60),
            "direction": random.uniform(0, 360),
            "confidence": round(random.uniform(0.4, 0.9), 2)
        })

    return data