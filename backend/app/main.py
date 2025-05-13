from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import ai_router

app = FastAPI(
    title=settings.app_name,
    description="Backend per AI Assistant Arcade - Un cabinato arcade per sviluppatori",
    version="1.0.0"
)

# Configurazione per upload file più grandi
app.state.UPLOAD_MAX_SIZE = 10 * 1024 * 1024  # 10MB

# Configurazione CORS per sviluppo - permissiva
origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
]

# In sviluppo, permetti tutte le origini
if settings.debug:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrazione routers
app.include_router(ai_router.router)

@app.get("/")
async def root():
    return {
        "message": "Benvenuto ad AI Assistant Arcade! 🕹️",
        "status": "online",
        "endpoints": {
            "chat": "/ai/chat",
            "chat_json": "/ai/chat/json",
            "health": "/ai/health",
            "docs": "/docs"
        }
    }