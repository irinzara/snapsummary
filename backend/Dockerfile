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
ENV DJANGO_SETTINGS_MODULE=snapsummary.settings

EXPOSE 8000

# Collect static files and run migrations
RUN python manage.py collectstatic --noinput || true

CMD sh -c "python manage.py migrate --verbosity 2 && python manage.py runserver 0.0.0.0:${PORT:-8000} --verbosity 2"
