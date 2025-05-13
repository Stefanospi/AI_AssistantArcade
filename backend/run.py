# backend/run.py
import uvicorn

if __name__ == "__main__":
    # Usa la stringa di import invece dell'oggetto app
    uvicorn.run(
        "app.main:app",  # Stringa di import invece di oggetto
        host="0.0.0.0",
        port=8001,
        reload=True
    )