# SnapSummary - Complete Project Documentation

## Table of Contents
1. [Full Tech Stack](#full-tech-stack)
2. [How the App Works](#how-the-app-works)
3. [API Integrations](#api-integrations)
4. [Database Schema](#database-schema)
5. [Authentication](#authentication)
6. [File/Media Handling](#filemedia-handling)
7. [AI/ML Components](#aiml-components)
8. [Environment Variables](#environment-variables)
9. [Deployment Setup](#deployment-setup)
10. [Known Issues & TODOs](#known-issues--todos)
11. [Current Limitations](#current-limitations)
12. [Future Modifications](#future-modifications)

---

## Full Tech Stack

### Frontend
- **Framework**: React 18.2.0
- **Build Tool**: react-scripts 5.0.1
- **HTTP Client**: axios 1.6.7
- **File Upload**: react-dropzone 14.2.3
- **Notifications**: react-hot-toast 2.4.1
- **Icons**: lucide-react 0.330.0
- **Styling**: Custom CSS (no CSS framework)
- **Package Manager**: npm

### Backend
- **Framework**: Django 4.2.9
- **API Framework**: Django REST Framework 3.14.0
- **CORS**: django-cors-headers 4.3.1
- **Security**: cryptography
- **Environment Variables**: python-dotenv 1.0.1
- **Image Processing**: Pillow 10.2.0
- **Audio Processing**: pydub 0.25.1
- **PDF Extraction**: pdfplumber 0.11.0
- **AI/ML**: groq 0.11.0 (for Whisper and LLaMA)
- **HTTP Client**: httpx 0.27.2

### AI/ML Services
- **Transcription**: Groq Whisper Large V3 (via Groq API)
- **Summarization & Chat**: LLaMA 3.3 70B Versatile (via Groq API)

### Database
- **Development/Local**: PostgreSQL 15 (via Docker)
- **Production**: SQLite (with persistent storage on Render)

### Containerization
- **Container Runtime**: Docker
- **Orchestration**: Docker Compose (local development)
- **Base Images**:
  - Backend: python:3.11-slim
  - Frontend: node (via Vercel/Render build process)

### Deployment
- **Backend Hosting**: Render (free tier, Docker runtime)
- **Frontend Hosting**: Vercel (free tier)
- **CI/CD**: Manual git push triggers deployment
- **Persistent Storage**: Render Disk (1GB for SQLite database and media files)

### Development Tools
- **Version Control**: Git
- **Code Hosting**: GitHub
- **Local Development**: Docker Desktop

---

## How the App Works

### Step-by-Step Flow

#### 1. User Uploads File
```
User drags & drops file → React Dropzone captures file
↓
Client validates file size (max 50MB) and type
↓
FormData created with file
↓
POST request to /api/upload/
```

#### 2. Backend Receives Upload
```
Django UploadView receives multipart/form-data
↓
UploadSerializer validates file (size, MIME type, extension)
↓
Summary model instance created with status='processing'
↓
File saved to media/uploads/ directory
↓
Non-daemon thread started for background processing
↓
201 response returned with Summary data
```

#### 3. Background Processing
```
Thread calls process_file(summary_instance)
↓
Based on file extension:
  - PDF: extract_text_from_pdf() using pdfplumber
  - TXT: extract_text_from_txt() using file read
  - Audio/Video: transcribe_audio() using Groq Whisper
↓
For audio/video:
  - extract_audio_if_needed() converts to MP3 using ffmpeg
  - Groq Whisper Large V3 transcribes audio
  - Returns transcript text, language, duration
↓
summarize_text() called with transcript
↓
Groq LLaMA 3.3 70B generates structured summary
↓
Summary model updated with:
  - transcript (full text)
  - summary (AI-generated)
  - language
  - duration_seconds
  - status='done'
```

#### 4. Frontend Polling
```
React polls /api/summaries/{id}/ every 3 seconds
↓
When status changes from 'processing' to 'done':
  - Polling stops
  - Success toast shown
  - Summary card displays results
  - Aira chat button becomes available
```

#### 5. Aira Chat (RAG)
```
User clicks Aira button → Chat panel opens
↓
User types question
↓
POST request to /api/summaries/{id}/chat/
↓
ChatView validates file is done and has transcript
↓
chat_with_file() called with:
  - transcript (full file content)
  - filename
  - question
↓
Groq LLaMA 3.3 70B answers based ONLY on transcript
↓
Response displayed in chat interface
```

---

## API Integrations

### Groq API (Primary AI Service)

**Purpose**: Provides both transcription (Whisper) and summarization/chat (LLaMA) capabilities

**Authentication**: 
- API Key stored in `OPENAI_API_KEY` environment variable
- Client initialized in `ai_service.py` with global singleton pattern

**Endpoints Used**:

1. **Audio Transcription**
   - Model: `whisper-large-v3`
   - Endpoint: `client.audio.transcriptions.create()`
   - Input: Audio file (binary)
   - Output: Text transcript, language, duration
   - Rate Limit: Handled with try-catch, returns user-friendly error

2. **Text Summarization**
   - Model: `llama-3.3-70b-versatile`
   - Endpoint: `client.chat.completions.create()`
   - Input: Text prompt with file content (truncated to 6000 chars)
   - Output: Structured summary (Summary, Key Points, Content Type)
   - Parameters: max_tokens=1000, temperature=0.3

3. **Chat/RAG**
   - Model: `llama-3.3-70b-versatile`
   - Endpoint: `client.chat.completions.create()`
   - Input: Transcript + user question
   - Output: Answer based on transcript only
   - Parameters: max_tokens=600, temperature=0.2

**Error Handling**:
- Rate limit/quota errors caught and converted to user-friendly messages
- All errors logged with stack traces
- Global client singleton to reuse connections

**Cost**: Free tier available with generous limits

---

## Database Schema

### Summary Model

**Table**: `summaries`

**Fields**:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | AutoField | Primary key | Auto-increment |
| `original_filename` | CharField(255) | Original uploaded filename | Required |
| `file` | FileField | Uploaded file | upload_to='uploads/' |
| `file_size` | BigIntegerField | File size in bytes | Required |
| `file_type` | CharField(20) | File type (audio/video/document) | Required |
| `status` | CharField(20) | Processing status | choices: processing/done/error |
| `error_message` | TextField | Error message if processing failed | Blank, null |
| `transcript` | TextField | Full transcript/extracted text | Blank, null |
| `summary` | TextField | AI-generated summary | Blank, null |
| `language` | CharField(50) | Detected language | Blank, null |
| `duration_seconds` | FloatField | Audio/video duration in seconds | Blank, null |
| `created_at` | DateTimeField | Creation timestamp | auto_now_add=True |
| `updated_at` | DateTimeField | Last update timestamp | auto_now=True |

**Indexes**:
- Default ordering: `-created_at` (newest first)

**Relationships**: None (single table design)

**Properties**:
- `file_size_mb`: Computed property converting bytes to MB

---

## Authentication

**Current Status**: No authentication implemented

**Security Implications**:
- API endpoints are publicly accessible
- Anyone can upload, view, delete summaries
- No user accounts or sessions
- No API keys or tokens required

**Current CORS Configuration**:
- Production: Restricted to `https://snapsummary-frontend.vercel.app`
- Development: Allows `http://localhost:3000`
- Debug mode: Allows all origins (wildcard)

**Recommendations for Future**:
- Add user authentication (Django REST Framework JWT or session-based)
- Add API key authentication for programmatic access
- Implement rate limiting per user
- Add user-specific data isolation (each user sees only their summaries)

---

## File/Media Handling

### Upload Process

**Client-Side Validation**:
- File size: Max 50MB (enforced in both frontend and backend)
- File types: Video, Audio, PDF, TXT
- MIME type checking + extension validation

**Server-Side Validation**:
- `UploadSerializer` validates:
  - File size (50MB limit)
  - MIME type (video/*, audio/*, application/pdf, text/plain)
  - File extension (mp4, mov, avi, mkv, webm, mp3, wav, ogg, aac, flac, m4a, pdf, txt)

**Storage**:
- Local development: `./backend/media/uploads/`
- Production (Render): `/app/data/media/uploads/` (persistent disk)
- File naming: Preserves original filename

### Audio Processing

**Supported Formats**: MP3, MP4, MPEG, MPGA, M4A, WAV, WebM, OGG, FLAC, MOV, AVI

**Processing Pipeline**:
1. Check if file is already MP3/WAV (supported by Whisper)
2. If not, convert to MP3 using ffmpeg:
   ```bash
   ffmpeg -i input.ext -vn -acodec mp3 -q:a 2 output.mp3 -y -loglevel quiet
   ```
3. Delete temporary MP3 after transcription
4. Fallback to original file if conversion fails

**ffmpeg Installation**:
- Dockerfile installs ffmpeg via apt-get
- Required for audio format conversion

### PDF Processing

**Library**: pdfplumber

**Process**:
1. Open PDF file
2. Iterate through all pages
3. Extract text from each page
4. Concatenate with newlines
5. Strip whitespace
6. Handle errors gracefully

### Text Processing

**Process**:
1. Open file with UTF-8 encoding
2. Ignore encoding errors
3. Read entire content
4. Strip whitespace
5. Handle errors gracefully

### File Deletion

**Process**:
1. Delete file from filesystem
2. Delete database record
3. Handle file deletion errors gracefully
4. Return 204 No Content

---

## AI/ML Components

### Transcription (Groq Whisper Large V3)

**Model**: `whisper-large-v3`

**Purpose**: Convert audio/video to text transcript

**Input**: Audio file (binary)

**Output**:
- `text`: Full transcript
- `language`: Detected language code
- `duration`: Audio duration in seconds

**Configuration**:
- Response format: verbose_json
- No custom parameters (uses defaults)

**Supported Languages**: All languages supported by Whisper

### Summarization (LLaMA 3.3 70B)

**Model**: `llama-3.3-70b-versatile`

**Purpose**: Generate structured summary from transcript

**Prompt Engineering**:
```
You are an expert at summarizing content clearly and concisely.

[Instruction] File name: "{filename}"

Your task:
1. Write a clear, concise summary (3-5 sentences) of the main content
2. List the KEY POINTS as bullet points (max 7 points)
3. Note the content type (e.g. Lecture, Interview, Report, Article, Meeting, Podcast, etc.)

Content:
{transcript[:6000]}

Format your response exactly like this:

## Summary
[Your 3-5 sentence summary here]

## Key Points
• [Point 1]
• [Point 2]
• [Point 3]

## Content Type
[e.g. Lecture / Report / Interview / Meeting / Article / Other]
```

**Parameters**:
- max_tokens: 1000
- temperature: 0.3 (low for consistency)
- System prompt: "You summarize content clearly and concisely."

**Content Truncation**: First 6000 characters of transcript (due to token limits)

### Chat/RAG (LLaMA 3.3 70B)

**Model**: `llama-3.3-70b-versatile`

**Purpose**: Answer questions about file content

**Prompt Engineering**:
```
You are a helpful assistant that answers questions based on the content of a file.

File name: "{filename}"

File content:
{transcript[:6000]}

Answer the following question based ONLY on the content above. If the answer is not in the content, say "I couldn't find that information in the file."

Question: {question}
```

**Parameters**:
- max_tokens: 600
- temperature: 0.2 (very low for factual accuracy)
- System prompt: "You answer questions based on provided file content only."

**RAG Approach**: Simple context injection (no vector database)

### Error Handling

**Rate Limit/Quota Errors**:
- Caught in all AI functions
- Converted to user-friendly message
- Logged with full error details

**General Errors**:
- Logged with stack traces
- Propagated to caller
- Status set to 'error' in database

---

## Environment Variables

### Required Variables

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `OPENAI_API_KEY` | Groq API key for AI services | Empty string | Required for transcription/summarization |
| `DJANGO_SECRET_KEY` | Django cryptographic signing | Generated by Render | Should be set in production |

### Optional Variables

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `DEBUG` | Django debug mode | False | Set to True for development |
| `ALLOWED_HOSTS` | Allowed Django hosts | * (wildcard) | Comma-separated list |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | https://snapsummary-frontend.vercel.app,http://localhost:3000 | Comma-separated list |
| `DATA_DIR` | Data directory path | BASE_DIR (local) or /app/data (Render) | For persistent storage |

### Frontend Variables

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `REACT_APP_API_URL` | Backend API URL | http://localhost:8000 | Set by Render automatically |

### .env.example

```env
OPENAI_API_KEY=your_groq_api_key_here
```

---

## Deployment Setup

### Local Development (Docker Compose)

**File**: `docker-compose.yml`

**Services**:
1. **db** (PostgreSQL 15)
   - Image: postgres:15
   - Port: 5433:5432
   - Environment: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
   - Health check: pg_isready
   - Volume: postgres_data (persistent)

2. **backend** (Django)
   - Build: ./backend
   - Port: 8000:8000
   - Environment: DJANGO_SECRET_KEY, OPENAI_API_KEY
   - Volumes: ./backend (hot reload), media_files
   - Depends on: db (healthy)
   - Command: migrate + runserver

3. **frontend** (React)
   - Build: ./frontend
   - Port: 3000:3000
   - Environment: REACT_APP_API_URL
   - Depends on: backend

**Startup Command**:
```bash
docker-compose up --build
```

### Production (Render)

**File**: `render.yaml`

**Backend Service**:
- Type: web
- Runtime: docker
- Dockerfile: ./backend/Dockerfile
- Health Check: /api/health/
- Environment Variables:
  - DJANGO_SECRET_KEY (generated)
  - OPENAI_API_KEY (synced from dashboard)
  - DEBUG: False
  - ALLOWED_HOSTS: snapsummary-backend.onrender.com
  - CORS_ALLOWED_ORIGINS: https://snapsummary-frontend.vercel.app
  - DATA_DIR: /app/data
- Disk: 1GB mounted at /app/data (persistent storage)

**Frontend Service**:
- Type: web
- Runtime: node
- Root Directory: frontend
- Build Command: npm install && npm run build
- Start Command: npx serve -s build -l $PORT
- Environment Variables:
  - REACT_APP_API_URL (from backend service host)

### Dockerfile (Backend)

**Base Image**: python:3.11-slim

**System Packages**:
- ffmpeg (audio processing)
- gcc (compilation)
- pkg-config (library configuration)

**Python Dependencies**:
- All packages from requirements.txt

**Configuration**:
- DATA_DIR: /app/data
- DJANGO_SETTINGS_MODULE: snapsummary.settings
- Expose: 8000

**Build Steps**:
1. Install system packages
2. Install Python dependencies
3. Copy application code
4. Create data directory
5. Collect static files (with error handling)
6. Run migrations on startup
7. Start server on 0.0.0.0:${PORT}

### Deployment Process

**Backend Deployment**:
1. Push to GitHub main branch
2. Render detects changes
3. Builds Docker image
4. Runs migrations
5. Starts server
6. Health check verifies /api/health/

**Frontend Deployment**:
1. Push to GitHub main branch
2. Vercel detects changes
3. Installs dependencies
4. Builds React app
5. Deploys to edge network

---

## Known Issues & TODOs

### Known Issues

1. **Non-Daemon Threads**: Background processing uses non-daemon threads which may not complete if the main process exits on Render
   - **Impact**: Files may get stuck in 'processing' state
   - **Current Mitigation**: Non-daemon threads should complete, but not guaranteed on all platforms
   - **Future Fix**: Use Celery + Redis for reliable background processing

2. **SQLite in Production**: Using SQLite on Render instead of PostgreSQL
   - **Impact**: Not ideal for production, but works for free tier
   - **Current Mitigation**: Persistent storage prevents data loss
   - **Future Fix**: Migrate to PostgreSQL with proper connection pooling

3. **No Authentication**: Public API with no access control
   - **Impact**: Anyone can use the service
   - **Current Mitigation**: CORS restrictions limit frontend access
   - **Future Fix**: Add user authentication and rate limiting

4. **Content Truncation**: AI processing limited to 6000 characters
   - **Impact**: Long files may not be fully processed
   - **Current Mitigation**: First 6000 chars used for summarization
   - **Future Fix**: Implement chunking and summarization of chunks

5. **os.system() for ffmpeg**: Security risk with shell injection
   - **Impact**: Potential security vulnerability
   - **Current Mitigation**: File paths are controlled internally
   - **Future Fix**: Use subprocess with proper escaping

### TODOs

1. Add user authentication (Django REST Framework JWT)
2. Implement rate limiting per user
3. Add vector database for better RAG (e.g., Pinecone, Weaviate)
4. Implement chunking for long files
5. Add streaming responses for chat
6. Add support for more file formats (DOCX, PPTX, etc.)
7. Implement proper background task queue (Celery + Redis)
8. Add monitoring and alerting (Sentry, etc.)
9. Add analytics and usage tracking
10. Implement file compression for storage optimization

---

## Current Limitations

### Technical Limitations

1. **File Size**: Max 50MB (due to memory constraints and API limits)
2. **Content Length**: First 6000 characters only for AI processing
3. **Concurrent Processing**: No queue system, limited by server resources
4. **Database**: SQLite not optimized for high concurrency
5. **Storage**: 1GB limit on Render free tier
6. **No Caching**: AI responses not cached (repeated queries hit API)
7. **No Streaming**: Chat responses are not streamed (user waits for full response)
8. **Single User**: No multi-user support (all data shared)

### AI/ML Limitations

1. **Model Selection**: Fixed to LLaMA 3.3 70B (no model switching)
2. **No Fine-tuning**: Using base models without customization
3. **No Context Window Management**: Simple truncation, no smart chunking
4. **No RAG with Vector DB**: Simple context injection only
5. **No Few-Shot Examples**: Basic prompts without examples
6. **No Response Validation**: No checking if AI follows format instructions

### Platform Limitations

1. **Render Free Tier**: Limited CPU, memory, and disk
2. **Groq Free Tier**: Rate limits and quotas apply
3. **No CDN**: Media files served directly from backend
4. **No Backup**: No automated database backups
5. **No Monitoring**: No performance monitoring or error tracking

---

## Future Modifications

### Short-Term (1-3 months)

1. **Authentication System**
   - Add Django REST Framework JWT
   - Implement user registration/login
   - Add user-specific data isolation
   - Implement rate limiting per user

2. **Background Task Queue**
   - Add Celery + Redis
   - Replace threading with proper queue
   - Add task monitoring and retry logic
   - Implement task status tracking

3. **Improved File Processing**
   - Implement chunking for long files
   - Add progress updates during processing
   - Support for more file formats (DOCX, PPTX)
   - Better error handling and recovery

### Medium-Term (3-6 months)

1. **Vector Database for RAG**
   - Integrate Pinecone or Weaviate
   - Implement semantic search
   - Add document chunking and embedding
   - Improve chat accuracy with retrieval

2. **Caching Layer**
   - Add Redis for caching AI responses
   - Implement cache invalidation
   - Reduce API costs and improve speed
   - Cache frequently accessed summaries

3. **Monitoring & Analytics**
   - Add Sentry for error tracking
   - Implement usage analytics
   - Add performance monitoring
   - Create admin dashboard

### Long-Term (6-12 months)

1. **Multi-Model Support**
   - Allow users to choose AI models
   - Add support for other providers (OpenAI, Anthropic)
   - Implement model comparison
   - Add cost estimation

2. **Advanced Features**
   - Implement streaming responses
   - Add real-time transcription
   - Support for live audio/video
   - Add collaboration features (sharing)

3. **Scalability**
   - Migrate to PostgreSQL
   - Implement horizontal scaling
   - Add load balancing
   - Implement CDN for media files

4. **Monetization**
   - Implement subscription tiers
   - Add usage-based pricing
   - Implement payment integration
   - Add enterprise features

---

## File-by-File Breakdown

### Backend Files

#### `backend/requirements.txt`
- Lists all Python dependencies
- Django 4.2.9, DRF 3.14.0, groq 0.11.0, etc.
- No version pinning for some packages (cryptography, etc.)

#### `backend/manage.py`
- Django management script
- Standard Django boilerplate
- No custom modifications

#### `backend/snapsummary/settings.py`
- Django project configuration
- Database: SQLite with persistent storage
- CORS: Configured for production and development
- Static files: Configured for collection
- Logging: Console logging with verbose format
- Environment variables: All have fallbacks
- Security: DEBUG controlled by environment variable

#### `backend/snapsummary/urls.py`
- Root URL configuration
- Includes admin and API URLs
- Serves media files in development
- No custom middleware

#### `backend/snapsummary/wsgi.py`
- WSGI application entry point
- Standard Django boilerplate
- No custom modifications

#### `backend/summaries/models.py`
- Summary model definition
- Single table design
- File upload handling
- Computed property for file size in MB

#### `backend/summaries/views.py`
- API endpoint implementations
- UploadView: Handles file uploads
- SummaryDetailView: Get/delete summaries
- HistoryView: List all summaries
- StatsView: Dashboard statistics
- HealthView: Health check endpoint
- ChatView: Aira chat functionality
- Uses threading for background processing

#### `backend/summaries/urls.py`
- App-specific URL patterns
- Maps views to endpoints
- No custom URL converters

#### `backend/summaries/serializers.py`
- DRF serializers
- SummarySerializer: Model serializer
- UploadSerializer: File upload validation
- File size and type validation

#### `backend/summaries/ai_service.py`
- AI service implementations
- get_client(): Groq client singleton
- extract_audio_if_needed(): Audio conversion
- extract_text_from_pdf(): PDF text extraction
- extract_text_from_txt(): Text file reading
- transcribe_audio(): Whisper transcription
- summarize_text(): LLaMA summarization
- chat_with_file(): RAG chat
- process_file(): Main processing orchestration
- Error handling and logging throughout

#### `backend/Dockerfile`
- Docker image definition
- Multi-stage build (single stage actually)
- Installs ffmpeg, gcc, pkg-config
- Sets up data directory
- Collects static files
- Runs migrations on startup
- Binds to 0.0.0.0:${PORT}

### Frontend Files

#### `frontend/package.json`
- React dependencies
- Build scripts
- Proxy configuration for local development

#### `frontend/src/App.js`
- Main React component
- State management for uploads, history, chat
- File upload handling with react-dropzone
- Polling for processing status
- Aira chat interface
- Summary card component
- History view
- Toast notifications

#### `frontend/src/App.css`
- Custom CSS styling
- Responsive design
- Dark theme
- Custom animations

#### `frontend/src/index.js`
- React entry point
- Standard React boilerplate

#### `frontend/src/index.css`
- Global CSS styles
- CSS variables for theming

#### `frontend/public/index.html`
- HTML template
- Meta tags and title

### Configuration Files

#### `docker-compose.yml`
- Local development orchestration
- PostgreSQL, backend, frontend services
- Volume mounts for persistence
- Health checks
- Environment variables

#### `render.yaml`
- Production deployment configuration
- Backend and frontend services
- Environment variables
- Persistent storage configuration
- Health checks

#### `.env.example`
- Example environment variables
- Only OPENAI_API_KEY shown

#### `README.md`
- Project documentation
- Features, tech stack, setup instructions
- API endpoints, how it works
- Project structure

---

## Summary

SnapSummary is a Django + React application that uses Groq's AI services (Whisper and LLaMA) to transcribe audio/video and summarize documents. It features a chat assistant (Aira) that can answer questions about uploaded files using RAG. The app is deployed on Render (backend) and Vercel (frontend) using Docker for containerization. It currently uses SQLite with persistent storage on Render's free tier.

**Key Strengths**:
- Simple, clean architecture
- Good error handling and logging
- Responsive UI with modern design
- Free tier deployment
- Comprehensive AI capabilities

**Key Weaknesses**:
- No authentication
- Threading-based background processing
- SQLite in production
- No vector database for RAG
- Limited to 6000 characters for AI processing

**Best Suited For**:
- Personal use
- Small-scale deployments
- Proof of concept
- Learning Django + AI integration

**Not Recommended For**:
- Enterprise applications
- High-traffic scenarios
- Multi-user SaaS
- Production without modifications
