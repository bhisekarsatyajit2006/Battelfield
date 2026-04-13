import numpy as np
from sklearn.cluster import DBSCAN


def cluster_objects(paths, eps=150, min_samples=2):
    """
    Cluster tracked objects using DBSCAN.

    Improvements:
    - Increased eps for better grouping (convoy detection)
    - Adaptive eps for small datasets
    - Debug logs for visibility
    """

    object_ids = []
    positions = []

    for obj_id, path in paths.items():
        if not path:
            continue

        # Use last known position
        last_pos = path[-1]

        object_ids.append(obj_id)
        positions.append(last_pos)

    if not positions:
        print("⚠️ No positions for clustering")
        return {}

    X = np.array(positions)

    # 🔥 Adaptive eps (important for small scenes)
    if len(X) < 3:
        eps = max(eps, 200)

    clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(X)
    labels = clustering.labels_

    cluster_map = {}

    for i, obj_id in enumerate(object_ids):
        cluster_map[obj_id] = int(labels[i])  # -1 = noise

    # 🔥 DEBUG OUTPUT
    print("=== DBSCAN DEBUG ===")
    print("Positions:", positions)
    print("Labels:", labels.tolist())
    print("Cluster Map:", cluster_map)
    print("====================")

    return cluster_map