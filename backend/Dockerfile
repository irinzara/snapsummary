FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    gcc \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/data

ENV DATA_DIR=/app/data

EXPOSE 8000

# Default command for web service
CMD sh -c "python manage.py migrate --verbosity 2 && python manage.py runserver 0.0.0.0:${PORT:-8000} --verbosity 2"
