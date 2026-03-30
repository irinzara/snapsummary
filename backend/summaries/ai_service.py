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

SUPPORTED = {'.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac'}

def extract_audio_if_needed(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    if ext in SUPPORTED:
        return file_path
    output_path = file_path.replace(ext, '_audio.mp3')
    os.system(f'ffmpeg -i "{file_path}" -vn -acodec mp3 -q:a 2 "{output_path}" -y -loglevel quiet')
    return output_path if os.path.exists(output_path) else file_path

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

def summarize_transcript(transcript: str, filename: str) -> str:
    client = get_client()
    prompt = f"""You are an expert at summarizing audio and video content.

The following is a transcript from a file named: "{filename}"

Your task:
1. Write a clear, concise summary (3-5 sentences) of the main content
2. List the KEY POINTS as bullet points (max 7 points)
3. Note the tone/style (e.g. lecture, interview, podcast, meeting)

Transcript:
{transcript}

Format your response exactly like this:

## Summary
[Your 3-5 sentence summary here]

## Key Points
• [Point 1]
• [Point 2]
• [Point 3]

## Content Type
[e.g. Lecture / Interview / Meeting / Podcast / Other]
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You summarize audio/video transcripts clearly and concisely."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=800,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()

def process_file(summary_instance) -> None:
    try:
        file_path = summary_instance.file.path
        transcription = transcribe_audio(file_path)
        summary_text = summarize_transcript(transcription['text'], summary_instance.original_filename)
        summary_instance.transcript = transcription['text']
        summary_instance.summary = summary_text
        summary_instance.language = transcription.get('language', 'unknown')
        summary_instance.duration_seconds = transcription.get('duration')
        summary_instance.status = 'done'
        summary_instance.save()
    except Exception as e:
        summary_instance.status = 'error'
        summary_instance.error_message = str(e)
        summary_instance.save()
        raise
