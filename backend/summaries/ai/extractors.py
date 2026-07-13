import os
import subprocess
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def extract_audio_if_needed(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    if ext in {'.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac'}:
        return file_path
    
    output_path = file_path.replace(ext, '_audio.mp3')
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-i",
                file_path,
                "-vn",
                "-acodec",
                "mp3",
                "-q:a",
                "2",
                output_path,
                "-y",
                "-loglevel",
                "quiet"
            ],
            check=True
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"FFMPEG audio extraction failed: {e}")
        raise RuntimeError(f"Audio extraction failed: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during audio extraction: {e}")
        raise
        
    return output_path if os.path.exists(output_path) else file_path

def extract_text_from_pdf(file_path: str) -> str:
    try:
        import pdfplumber
        text = ''
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + '\n'
        return text.strip()
    except Exception as e:
        raise RuntimeError(f"Failed to extract PDF text: {e}")

def extract_text_from_txt(file_path: str) -> str:
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read().strip()
    except Exception as e:
        raise RuntimeError(f"Failed to read text file: {e}")
