import logging
import os
import google.generativeai as genai

logger = logging.getLogger(__name__)

def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generates embeddings for a list of texts using Google's text-embedding-004.
    """
    if not texts:
        return []
    
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        logger.warning("GOOGLE_API_KEY not found. Embeddings will fail.")
        
    genai.configure(api_key=api_key)
    
    result = genai.embed_content(
        model="models/gemini-embedding-001",
        content=texts,
        task_type="retrieval_document",
    )
    
    return result['embedding']
