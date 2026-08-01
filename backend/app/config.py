import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME: str = "NeuroSync Backend"
    VERSION: str = "1.0.0"
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", os.getenv("OPENROUTER_API_KEY", ""))
    OPEN_API_KEY: str = os.getenv("OPEN_API_KEY", os.getenv("OPENROUTER_API_KEY", ""))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    JWT_SECRET: str = os.getenv("JWT_SECRET", "neurosync-secret-key-change-in-prod")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "43200"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./neurosync.db")
    CORS_ORIGINS: list = ["*"]

settings = Settings()