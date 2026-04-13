from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import (
    drone,
    satellite,
    sensor,
    fusion,
    threat,
    report,
    query,
    ws  # ✅ ADDED
)

app = FastAPI(title="AI Battlefield Intelligence System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST Routes
app.include_router(drone.router, prefix="/drone")
app.include_router(satellite.router, prefix="/satellite")
app.include_router(sensor.router, prefix="/api/sensor")
app.include_router(fusion.router, prefix="/fusion")
app.include_router(threat.router, prefix="/threat")
app.include_router(report.router, prefix="/report")
app.include_router(query.router, prefix="/query")

# ✅ WEBSOCKET ROUTE (IMPORTANT)
app.include_router(ws.router)


@app.get("/")
def root():
    return {"status": "Battlefield AI Backend Running"}


@app.post("/api/upload/sensor")
async def fix_sensor_route(request: Request):
    return {
        "status": "fixed",
        "message": "Wrong endpoint used. Use /sensor/simulate"
    }