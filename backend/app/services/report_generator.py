def generate_report(threats, fused, clusters):
    total_objects = len(threats)

    high_threats = [
        obj_id for obj_id, t in threats.items()
        if t["level"] == "HIGH"
    ]

    convoy_detected = any(c != -1 for c in clusters.values())

    report = []

    report.append(f"Total objects detected: {total_objects}")

    if convoy_detected:
        report.append("Convoy movement detected.")

    if high_threats:
        report.append(f"High threat objects: {len(high_threats)}")

    for obj_id in high_threats:
        loc = fused.get(obj_id, {}).get("location", None)
        if loc:
            report.append(f"Object {obj_id} near sensitive zone at {loc}")

    if high_threats:
        recommendation = "Deploy surveillance drone immediately."
    else:
        recommendation = "Continue monitoring."

    return {
        "summary": " | ".join(report),
        "recommendation": recommendation
    }