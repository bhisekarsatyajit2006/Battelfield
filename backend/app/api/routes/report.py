from fastapi import APIRouter
from app.services.report_generator import generate_report
from app.db.mongo import pipeline_collection

router = APIRouter()


@router.post("/update")
def update_data(data: dict):
    pipeline_collection.insert_one(data)
    return {"status": "stored in mongodb"}


@router.get("/")
def get_report():
    latest = pipeline_collection.find_one(sort=[("_id", -1)])

    if not latest:
        return {"error": "No data available"}

    report = generate_report(
        latest.get("threats", {}),
        latest.get("fused_intelligence", {}),
        latest.get("clusters", {})
    )

    return report