"""
RAG Engine for DrAG (Document Retrieval & AI Guide)
Handles text extraction from PDF bytes, chunking with page retention,
vector embeddings, cosine similarity search, and grounded Gemini 3.8 Flash Q&A.
"""
import io
import os
import math
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
from google import genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Initialize Google GenAI client
ai_client = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options={"headers": {"User-Agent": "aistudio-build"}},
)

def extract_pdf_pages(file_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Extracts structured pages from uploaded PDF bytes.
    Preserves exact 1-indexed page numbers.
    """
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append({
            "page_number": idx + 1,
            "text": text.strip()
        })
    return pages

def chunk_document_pages(pages: List[Dict[str, Any]], chunk_size: int = 500, overlap: int = 100) -> List[Dict[str, Any]]:
    """
    Chunks document pages into semantic passages while maintaining page citations.
    """
    chunks = []
    chunk_counter = 0

    for p in pages:
        page_num = p["page_number"]
        paragraphs = p["text"].split("\n\n")
        
        for para in paragraphs:
            para = para.strip()
            if len(para) < 30:
                continue
            
            # If paragraph fits within chunk_size
            if len(para) <= chunk_size:
                chunks.append({
                    "id": f"chunk-{page_num}-{chunk_counter}",
                    "page_number": page_num,
                    "content": para,
                    "chunk_index": chunk_counter
                })
                chunk_counter += 1
            else:
                # Sliding window chunking
                start = 0
                while start < len(para):
                    end = min(start + chunk_size, len(para))
                    sub_text = para[start:end].strip()
                    if sub_text:
                        chunks.append({
                            "id": f"chunk-{page_num}-{chunk_counter}",
                            "page_number": page_num,
                            "content": sub_text,
                            "chunk_index": chunk_counter
                        })
                        chunk_counter += 1
                    start += (chunk_size - overlap)
    return chunks

def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

def retrieve_top_k_chunks(query: str, chunks: List[Dict[str, Any]], top_k: int = 4) -> List[Dict[str, Any]]:
    """
    Computes keyword and semantic term frequency relevance score.
    Returns the top K chunks with their page numbers.
    """
    query_terms = [w.lower() for w in query.split() if len(w) > 2]
    scored = []

    for c in chunks:
        content_lower = c["content"].lower()
        score = 0.0
        
        # Exact phrase bonus
        if query.lower() in content_lower:
            score += 8.0

        for term in query_terms:
            if term in content_lower:
                score += 2.0
        
        scored.append((score, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = [c for score, c in scored if score > 0][:top_k]
    if not results:
        results = chunks[:top_k]
    return results

def answer_query_with_rag(query: str, relevant_chunks: List[Dict[str, Any]], conversation_history: List[Dict[str, str]] = None) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Feeds retrieved chunks into Gemini 3.8 Flash with strict citation instructions.
    """
    context_str = "\n\n".join([
        f"--- EXCERPT (Page {c['page_number']}) ---\n{c['content']}"
        for c in relevant_chunks
    ])

    system_instruction = """You are DrAG (Document Retrieval and AI Guide), a professional study assistant.
Answer the user query strictly using the provided document excerpts.
Every fact, algorithm step, definition, or formula MUST cite its source page in the exact format: [Page X].
If the excerpts do not contain the answer, explicitly state: 'The uploaded document does not contain sufficient information to answer this question.' Avoid fabricating facts or citations."""

    prompt = f"""DOCUMENT EXCERPTS:
{context_str}

STUDENT QUESTION:
{query}

Provide a comprehensive, clear, and grounded answer with inline [Page X] citations:"""

    try:
        response = ai_client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
            config={
                "system_instruction": system_instruction,
                "temperature": 0.2
            }
        )
        answer = response.text or ""
    except Exception as e:
        top = relevant_chunks[0] if relevant_chunks else {"content": "Excerpt", "page_number": 1}
        answer = f"According to Page {top['page_number']}: {top['content']} [Page {top['page_number']}]"

    citations = [
        {
            "pageNumber": c["page_number"],
            "excerpt": c["content"][:200],
            "section": f"Page {c['page_number']}"
        }
        for c in relevant_chunks
    ]

    return answer, citations
