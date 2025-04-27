from beanie import Document
from typing import Optional

class User(Document):
    email: str
    name: Optional[str] = None
    firebase_uid: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    class Settings:
        name = "users" 