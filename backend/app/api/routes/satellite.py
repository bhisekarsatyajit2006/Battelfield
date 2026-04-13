import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File
from app.ai_models.detection import model

router = APIRouter()


def pixel_to_geo(x, y, img_w, img_h):
    lat = 20.0 + (y / img_h) * 0.1
    lon = 77.0 + (x / img_w) * 0.1
    return lat, lon


def map_class(cls):
    if cls == 2:
        return "car"
    elif cls == 5:
        return "bus"
    elif cls == 7:
        return "truck"
    elif cls == 67:
        return "vehicle"
    return "unknown"


# 🔥 IoU calculation
def iou(box1, box2):
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_area = max(0, x2 - x1) * max(0, y2 - y1)

    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])

    union = box1_area + box2_area - inter_area

    return inter_area / union if union > 0 else 0


# 🔥 Non-Max Suppression
def apply_nms(detections, iou_threshold=0.4):
    detections = sorted(detections, key=lambda x: x["confidence"], reverse=True)
    final_detections = []

    while detections:
        best = detections.pop(0)
        final_detections.append(best)

        detections = [
            det for det in detections
            if iou(best["bbox"], det["bbox"]) < iou_threshold
        ]

    return final_detections


def tile_inference(image):
    all_detections = []

    scales = [
        (800, 600),
        (1200, 900)
    ]

    h, w, _ = image.shape

    for tile_size, stride in scales:
        print(f"[INFO] Running scale: {tile_size}")

        for y in range(0, h, stride):
            for x in range(0, w, stride):
                tile = image[y:y + tile_size, x:x + tile_size]

                if tile.shape[0] < 200 or tile.shape[1] < 200:
                    continue

                results = model(tile, conf=0.15, imgsz=1280)

                for r in results:
                    for box in r.boxes:
                        cls = int(box.cls[0])

                        if cls not in [2, 5, 7, 67]:
                            continue

                        conf = float(box.conf[0])

                        if conf < 0.2:
                            continue

                        x1, y1, x2, y2 = box.xyxy[0].tolist()

                        all_detections.append({
                            "class_id": cls,
                            "class": map_class(cls),
                            "confidence": conf,
                            "bbox": [
                                x1 + x,
                                y1 + y,
                                x2 + x,
                                y2 + y
                            ]
                        })

    return all_detections


@router.post("/upload")
async def upload_satellite_image(file: UploadFile = File(...)):
    contents = await file.read()

    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    detections = tile_inference(image)

    # 🔥 APPLY NMS HERE (MAIN FIX)
    detections = apply_nms(detections)

    img_h, img_w, _ = image.shape

    results = []

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]

        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2

        lat, lon = pixel_to_geo(cx, cy, img_w, img_h)

        results.append({
            "class": det["class"],
            "confidence": det["confidence"],
            "geo_location": {
                "lat": lat,
                "lon": lon
            }
        })

    return {
        "total_objects": len(results),
        "detections": results[:50]
    }