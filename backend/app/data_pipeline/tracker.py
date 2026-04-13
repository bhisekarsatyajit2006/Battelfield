from deep_sort_realtime.deepsort_tracker import DeepSort

tracker = DeepSort(max_age=30)


def update_tracks(detections):
    """
    detections format:
    [ [x1,y1,x2,y2,confidence,class_id], ... ]
    """

    tracks = tracker.update_tracks(detections, frame=None)

    results = []

    for track in tracks:
        if not track.is_confirmed():
            continue

        track_id = track.track_id
        l, t, r, b = track.to_ltrb()

        results.append({
            "object_id": track_id,
            "bbox": [l, t, r, b]
        })

    return results