import logging
from django.conf import settings
from .embeddings import generate_embeddings
from summaries.models import DocumentChunk
from pgvector.django import CosineDistance

logger = logging.getLogger(__name__)

def retrieve_context(query: str, summary_id: int, top_k: int = None) -> list[str]:
    """
    Embeds the user query and retrieves the top_k most similar chunks for the specific file using pgvector.
    """
    if top_k is None:
        top_k = getattr(settings, 'RAG_TOP_K', 5)
        
    try:
        query_embedding = generate_embeddings([query])[0]
        
        results = DocumentChunk.objects.filter(summary_id=summary_id) \
            .order_by(CosineDistance('embedding', query_embedding))[:top_k]
            
        retrieved_chunks = [chunk.content for chunk in results]
        
        if retrieved_chunks:
            logger.info(f"Retrieved {len(retrieved_chunks)} chunks for query: '{query}'")
            return retrieved_chunks
            
        logger.info("No matching chunks found.")
        return []
        
    except Exception as e:
        logger.error(f"Error retrieving context: {e}")
        return []
