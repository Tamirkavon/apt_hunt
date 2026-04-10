FROM python:3.12-slim

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir fastapi==0.115.0 "uvicorn[standard]==0.30.0" httpx==0.27.0 pydantic==2.9.0

ENV DATA_DIR=/data

CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
