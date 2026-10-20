# DrAG — Document Retrieval and AI Guide

> **AI-Powered University Study Assistant with PDF Chat, Verifiable Page Citations, and Exam Preparation Tools**

DrAG (Document Retrieval and AI Guide) is a production-grade full-stack academic assistant designed for college students and researchers. It bridges the gap between massive textbooks, lecture slides, and exam preparation by combining **Retrieval-Augmented Generation (RAG)** with strict, verifiable **page-level citations** and interactive study modules (MCQs, Flashcards, Summaries, and Checklists).

---

## 🌟 Key Features

### 1. 3-Panel PDF Workspace & Interactive Reader
- **Left Panel (Document Navigation)**: Table of contents, fast topic search, and thumbnail navigation.
- **Center Panel (Built-in PDF Reader)**: Page flipping, continuous zoom controls ($75\%$–$150\%$), and dynamic **passage highlight animations** triggered when citations are clicked.
- **Right Panel (Grounded AI Chat)**: Natural language inquiry with conversational memory and instant `[Page X]` citation tags.

### 2. Strict RAG Grounding & Hallucination Elimination
- Documents are split into semantic passages retaining exact 1-indexed page metadata.
- When answering questions, DrAG retrieves top-k relevant excerpts and instructs **Gemini 3.8 Flash** with zero-tolerance citation rules.
- If a concept is not present in the uploaded document, DrAG transparently states that the information is unavailable rather than inventing facts.

### 3. AI Exam Preparation Suite
- **MCQ Quiz Generator**: Choose difficulty (*Easy, Medium, Hard*), set question counts, take timed quizzes with instant grading and detailed answer rationales with source page references.
- **Spaced Repetition Flashcards**: Interactive 3D flip cards with active recall tracking (*"Still Learning"* vs. *"Got It! (Mastered)"*).
- **High-Yield Summaries**: Executive overview, core concepts, formulas, and high-probability exam takeaways.
- **Exam Revision Checklist**: Interactive checklist of must-know syllabus milestones with page links.
- **Beginner-Friendly Explainer**: Breaks down complex theorems and algorithms using everyday intuitive analogies.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React + TypeScript UI                │
│    (3-Panel PDF Reader, Citation Jumps, Exam Tools)    │
└───────────────────────────┬────────────────────────────┘
                            │ REST API / JWT Auth
┌───────────────────────────▼────────────────────────────┐
│                    API Backend Engine                  │
│       • Express / Node.js (Live Development Applet)    │
│       • FastAPI / Python (Production Microservice)     │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
              ▼                           ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│ Vector Database / Storage │ │      Google GenAI        │
│  • pgvector / PostgreSQL  │ │    (Gemini 3.8 Flash)    │
│  • Page-chunked Embeddings│ │ • Grounded Citations     │
└───────────────────────────┘ └──────────────────────────┘
```

---

## 🚀 Getting Started

### Option A: Local Development Server (Node.js & Express)
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (.env)
GEMINI_API_KEY=your_gemini_api_key

# 3. Start full-stack server
npm run dev
# App will run at http://localhost:3000
```

### Option B: Docker Compose (PostgreSQL with pgvector + FastAPI + React)
```bash
# Run multi-container stack
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- FastAPI Docs (Swagger): `http://localhost:8000/docs`
- PostgreSQL pgvector: `localhost:5432`

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Register student profile and obtain JWT |
| `/api/auth/login` | `POST` | Authenticate and obtain JWT |
| `/api/auth/demo` | `POST` | Instant 1-click demo student session |
| `/api/documents/upload` | `POST` | Upload PDF binary or text notes |
| `/api/documents` | `GET` | List documents for authenticated user |
| `/api/documents/:id` | `GET` | Retrieve document pages and chunks |
| `/api/chat/sessions` | `POST` | Start a new chat session for a document |
| `/api/chat/sessions/:id/messages` | `POST` | Send student query; returns RAG answer & citations |
| `/api/study/generate-mcqs` | `POST` | Generate customizable MCQs with explanations |
| `/api/study/generate-flashcards` | `POST` | Generate interactive spaced repetition deck |
| `/api/study/exam-checklist` | `POST` | Generate syllabus revision milestones |
| `/api/study/explain-simple` | `POST` | Generate analogy-driven intuitive explanations |

---

## 💼 Interview & Resume Highlights

When presenting DrAG in engineering or AI/ML internship interviews, highlight:
1. **Retrieval-Augmented Generation (RAG) Architecture**: Preserving document metadata down to exact paragraph and page coordinates for verifiable citations.
2. **Deterministic UI Citation Navigation**: Linking frontend reader canvas state directly to backend RAG chunk offsets.
3. **Multi-Platform Backend Readiness**: Full Express integration for lightweight edge execution and complete Python FastAPI + pgvector service for cloud container deployment.
4. **Anti-Hallucination Guardrails**: Low-temperature grounding constraints and explicit negative answer policies.
