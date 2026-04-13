from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError

try:
    client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=2000)
    client.server_info()  # force connection

    db = client["battlefield_ai"]
    pipeline_collection = db["pipeline_data"]

    print("✅ MongoDB connected")

except ServerSelectionTimeoutError:
    print("❌ MongoDB NOT running — using fallback")

    class DummyCollection:
        def insert_one(self, data):
            print("⚠️ Data not saved (MongoDB down)")

        def find_one(self, *args, **kwargs):
            return {}

    pipeline_collection = DummyCollection()