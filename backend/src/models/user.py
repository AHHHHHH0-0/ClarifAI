from beanie import Document
from typing import Optional

class User(Document):
    email: str
    name: Optional[str] = None
    firebase_uid: str
    
    class Settings:
        name = "users" 