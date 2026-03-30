# SnapSummary 🎙️

AI-powered video & audio summarizer.
Upload any file → Whisper transcribes → GPT-4 summarizes.

**Stack:** Django REST + React + MySQL + Docker

---

## Setup (5 minutes)

### 1. Prerequisites
- Docker Desktop installed → https://www.docker.com/products/docker-desktop/
- OpenAI API key → https://platform.openai.com/api-keys

### 2. Clone / download this project

### 3. Add your OpenAI key
```bash
cp .env.example .env
# Open .env and replace: your_openai_api_key_here
```

### 4. Run
```bash
docker-compose up --build
```

### 5. Open
- Frontend → http://localhost:3000
- Django Admin → http://localhost:8000/admin
- API → http://localhost:8000/api/

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/upload/ | Upload video/audio file |
| GET | /api/summaries/:id/ | Poll processing status |
| GET | /api/history/ | All past summaries |
| DELETE | /api/summaries/:id/ | Delete a summary |
| GET | /api/stats/ | Dashboard counts |

---

## Supported File Types
- **Video:** MP4, MOV, AVI, MKV, WebM
- **Audio:** MP3, WAV, OGG, AAC, FLAC, M4A
- **Max size:** 50MB

---

## Project Structure
```
snapsummary/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   ├── snapsummary/
│   │   ├── settings.py
│   │   └── urls.py
│   └── summaries/
│       ├── models.py        ← MySQL schema
│       ├── views.py         ← API endpoints
│       ├── serializers.py   ← DRF serializers
│       ├── ai_service.py    ← Whisper + GPT-4 logic
│       └── urls.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.js           ← Main React UI
        └── App.css          ← Styles
```

---

## How it works
1. User drops a file in the React UI
2. Django saves the file + creates a DB record (status: processing)
3. A background thread sends the file to **OpenAI Whisper** for transcription
4. The transcript is sent to **GPT-4** for structured summarization
5. Results saved to **MySQL** — React polls every 3 seconds until done
6. User sees: Summary + Key Points + full transcript (expandable)
