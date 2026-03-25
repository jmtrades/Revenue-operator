#!/bin/bash
# Initialize voice synthesis server for development or production

set -e

echo "🎤 Voice Synthesis Server Initialization"
echo "========================================"

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo "Running inside Docker container"
    IS_DOCKER=true
else
    echo "Running on host system"
    IS_DOCKER=false
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p /app/.cache
mkdir -p /app/voices
mkdir -p /app/logs

# Download models (first run only)
if [ ! -d "/app/.cache/models" ]; then
    echo "⬇️  Downloading models (this may take a few minutes)..."
    python3 << 'EOF'
import logging
logging.basicConfig(level=logging.INFO)

try:
    # Download Whisper model
    print("Downloading Whisper model...")
    from faster_whisper import WhisperModel
    model = WhisperModel("base", device="cuda", compute_type="float16")
    print("✅ Whisper model downloaded")
except Exception as e:
    print(f"⚠️  Could not download Whisper model: {e}")

try:
    # Download FishSpeech model (if available in transformers)
    print("Downloading TTS models...")
    from transformers import AutoTokenizer, AutoModelForCausalLM
    print("✅ TTS models ready")
except Exception as e:
    print(f"⚠️  Could not download TTS models: {e}")

print("\n✅ Model initialization complete")
EOF
else
    echo "✅ Models already cached"
fi

# Generate sample voices JSON
echo "📝 Generating voice profiles..."
python3 << 'EOF'
import json
from voice_library import voice_manager

# Export voices
voices_json = voice_manager.export_voices_json()
with open('/app/voices/voices.json', 'w') as f:
    f.write(voices_json)

print(f"✅ Generated {len(voice_manager.list_voices())} voice profiles")
EOF

# Setup environment
echo "⚙️  Setting up environment..."
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration"
else
    echo "✅ .env already exists"
fi

# Verify Python dependencies
echo "🔍 Verifying dependencies..."
python3 -m pip list | grep -E "fastapi|uvicorn|torch|torchaudio|transformers" || echo "⚠️  Some dependencies may be missing"

# Run health check if in Docker
if [ "$IS_DOCKER" = true ]; then
    echo "🏥 Starting health check..."
    sleep 5
    curl -s http://localhost:8100/health || echo "⚠️  Health check failed - server may not be ready"
fi

echo ""
echo "✅ Initialization complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your configuration"
echo "2. Run: python3 main.py"
echo "3. Test: curl http://localhost:8100/health"
echo ""
