from ultralytics import YOLO
import cv2

# Strong model for better detection
model = YOLO("yolov8m.pt")  # upgraded from s → m

# Allowed battlefield-relevant classes
ALLOWED_CLASSES = {
    0: "person",
    2: "car",
    5: "bus",
    7: "truck"
}

CONF_THRESHOLD = 0.25   # slightly lower for small objects
MIN_BOX_AREA = 300      # reduced to allow small vehicles


def detect_objects(frame):
    try:
        orig_h, orig_w = frame.shape[:2]

        # 👉 resize for better small-object detection
        resized = cv2.resize(frame, (1280, 1280))

        scale_x = orig_w / 1280
        scale_y = orig_h / 1280

        results = model(
            resized,
            conf=CONF_THRESHOLD,
            iou=0.5,
            imgsz=1280,
            verbose=False
        )

        detections = []

        for r in results:
            if r.boxes is None:
                continue

            for box in r.boxes:
                try:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])

                    if cls not in ALLOWED_CLASSES:
                        continue

                    if conf < CONF_THRESHOLD:
                        continue

                    x1, y1, x2, y2 = box.xyxy[0].tolist()

                    # 👉 scale back to original image size
                    x1 *= scale_x
                    x2 *= scale_x
                    y1 *= scale_y
                    y2 *= scale_y

                    width = x2 - x1
                    height = y2 - y1
                    area = width * height

                    if area < MIN_BOX_AREA:
                        continue

                    detections.append({
                        "class_id": cls,
                        "label": ALLOWED_CLASSES[cls],
                        "confidence": round(conf, 3),
                        "bbox": [
                            round(x1, 2),
                            round(y1, 2),
                            round(x2, 2),
                            round(y2, 2)
                        ]
                    })

                except Exception:
                    continue

        return detections

    except Exception as e:
        return []

