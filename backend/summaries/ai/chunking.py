from langchain_text_splitters import RecursiveCharacterTextSplitter
from django.conf import settings

def chunk_text(text: str) -> list[str]:
    """
    Chunks the given text into smaller pieces using RecursiveCharacterTextSplitter.
    We use RecursiveCharacterTextSplitter because it tries to keep paragraphs, 
    sentences, and words together in order, preserving semantic meaning better than naive splitting.
    """
    if not text:
        return []
        
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    
    chunks = splitter.split_text(text)
    return chunks
