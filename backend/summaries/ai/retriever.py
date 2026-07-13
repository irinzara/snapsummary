import logging
from django.conf import settings
from .vector_store import get_collection
from .embeddings import generate_embeddings

logger = logging.getLogger(__name__)

def retrieve_context(query: str, summary_id: int, top_k: int = None) -> list[str]:
    """
    Embeds the user query and retrieves the top_k most similar chunks for the specific file.
    """
    if top_k is None:
        top_k = getattr(settings, 'RAG_TOP_K', 5)
        
    try:
        query_embedding = generate_embeddings([query])[0]
        collection = get_collection()
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where={"summary_id": summary_id}
        )
        
        # Results['documents'] is a list of lists (one list per query)
        if results and results.get('documents') and results['documents'][0]:
            retrieved_chunks = results['documents'][0]
            logger.info(f"Retrieved {len(retrieved_chunks)} chunks for query: '{query}'")
            return retrieved_chunks
        
        logger.info("No matching chunks found.")
        return []
        
    except Exception as e:
        logger.error(f"Error retrieving context: {e}")
        return []
