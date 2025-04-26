from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import os
from dotenv import load_dotenv
from typing import List, Type
from models.user import User

load_dotenv()

# MongoDB URL from environment variable
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")

# Create MongoDB client
client = AsyncIOMotorClient(MONGODB_URL)

# Initialize Beanie with the database and document models
async def init_db():
    await init_beanie(
        database=client.lahacks,
        document_models=[
            User
        ]
    ) 