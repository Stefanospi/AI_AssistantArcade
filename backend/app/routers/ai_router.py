from fastapi import APIRouter, HTTPException, File, UploadFile, Form, Request
from app.models.chat import ChatRequest, ChatResponse
from app.services.gemini_service import gemini_service
from typing import List, Optional, Union
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request):
    """Endpoint principale per la chat con l'AI con supporto file opzionale"""
    try:
        # Controlla il content type
        content_type = request.headers.get("content-type", "")
        logger.info(f"Request content-type: {content_type}")
        
        if "multipart/form-data" in content_type:
            # Richiesta con FormData (potenzialmente con file)
            form = await request.form()
            data = form.get("data")
            files = form.getlist("files")
            
            logger.info(f"Received multipart/form-data request")
            logger.info(f"Number of files in form: {len(files)}")
            
            if not data:
                raise HTTPException(status_code=400, detail="No request data provided")
            
            # Parse JSON data
            try:
                request_data = json.loads(data)
                chat_request = ChatRequest(**request_data)
                logger.info(f"Parsed request: {chat_request.message[:100]}...")
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {str(e)}")
                raise HTTPException(status_code=400, detail="Invalid JSON data")
            
            # Processa i file se presenti
            file_contents = []
            if files:
                for idx, file in enumerate(files):
                    if isinstance(file, UploadFile):
                        try:
                            logger.info(f"Processing file {idx + 1}: {file.filename}")
                            logger.info(f"File content type: {file.content_type}")
                            
                            # Leggi il contenuto del file
                            content = await file.read()
                            logger.info(f"File size: {len(content)} bytes")
                            
                            # Non serve resettare il puntatore poiché non riutilizziamo il file
                            # await file.seek(0)
                            
                            file_contents.append({
                                "filename": file.filename,
                                "content": content,
                                "content_type": file.content_type or "application/octet-stream"
                            })
                            
                            # Log primi 100 byte per debug (se è testo)
                            try:
                                preview = content[:100].decode('utf-8')
                                logger.info(f"File preview: {preview}...")
                            except:
                                logger.info("File appears to be binary")
                                
                        except Exception as e:
                            logger.error(f"Error reading file {file.filename}: {str(e)}")
                            continue
                    else:
                        logger.warning(f"Unexpected file type: {type(file)}")
            
            logger.info(f"Total files processed: {len(file_contents)}")
            response = await gemini_service.chat(chat_request, file_contents if file_contents else None)
        
        else:
            # Richiesta JSON normale (senza file)
            logger.info("Received JSON request (no files)")
            body = await request.json()
            chat_request = ChatRequest(**body)
            response = await gemini_service.chat(chat_request, None)
        
        if response.error:
            logger.error(f"Gemini service error: {response.error}")
            raise HTTPException(status_code=500, detail=response.error)
            
        logger.info("Successfully processed request")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-upload")
async def test_upload(files: List[UploadFile] = File(...)):
    """Endpoint di test per verificare l'upload dei file"""
    logger.info(f"Test upload endpoint called with {len(files)} files")
    results = []
    
    for idx, file in enumerate(files):
        try:
            content = await file.read()
            await file.seek(0)  # Reset for potential reuse
            
            file_info = {
                "index": idx + 1,
                "filename": file.filename,
                "size": len(content),
                "content_type": file.content_type,
                "first_100_bytes": content[:100].hex() if content else "",
                "is_text": False,
                "preview": None
            }
            
            # Try to detect if it's text
            try:
                preview = content[:500].decode('utf-8')
                file_info["is_text"] = True
                file_info["preview"] = preview
            except:
                pass
                
            results.append(file_info)
            logger.info(f"Test file {idx + 1}: {file.filename} ({len(content)} bytes)")
            
        except Exception as e:
            logger.error(f"Error processing test file {file.filename}: {str(e)}")
            results.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    return {
        "status": "success",
        "files_received": len(files),
        "files_info": results
    }

@router.get("/health")
async def health_check():
    """Verifica lo stato del servizio AI"""
    return {
        "status": "online",
        "service": "AI Assistant Arcade",
        "debug_mode": True
    }