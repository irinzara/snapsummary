import os
import logging
from .llm_client import get_client
from .extractors import extract_audio_if_needed

logger = logging.getLogger(__name__)

def transcribe_audio(file_path: str) -> dict:
    audio_path = extract_audio_if_needed(file_path)
    client = get_client()
    try:
        with open(audio_path, 'rb') as f:
            response = client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=f,
                response_format="verbose_json",
            )
        if audio_path != file_path and os.path.exists(audio_path):
            os.remove(audio_path)
        return {
            'text': response.text,
            'language': getattr(response, 'language', 'unknown'),
            'duration': getattr(response, 'duration', None),
        }
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        if "rate limit" in str(e).lower() or "quota" in str(e).lower():
            raise RuntimeError("Groq API rate limit or quota exceeded. Please try again later or upgrade your API plan.")
        raise

def summarize_text(text: str, filename: str, content_type: str = 'auto') -> str:
    client = get_client()
    if content_type == 'document':
        instruction = "The following is extracted text from a document."
    else:
        instruction = "The following is a transcript from an audio/video file."

    prompt = f"""You are an expert at summarizing content clearly and concisely.

{instruction} File name: "{filename}"

Your task:
1. Write a clear, concise summary (3-5 sentences) of the main content
2. List the KEY POINTS as bullet points (max 7 points)
3. Note the content type (e.g. Lecture, Interview, Report, Article, Meeting, Podcast, etc.)

Content:
{text[:6000]}

Format your response exactly like this:

## Summary
[Your 3-5 sentence summary here]

## Key Points
• [Point 1]
• [Point 2]
• [Point 3]

## Content Type
[e.g. Lecture / Report / Interview / Meeting / Article / Other]
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You summarize content clearly and concisely."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        if "rate limit" in str(e).lower() or "quota" in str(e).lower():
            raise RuntimeError("Groq API rate limit or quota exceeded. Please try again later or upgrade your API plan.")
        raise
