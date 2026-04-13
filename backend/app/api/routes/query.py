# backend/app/api/routes/query.py

from fastapi import APIRouter, Query
from app.db.mongo import pipeline_collection
import requests
import json

router = APIRouter()

OLLAMA_URL = "http://localhost:11434/api/generate"


def build_context(data: dict) -> str:
    """
    Convert structured battlefield data → compact LLM context
    """
    threats = data.get("threats", {})
    clusters = data.get("clusters", {})
    fused = data.get("fused_intelligence", {})

    context = {
        "total_objects": len(threats),
        "high_threats": [
            obj_id for obj_id, t in threats.items()
            if t.get("level") == "HIGH"
        ],
        "medium_threats": [
            obj_id for obj_id, t in threats.items()
            if t.get("level") == "MEDIUM"
        ],
        "convoys": [
            obj_id for obj_id, c in clusters.items()
            if c != -1
        ],
        "fused_confidence": {
            obj_id: f.get("confidence", 0)
            for obj_id, f in fused.items()
        }
    }

    return json.dumps(context, indent=2)


def ask_llm(question: str, context: str) -> str:
    """
    Call Ollama Llama3 model
    """
    prompt = f"""
You are an advanced battlefield intelligence AI assistant.

Context:
{context}

User Question:
{question}

Instructions:
- Give clear tactical insight
- Mention threats and movement if relevant
- Provide recommendation
- Keep answer concise

Answer:
"""

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": "llama3",
            "prompt": prompt,
            "stream": False
        },
        timeout=30
    )

    if response.status_code != 200:
        return "LLM request failed"

    return response.json().get("response", "").strip()


@router.get("/")
def query_ai(q: str = Query(..., description="User query")):
    try:
        print(f"[QUERY RECEIVED]: {q}")

        latest_data = pipeline_collection.find_one(sort=[("_id", -1)])

        if not latest_data:
            return {
                "status": "error",
                "message": "No data available. Run /drone/upload first."
            }

        cleaned_query = q.strip()

        context = build_context(latest_data)

        llm_response = ask_llm(cleaned_query, context)

        return {
            "status": "success",
            "query": cleaned_query,
            "answer": llm_response
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Query processing failed: {str(e)}"
        }