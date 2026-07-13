import logging
import time
from .chunking import chunk_text
from .embeddings import generate_embeddings
from .vector_store import store_chunks
from .retriever import retrieve_context
from .prompts import RAG_SYSTEM_PROMPT, RAG_USER_PROMPT_TEMPLATE
from .llm_client import get_client

logger = logging.getLogger(__name__)

def index_document(transcript: str, summary_id: int, filename: str):
    """
    End-to-end pipeline to chunk, embed, and store a document.
    """
    if not transcript:
        logger.warning(f"Empty transcript for summary {summary_id}, skipping indexing.")
        return
        
    logger.info(f"Indexing started for summary {summary_id} ({filename})")
    start_time = time.time()
    
    # 1. Chunking
    chunks = chunk_text(transcript)
    logger.info(f"Generated {len(chunks)} chunks for summary {summary_id}")
    
    if not chunks:
        return
        
    # 2. Embeddings
    logger.info(f"Generating embeddings for {len(chunks)} chunks...")
    try:
        embeddings = generate_embeddings(chunks)
    except Exception as e:
        logger.error(f"Failed to generate embeddings: {e}")
        return
    
    # 3. Store in Vector DB
    try:
        store_chunks(summary_id, filename, chunks, embeddings)
    except Exception as e:
        logger.error(f"Failed to store chunks: {e}")
        return
    
    logger.info(f"Indexed {len(chunks)} chunks")


def ask_question(question: str, summary_id: int, filename: str) -> str:
    """
    End-to-end RAG pipeline for answering a user's question.
    """
    start_time = time.time()
    
    # 1. Retrieve Context
    retrieved_chunks = retrieve_context(question, summary_id)
    retrieval_latency = time.time() - start_time
    logger.info(f"Retrieval latency: {retrieval_latency:.3f} seconds.")
    
    if not retrieved_chunks:
        return "I couldn't find any relevant information in the file to answer your question."
        
    # Combine chunks into a single context string
    context = "\n\n---\n\n".join(retrieved_chunks)
    
    # 2. Construct Prompt
    user_content = RAG_USER_PROMPT_TEMPLATE.format(
        filename=filename,
        context=context,
        question=question
    )
    
    # 3. Query LLM
    client = get_client()
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": RAG_SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            max_tokens=600,
            temperature=0.2,
        )
        answer = response.choices[0].message.content.strip()
        return answer
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        if "rate limit" in str(e).lower() or "quota" in str(e).lower():
            raise RuntimeError("Groq API rate limit or quota exceeded. Please try again later or upgrade your API plan.")
        raise
