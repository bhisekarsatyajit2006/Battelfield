from fastapi import APIRouter
from app.services.sensor_generator import generate_sensor_data

router = APIRouter()

@router.get("/simulate")
def simulate_sensor():
    return {"sensor_data": generate_sensor_data()}


# ✅ FIX: handle wrong route spam
@router.post("/upload/sensor")
def upload_sensor_alias():
    return {
        "status": "ok",
        "message": "Use GET /sensor/simulate instead"
    }