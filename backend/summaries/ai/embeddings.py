from django.conf import settings
import logging

logger = logging.getLogger(__name__)

_model = None

def get_embedding_model():
    """
    Returns the singleton instance of the SentenceTransformer model.
    Downloads the model on first run if not present.
    """
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model

def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generates embeddings for a list of texts using the locally hosted SentenceTransformer.
    """
    if not texts:
        return []
    
    model = get_embedding_model()
    # SentenceTransformer returns a numpy array, convert to list of floats for ChromaDB
    embeddings = model.encode(texts)
    return embeddings.tolist()
