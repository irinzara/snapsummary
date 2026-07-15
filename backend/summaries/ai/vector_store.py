import logging
from summaries.models import DocumentChunk

logger = logging.getLogger(__name__)

def store_chunks(summary_id: int, filename: str, chunks: list[str], embeddings: list[list[float]]):
    """
    Stores chunks and their embeddings into Postgres via pgvector.
    """
    if not chunks or not embeddings:
        return

    chunk_objects = []
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        chunk_objects.append(
            DocumentChunk(
                summary_id=summary_id,
                filename=filename,
                content=chunk,
                chunk_index=i,
                embedding=emb
            )
        )
        
    try:
        DocumentChunk.objects.bulk_create(chunk_objects)
        logger.info(f"Stored {len(chunks)} chunks in Postgres for summary {summary_id}")
    except Exception as e:
        logger.error(f"Failed to store chunks in Postgres: {e}")
        raise
