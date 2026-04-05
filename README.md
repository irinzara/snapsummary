# SnapSummary ⚡

> Upload any file. Get the gist.

An AI-powered summarization app that transcribes audio/video and extracts text from PDFs and TXT files — then summarizes them using LLaMA 3.3 70B. Includes **Aira**, an AI chat assistant that lets you ask questions about your uploaded file.

🔗 **Live Demo:** [snapsummary-frontend.vercel.app](https://snapsummary-frontend.vercel.app)

---

## Features

- 🎙️ **Audio & Video** — transcribed using Groq Whisper Large V3
- 📄 **PDF & TXT** — text extracted and summarized directly
- 🤖 **AI Summarization** — structured summary + key points via LLaMA 3.3 70B
- 💬 **Aira Chat** — ask questions about your file using RAG
- 📋 **History** — all past summaries saved to MySQL
- 📥 **Export** — download summary as .txt
- 📱 **Mobile Responsive** — works on all screen sizes

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Axios, React Dropzone, Lucide React |
| Backend | Django 4.2, Django REST Framework |
| AI — Transcription | Groq Whisper Large V3 |
| AI — Summarization & Chat | LLaMA 3.3 70B via Groq API |
| PDF Extraction | pdfplumber |
| Database | MySQL 8.0 |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Database Hosting | Railway |

---

## Supported File Types

| Type | Formats |
|------|---------|
| Video | MP4, MOV, AVI, MKV, WebM |
| Audio | MP3, WAV, OGG, AAC, FLAC, M4A |
| Document | PDF, TXT |
| Max size | 50MB |

---

## Run Locally (5 minutes)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Groq API key](https://console.groq.com) (free)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/irinzara/snapsummary.git
cd snapsummary

# 2. Add your Groq API key
cp .env.example .env
# Open .env and set: OPENAI_API_KEY=your_groq_key_here

# 3. Start everything
docker-compose up --build

# 4. Open the app
# Frontend  → http://localhost:3000
# API       → http://localhost:8000/api/
# Admin     → http://localhost:8000/admin
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/` | Upload a file for processing |
| GET | `/api/summaries/:id/` | Poll processing status |
| POST | `/api/summaries/:id/chat/` | Chat with Aira about a file |
| GET | `/api/history/` | All past summaries |
| DELETE | `/api/summaries/:id/` | Delete a summary |
| GET | `/api/stats/` | Dashboard counts |

---

## How It Works

```
User uploads file
      ↓
Django saves file → DB record (status: processing)
      ↓
Background thread starts
      ↓
      ├── Audio/Video → Groq Whisper Large V3 → transcript
      └── PDF/TXT    → pdfplumber → extracted text
                              ↓
                    LLaMA 3.3 70B → structured summary
                              ↓
                    Saved to MySQL (status: done)
                              ↓
              React polls every 3s → shows result
                              ↓
              Aira chat available → ask questions via RAG
```

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
│   └── summaries/
│       ├── models.py        ← MySQL schema
│       ├── views.py         ← API endpoints + chat
│       ├── serializers.py   ← DRF serializers
│       ├── ai_service.py    ← Whisper + LLaMA + RAG
│       └── urls.py
└── frontend/
    └── src/
        ├── App.js           ← React UI + Aira chat
        └── App.css          ← Styles
```

---

## CI/CD Pipeline

Every push to `main`:
1. GitHub Actions runs Django checks
2. On success → triggers Render deploy (backend)
3. On success → triggers Vercel deploy (frontend)

---

## Environment Variables

```env
OPENAI_API_KEY=your_groq_api_key   # Groq API key (used for Whisper + LLaMA)
DJANGO_SECRET_KEY=your_secret_key
DB_NAME=snapsummary
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_PORT=3306
```
