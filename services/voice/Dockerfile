FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pipecat-server.py .
COPY llm ./llm
COPY tts ./tts

# Generate gRPC stubs during image build.
RUN python -m grpc_tools.protoc -I. --python_out=./tts --grpc_python_out=./tts tts/kokoro.proto

EXPOSE 8101

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8101/health', timeout=4)" || exit 1

CMD ["python", "pipecat-server.py"]

