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

CMD ["python", "pipecat-server.py"]

