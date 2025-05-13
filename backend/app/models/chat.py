from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = datetime.now()
    tool_type: Optional[str] = None  # "ask_assistant", "regex_builder", etc.
    attached_files: Optional[List[str]] = []  # List of filenames

class ChatRequest(BaseModel):
    message: str
    tool_type: str = "ask_assistant"
    session_id: Optional[str] = None
    context: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    response: str
    tool_type: str
    session_id: Optional[str] = None
    timestamp: datetime = datetime.now()
    error: Optional[str] = None