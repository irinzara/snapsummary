import os
import chromadb
from chromadb.config import Settings as ChromaSettings
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

_chroma_client = None

def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        persist_dir = settings.CHROMA_PERSIST_DIR
        os.makedirs(persist_dir, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=persist_dir)
    return _chroma_client

def get_collection():
    collection_name = getattr(settings, 'CHROMA_COLLECTION_NAME', 'snapsummary_chunks')
    client = get_chroma_client()
    return client.get_or_create_collection(name=collection_name)

def store_chunks(summary_id: int, filename: str, chunks: list[str], embeddings: list[list[float]]):
    """
    Stores chunks and their embeddings into ChromaDB with metadata.
    """
    if not chunks or not embeddings:
        return

    collection = get_collection()
    
    ids = []
    metadatas = []
    
    for i in range(len(chunks)):
        ids.append(f"{summary_id}_{i}")
        metadatas.append({
            "summary_id": summary_id,
            "filename": filename,
            "chunk_index": i
        })
        
    try:
        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=chunks
        )
        logger.info(f"Stored {len(chunks)} chunks in ChromaDB for summary {summary_id}")
    except Exception as e:
        logger.error(f"Failed to store chunks in ChromaDB: {e}")
        raise
