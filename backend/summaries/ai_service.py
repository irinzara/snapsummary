import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def process_file(summary_instance) -> None:
    from .ai.extractors import extract_text_from_pdf, extract_text_from_txt
    from .ai.summarizer import transcribe_audio, summarize_text
    from .ai.rag_service import index_document
    try:
        file_path = summary_instance.file.path
        ext = Path(file_path).suffix.lower()
        logger.info(f"Processing file: {summary_instance.original_filename}, type: {ext}")

        if ext == '.pdf':
            text = extract_text_from_pdf(file_path)
            if not text.strip():
                raise RuntimeError("Could not extract any text from this PDF. It may be a scanned or image-based file.")
            summary_instance.transcript = text
            summary_instance.language = 'text'
            summary_instance.duration_seconds = None
            doc_type = 'document'
        elif ext == '.txt':
            text = extract_text_from_txt(file_path)
            if not text.strip():
                raise RuntimeError("The text file is empty.")
            summary_instance.transcript = text
            summary_instance.language = 'text'
            summary_instance.duration_seconds = None
            doc_type = 'document'
        else:
            transcription = transcribe_audio(file_path)
            text = transcription['text']
            if not text.strip():
                raise RuntimeError("Could not transcribe any audio from this file.")
            summary_instance.transcript = text
            summary_instance.language = transcription.get('language', 'unknown')
            summary_instance.duration_seconds = transcription.get('duration')
            doc_type = 'audio'

        # 1. Persist the transcript immediately
        summary_instance.save(update_fields=['transcript', 'language', 'duration_seconds'])
        
        # 2. Verify persistence by refreshing from the database
        summary_instance.refresh_from_db()
        transcript_len = len(summary_instance.transcript) if summary_instance.transcript else 0
        logger.info(f"Transcript length: {transcript_len} characters")

        # 3. RAG Indexing BEFORE Summarization
        try:
            logger.info("Indexing document...")
            index_document(summary_instance.transcript, summary_instance.id, summary_instance.original_filename)
        except Exception as e:
            logger.error(f"Failed to index document for RAG: {str(e)}")

        # 4. Perform Summarization
        summary_text = summarize_text(text, summary_instance.original_filename, doc_type)
        summary_instance.summary = summary_text
        summary_instance.status = 'done'
        summary_instance.save(update_fields=['summary', 'status'])
        
        logger.info(f"Successfully processed: {summary_instance.original_filename}")

    except Exception as e:
        logger.error(f"Error processing {summary_instance.original_filename}: {str(e)}", exc_info=True)
        summary_instance.status = 'error'
        summary_instance.error_message = str(e)
        summary_instance.save(update_fields=['status', 'error_message'])
        raise
