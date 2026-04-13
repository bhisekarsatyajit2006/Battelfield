from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.video_processor import save_video, process_video
from app.db.mongo import pipeline_collection
import os
import traceback

router = APIRouter()


@router.post("/upload")
async def upload_drone_video(file: UploadFile = File(...)):
    video_path = None

    try:
        # Validate file type
        if not file.filename.lower().endswith((".mp4", ".avi", ".mov")):
            raise HTTPException(status_code=400, detail="Invalid video format")

        # Save video
        video_path = save_video(file)

        # Process video (FULL PIPELINE)
        result = process_video(video_path)

        if not result:
            raise HTTPException(status_code=500, detail="Processing failed")

        # ✅ STORE IN MONGODB (REPLACES MEMORY)
        pipeline_collection.insert_one(result)

        # Debug
        print("✅ Data stored in MongoDB. Keys:", result.keys())

        detections = result.get("detections", [])
        paths = result.get("paths", {})
        motion = result.get("motion", {})
        predictions = result.get("predictions", {})
        clusters = result.get("clusters", {})
        threats = result.get("threats", {})
        fused = result.get("fused_intelligence", {})
        sensor_data = result.get("sensor_data", [])

        return {
            "status": "processed",
            "message": "Pipeline complete + stored in MongoDB",
            "filename": file.filename,

            # BASIC INFO
            "total_detections": len(detections),
            "tracked_objects": len(paths),

            # SAMPLE (UI optimization)
            "sample_detections": detections[:50],

            # CORE PIPELINE OUTPUTS
            "paths": paths,
            "motion": motion,
            "predictions": predictions,
            "clusters": clusters,
            "threats": threats,
            "fused_intelligence": fused,
            "sensor_data": sensor_data
        }

    except HTTPException as he:
        raise he

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    finally:
        # Cleanup temp file
        if video_path and os.path.exists(video_path):
            os.remove(video_path)

