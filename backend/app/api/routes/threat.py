from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def calculate_threat():
    return {"message": "Threat scoring placeholder"}