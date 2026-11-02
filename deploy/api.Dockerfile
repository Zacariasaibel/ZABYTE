FROM python:3.13.18-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements*.txt ./backend/
RUN python -m pip install --no-cache-dir -r backend/requirements-production.txt \
    && useradd --uid 10001 --create-home shop \
    && mkdir /data /static && chown shop:shop /data /static
COPY backend/ ./backend/
COPY scripts/backup-database.py scripts/import-database.py ./scripts/
USER shop
WORKDIR /app/backend
CMD ["python", "serve.py"]
