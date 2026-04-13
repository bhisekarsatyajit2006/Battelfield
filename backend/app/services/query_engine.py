def answer_query(query, data):
    query = query.lower()

    threats = data.get("threats", {})
    clusters = data.get("clusters", {})

    if "high" in query:
        high = [
            obj_id for obj_id, t in threats.items()
            if t["level"] == "HIGH"
        ]
        return {"answer": f"High threat objects: {high}"}

    if "convoy" in query:
        convoy = [obj for obj, c in clusters.items() if c != -1]
        return {"answer": f"Convoy objects: {convoy}"}

    if "summary" in query:
        return {"answer": f"Total objects: {len(threats)}"}

    return {"answer": "Query not understood"}