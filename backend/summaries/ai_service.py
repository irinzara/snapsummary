import os
from pathlib import Path
from django.conf import settings

_client = None

def get_client():
    global _client
    if _client is None:
        from groq import Groq
        _client = Groq(api_key=settings.OPENAI_API_KEY)
    return _client

AUDIO_VIDEO_SUPPORTED = {'.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac', '.mov', '.avi'}
TEXT_SUPPORTED = {'.pdf', '.txt'}


def extract_audio_if_needed(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    if ext in {'.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac'}:
        return file_path
    output_path = file_path.replace(ext, '_audio.mp3')
    os.system(f'ffmpeg -i "{file_path}" -vn -acodec mp3 -q:a 2 "{output_path}" -y -loglevel quiet')
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


def transcribe_audio(file_path: str) -> dict:
    audio_path = extract_audio_if_needed(file_path)
    client = get_client()
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


def process_file(summary_instance) -> None:
    try:
        file_path = summary_instance.file.path
        ext = Path(file_path).suffix.lower()

        if ext == '.pdf':
            text = extract_text_from_pdf(file_path)
            summary_instance.transcript = text
            summary_instance.language = 'text'
            summary_instance.duration_seconds = None
            summary_text = summarize_text(text, summary_instance.original_filename, 'document')

        elif ext == '.txt':
            text = extract_text_from_txt(file_path)
            summary_instance.transcript = text
            summary_instance.language = 'text'
            summary_instance.duration_seconds = None
            summary_text = summarize_text(text, summary_instance.original_filename, 'document')

        else:
            transcription = transcribe_audio(file_path)
            summary_instance.transcript = transcription['text']
            summary_instance.language = transcription.get('language', 'unknown')
            summary_instance.duration_seconds = transcription.get('duration')
            summary_text = summarize_text(transcription['text'], summary_instance.original_filename, 'audio')

        summary_instance.summary = summary_text
        summary_instance.status = 'done'
        summary_instance.save()

    except Exception as e:
        summary_instance.status = 'error'
        summary_instance.error_message = str(e)
        summary_instance.save()
        raise
