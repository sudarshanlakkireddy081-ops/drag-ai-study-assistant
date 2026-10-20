"""
SQLAlchemy and Pydantic models for DrAG (Document Retrieval & AI Guide)
Supports PostgreSQL with pgvector for embedding vectors.
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
    JSON,
    create_engine,
)
from sqlalchemy.orm import declarative_base, relationship
from pydantic import BaseModel, EmailStr

Base = declarative_base()

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    major = Column(String(128), default="General Studies")
    target_exam = Column(String(128), default="Course Finals")
    preferred_complexity = Column(String(32), default="undergrad")
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("DocumentModel", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSessionModel", back_populates="user", cascade="all, delete-orphan")


class DocumentModel(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    original_file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0)
    page_count = Column(Integer, default=1)
    status = Column(String(32), default="ready") # uploading, processing, ready, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("UserModel", back_populates="documents")
    chunks = relationship("DocumentChunkModel", back_populates="document", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSessionModel", back_populates="document", cascade="all, delete-orphan")


class DocumentChunkModel(Base):
    __tablename__ = "document_chunks"

    id = Column(String(64), primary_key=True, index=True)
    document_id = Column(String(64), ForeignKey("documents.id"), nullable=False, index=True)
    page_number = Column(Integer, nullable=False, index=True)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    # When pgvector is enabled: Column(Vector(768))
    # In standard PostgreSQL / SQLite fallback: stored as serialized JSON float list
    embedding_json = Column(JSON, nullable=True)

    document = relationship("DocumentModel", back_populates="chunks")


class ChatSessionModel(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    document_id = Column(String(64), ForeignKey("documents.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("UserModel", back_populates="chat_sessions")
    document = relationship("DocumentModel", back_populates="chat_sessions")
    messages = relationship("ChatMessageModel", back_populates="session", cascade="all, delete-orphan")


class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id = Column(String(64), primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String(32), nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    citations_json = Column(JSON, nullable=True) # list of {pageNumber, excerpt, section}
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSessionModel", back_populates="messages")


# Pydantic Schemas for Request/Response validation
class UserRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    major: Optional[str] = "Computer Science"
    target_exam: Optional[str] = "Final Exam"
    preferred_complexity: Optional[str] = "undergrad"

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    major: Optional[str]
    target_exam: Optional[str]
    preferred_complexity: Optional[str]

class ChatMessageRequest(BaseModel):
    content: str

class CitationResponse(BaseModel):
    pageNumber: int
    excerpt: str
    section: Optional[str] = None

class ChatMessageResponse(BaseModel):
    id: str
    sessionId: str
    role: str
    content: str
    citations: Optional[List[CitationResponse]] = []
    timestamp: str

class MCQGenerateRequest(BaseModel):
    documentId: str
    count: Optional[int] = 5
    difficulty: Optional[str] = "medium"
    topic: Optional[str] = None
