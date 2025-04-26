from beanie import Document
from pydantic import EmailStr, Field
from passlib.context import CryptContext
from typing import Optional

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(Document):
    email: EmailStr
    password: str
    name: Optional[str] = None

    def verify_password(self, plain_password: str) -> bool:
        return pwd_context.verify(plain_password, self.password)
    
    def set_password(self, password: str) -> None:
        self.password = pwd_context.hash(password)

    @classmethod
    def hash_password(cls, password: str) -> str:
        return pwd_context.hash(password)

    class Settings:
        name = "users"
        indexes = [
            [("email", 1)],
        ]
        

