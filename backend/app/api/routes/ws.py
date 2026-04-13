from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.db.mongo import pipeline_collection
import asyncio

router = APIRouter()


@router.websocket("/ws/live")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()

    try:
        while True:
            latest = pipeline_collection.find_one(sort=[("_id", -1)])

            if latest:
                latest["_id"] = str(latest["_id"])
                await ws.send_json(latest)

            await asyncio.sleep(2)

    except WebSocketDisconnect:
        print("Client disconnected")

    except Exception as e:
        print("WebSocket error:", e)