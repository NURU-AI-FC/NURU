FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY *.py .
COPY lang ./lang
RUN useradd -r nuru
USER nuru
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host ${HOST:-::} --port ${PORT:-8000}"]
