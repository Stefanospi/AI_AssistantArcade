from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    google_api_key: str
    frontend_url: str = "http://localhost:8000"
    app_name: str = "AI Assistant Arcade"
    debug: bool = True

    class Config:
        env_file = ".env"

settings = Settings()