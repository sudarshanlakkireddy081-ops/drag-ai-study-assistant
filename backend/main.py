"""
FastAPI Application for DrAG (Document Retrieval & AI Guide)
REST API endpoints for Authentication, PDF Upload, Semantic RAG Chat, and AI Study Tools.
"""
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os

from backend.models import (
    UserRegisterRequest,
    UserLoginRequest,
    ChatMessageRequest,
    MCQGenerateRequest,
)
from backend.rag_engine import (
    extract_pdf_pages,
    chunk_document_pages,
    retrieve_top_k_chunks,
    answer_query_with_rag,
)

app = FastAPI(
    title="DrAG — AI Study Assistant API",
    description="Document Retrieval and AI Guide API with pgvector and Gemini 3.8 Flash",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "DrAG FastAPI Backend",
        "gemini_model": "gemini-3.8-flash",
        "database": "PostgreSQL with pgvector"
    }

@app.post("/api/auth/register")
def register(user_data: UserRegisterRequest):
    return {
        "token": "jwt-token-sample-value",
        "user": {
            "id": "usr-1",
            "name": user_data.name,
            "email": user_data.email,
            "major": user_data.major,
            "targetExam": user_data.target_exam,
            "preferredComplexity": user_data.preferred_complexity
        }
    }

@app.post("/api/auth/login")
def login(creds: UserLoginRequest):
    return {
        "token": "jwt-token-sample-value",
        "user": {
            "id": "usr-demo-sarah",
            "name": "Sarah Jenkins",
            "email": creds.email,
            "major": "Computer Science & Engineering",
            "targetExam": "OS & Distributed Systems Midterm",
            "preferredComplexity": "undergrad"
        }
    }

@app.post("/api/documents/upload")
async def upload_pdf(file: UploadFile = File(...)):
    content = await file.read()
    pages = extract_pdf_pages(content)
    chunks = chunk_document_pages(pages)
    return {
        "id": f"doc-{file.filename}",
        "title": file.filename.replace(".pdf", "").replace("_", " "),
        "originalFileName": file.filename,
        "pageCount": len(pages),
        "chunkCount": len(chunks),
        "status": "ready"
    }

@app.post("/api/chat/sessions/{session_id}/messages")
def send_message(session_id: str, req: ChatMessageRequest):
    # RAG retrieval and answer pipeline
    dummy_chunks = [
        {"page_number": 4, "content": "A deadlock arises if and only if all four Coffman conditions hold: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait."}
    ]
    answer, citations = answer_query_with_rag(req.content, dummy_chunks)
    return {
        "id": f"msg-reply",
        "sessionId": session_id,
        "role": "assistant",
        "content": answer,
        "citations": citations,
        "timestamp": "2026-10-19T21:00:00Z"
    }

@app.post("/api/study/generate-mcqs")
def generate_mcqs(req: MCQGenerateRequest):
    return {
        "documentId": req.documentId,
        "difficulty": req.difficulty,
        "questions": [
            {
                "id": "q1",
                "question": "Which of the following is NOT one of the Coffman conditions required for deadlock?",
                "options": ["Mutual Exclusion", "Hold and Wait", "Preemption Allowed", "Circular Wait"],
                "correctIndex": 2,
                "explanation": "The condition is No Preemption; resources cannot be seized forcibly [Page 4].",
                "pageReference": 4
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
