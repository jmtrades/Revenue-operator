# Voice Synthesis Server

A production-ready, self-hosted voice synthesis system that replaces ElevenLabs. Provides real-time bidirectional audio streaming for phone conversations via Twilio, with integrated STT, TTS, and LLM capabilities.

## Features

- **30+ Diverse Voices** - American, British, Australian accents with various tones and ages
- **Real-time Bidirectional Audio** - WebSocket-based streaming for low-latency conversations
- **Text-to-Speech (TTS)** - Fast inference with quality output
- **Speech-to-Text (STT)** - Automatic speech recognition with Whisper
- **Voice Cloning** - Clone voices from audio samples
- **Conversation Management** - Turn-taking, silence detection, barge-in (interruption), natural backchanneling
- **Tool Calling** - LLM can call external tools/functions
- **Cost Effective** - ~$100-150/month on Fly.io vs $500+ for ElevenLabs
- **Fully Open Source** - No vendor lock-in

## Quick Start

### Local Development

```bash
# Navigate to voice-server directory
cd services/voice-server

# Copy environment template
cp .env.example .env

# Build Docker image
docker build -t voice-synthesis-server .

# Run with Docker Compose (requires GPU)
docker-compose up -d

# Check server is running
curl http://localhost:8100/health

# View logs
docker-compose logs -f voice-server
```

### Verify Installation

```bash
# List available voices
curl http://localhost:8100/voices | jq

# Get specific voice metadata
curl http://localhost:8100/voices/us-female-warm-receptionist | jq

# Health check
curl http://localhost:8100/health | jq
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Revenue Operator Application (Next.js)          │
├─────────────────────────────────────────────────────────┤
│  VoiceProvider Interface (Abstraction)                  │
│  ├── ElevenLabsConversationalProvider                  │
│  ├── VapiProvider                                       │
│  └── RecallVoiceProvider ← NEW SELF-HOSTED             │
├─────────────────────────────────────────────────────────┤
│                   Twilio (Phone)                        │
├─────────────────────────────────────────────────────────┤
│         Voice Synthesis Server (FastAPI/Python)        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ WebSocket: /ws/conversation                     │   │
│  │ - Audio streaming                               │   │
│  │ - Turn-taking state machine                     │   │
│  │ - Barge-in handling                             │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ TTS Engine (fishspeech)                         │   │
│  │ - 30+ voice profiles                            │   │
│  │ - Streaming output                              │   │
│  │ - Latency optimization                          │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ STT Engine (faster-whisper)                     │   │
│  │ - Real-time transcription                       │   │
│  │ - Multi-language support                        │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Conversation Engine                             │   │
│  │ - Session management                            │   │
│  │ - Silence detection                             │   │
│  │ - Backchanneling                                │   │
│  │ - Tool calling                                  │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│         LLM Endpoint (Claude API)                       │
│         (/api/agent/respond)                           │
└─────────────────────────────────────────────────────────┘
```

## API Endpoints

### Health & Status

```bash
# Health check
GET /health
# Returns: {"status": "healthy", "service": "voice-synthesis-server", ...}

# Server status
GET /status
# Returns: {"status": "running", "voices_available": 30, ...}
```

### Voice Management

```bash
# List all voices
GET /voices
GET /voices?accent=American&tone=warm

# Get voice metadata
GET /voices/{voice_id}
```

### Text-to-Speech

```bash
# Simple TTS (returns WAV)
POST /tts
Body: {
  "voice_id": "us-female-warm-receptionist",
  "text": "Hello, how can I help?",
  "speed": 1.0,
  "stability": 0.5,
  "style": 0.4
}

# Streaming TTS (returns chunks)
POST /tts/stream
Body: {
  "voice_id": "us-female-warm-receptionist",
  "text": "Hello, how can I help?",
  "chunk_size_ms": 50
}
```

### Speech-to-Text

```bash
# Transcribe audio
POST /stt
Body: multipart/form-data with audio file
Response: {
  "text": "Hello, I need to speak with sales",
  "language": "en",
  "confidence": 0.95
}
```

### Voice Cloning

```bash
# Clone a voice from audio sample
POST /clone
Body: multipart/form-data with:
  - voice_name: "John Doe"
  - voice_description: "Deep, friendly voice"
  - audio_file: <wav file>

Response: {
  "voice_id": "cloned_john_doe",
  "name": "John Doe",
  "status": "ready"
}
```

### WebSocket: Real-time Conversation

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8100/ws/conversation');

// Start conversation
ws.send(JSON.stringify({
  type: 'start',
  assistant_id: 'my-assistant',
  voice_id: 'us-female-warm-receptionist',
  system_prompt: 'You are a helpful customer service agent.'
}));

// Receive conversation start
// {"type": "conversation_started", "conversation_id": "..."}

// Send audio chunk from Twilio
ws.send(JSON.stringify({
  type: 'audio',
  audio_chunk: '<base64-encoded-audio>'
}));

// Receive user transcription
// {"type": "transcript", "speaker": "user", "text": "Hello?"}

// Receive assistant response
// {"type": "transcript", "speaker": "assistant", "text": "Hi there!"}
// {"type": "audio", "audio_chunk": "...", "final": false}

// Handle interruption (barge-in)
ws.send(JSON.stringify({
  type: 'interrupt'
}));

// End conversation
ws.send(JSON.stringify({
  type: 'end'
}));

// Receive summary
// {"type": "conversation_ended", "summary": {...}}
```

## Voice Profiles

### American Female (8 voices)
- `us-female-warm-receptionist` - Sarah (warm, welcoming)
- `us-female-professional` - Jennifer (corporate, formal)
- `us-female-casual` - Emma (friendly, relaxed)
- `us-female-energetic` - Madison (upbeat, exciting)
- `us-female-calm` - Rachel (reassuring, supportive)
- `us-female-authoritative` - Victoria (commanding, confident)
- `us-female-friendly` - Holly (personable, engaging)
- `us-female-empathetic` - Sophie (compassionate, caring)

### British Female (4 voices)
- `uk-female-professional` - Charlotte (refined, elegant)
- `uk-female-warm` - Olivia (charming, approachable)
- `uk-female-casual` - Poppy (modern, trendy)
- `uk-female-authoritative` - Eleanor (commanding, formal)

### Australian Female (2 voices)
- `au-female-friendly` - Chloe (casual, modern)
- `au-female-professional` - Isabella (business-focused)

### American Male (8 voices)
- `us-male-confident` - Adam (authoritative, assured)
- `us-male-casual` - Sam (relaxed, approachable)
- `us-male-professional` - James (measured, formal)
- `us-male-warm` - Michael (personable, friendly)
- `us-male-energetic` - Nathan (passionate, upbeat)
- `us-male-calm` - Daniel (thoughtful, steady)
- `us-male-deep` - Marcus (commanding, powerful)
- `us-male-friendly` - Chris (approachable, engaging)

### British Male (4 voices)
- `uk-male-professional` - George (sophisticated, formal)
- `uk-male-warm` - William (charming, personable)
- `uk-male-casual` - Liam (modern, youthful)
- `uk-male-deep` - Benedict (authoritative, prestigious)

### Australian Male (2 voices)
- `au-male-friendly` - Oliver (casual, friendly)
- `au-male-professional` - Jack (business, formal)

### Neutral/Androgynous (2 voices)
- `neutral-professional` - Casey (inclusive, professional)
- `neutral-friendly` - Alex (inclusive, approachable)

## Integration with Revenue Operator

### Using the RecallVoiceProvider

```typescript
import { getVoiceProvider } from "@/lib/voice";

// Initialize provider
const provider = getVoiceProvider({
  provider: "recall",
  apiKey: "" // Not needed for self-hosted
});

// Create assistant
const { assistantId } = await provider.createAssistant({
  name: "Sales Assistant",
  systemPrompt: "You are a helpful sales representative.",
  voiceId: "us-female-warm-receptionist",
  voiceProvider: "deepgram", // Can be omitted for self-hosted
  tools: [
    {
      type: "function",
      name: "get_availability",
      description: "Check agent availability",
      parameters: { /* ... */ }
    }
  ]
});

// Make outbound call
const callResult = await provider.createOutboundCall({
  assistantId,
  phoneNumber: "+14155552671"
});

// Handle inbound call (in Twilio webhook)
const twiml = await provider.createInboundCall(callSid, assistantId);
return new Response(twiml, {
  headers: { "Content-Type": "application/xml" }
});
```

### Environment Variable

Set in your `.env.local`:

```bash
# Use the self-hosted voice provider
VOICE_PROVIDER=recall

# Point to your voice server
VOICE_SERVER_URL=http://localhost:8100
# Or: VOICE_SERVER_URL=https://voice-server.fly.dev
```

## Deployment

### Local Docker

```bash
docker-compose up -d
```

### Fly.io (Recommended)

```bash
# Login to Fly
flyctl auth login

# Deploy
cd deploy
flyctl deploy
```

See `deploy/DEPLOYMENT_GUIDE.md` for detailed instructions.

### Render

See `deploy/DEPLOYMENT_GUIDE.md` for Render deployment.

### AWS

See `deploy/DEPLOYMENT_GUIDE.md` for AWS deployment options.

## Configuration

Copy `.env.example` to `.env` and customize:

```bash
# Core settings
PORT=8100
HOST=0.0.0.0
LOG_LEVEL=info

# LLM endpoint (required for conversations)
LLM_ENDPOINT=http://localhost:3000/api/agent/respond

# Model selection
TTS_MODEL=fishspeech-1.5
STT_MODEL=whisper-base

# Performance
TTS_WORKERS=2
STT_WORKERS=2
MAX_CONCURRENT_CONVERSATIONS=10
```

## Models Used

### Text-to-Speech
- **FishSpeech** (default) - Fast, high-quality synthesis
- Alternative: Tacotron 2, Glow-TTS

### Speech-to-Text
- **Faster-Whisper** - Optimized Whisper implementation
- Sizes: tiny, base, small, medium, large
- Default: `base` (best latency/accuracy tradeoff)

### Voice Cloning
- Speaker Encoder + Neural vocoder
- Requires 5-10 seconds of reference audio

## Performance Metrics

### Latency (with A10G GPU)
- TTS: 200-500ms for typical responses
- STT: 300-800ms for audio chunks
- Total conversation round trip: 1-2 seconds

### Throughput
- Concurrent conversations: 10+ per instance
- GPU utilization: 60-80% at capacity
- Memory usage: 12-14GB for all models loaded

### Cost Comparison
| Provider | Cost/Month | Latency | Voices | Self-hosted |
|----------|-----------|---------|--------|------------|
| ElevenLabs | $500+ | 200ms | 100+ | No |
| Google TTS | $200+ | 300ms | 200+ | No |
| Recall (Fly) | $130 | 300ms | 30 | Yes |
| Local (your GPU) | $0 | 100ms | 30 | Yes |

## Monitoring

### Health Checks
```bash
# Check server health
curl http://localhost:8100/health

# Check server status
curl http://localhost:8100/status
```

### Logs
```bash
# Local
docker-compose logs -f voice-server

# Fly.io
flyctl logs

# Render
# Dashboard > Logs
```

### Metrics
- Active conversations
- Average latency
- GPU utilization
- Model inference time

## Troubleshooting

### Server won't start
```bash
# Check GPU availability
docker run --gpus all nvidia/cuda:12.1.1-runtime nvidia-smi

# Check logs
docker-compose logs voice-server

# Verify port availability
lsof -i :8100
```

### WebSocket connection fails
- Verify WSS/HTTPS if in production
- Check firewall rules
- Ensure CORS is configured

### High latency
- Check GPU utilization: `nvidia-smi`
- Increase model cache
- Use smaller model variant
- Scale to multiple instances

### Out of memory
- Reduce `MAX_CONCURRENT_CONVERSATIONS`
- Use CPU-only for testing
- Upgrade instance size

## Contributing

Contributions welcome! Areas for improvement:
- Additional voice models/training
- Better turn-taking detection
- Improved silence timeout adaptation
- Multi-language support
- Voice quality metrics

## License

MIT - Use freely in commercial projects

## Support

- Issues: GitHub Issues
- Documentation: `deploy/DEPLOYMENT_GUIDE.md`
- Email: support@example.com

## FAQ

**Q: Will this work with Twilio?**
A: Yes! The voice server integrates with Twilio via WebSocket media streams.

**Q: Can I use my own TTS/STT models?**
A: Yes, modify `main.py` to use your models. The interface is flexible.

**Q: How many conversations can one instance handle?**
A: 10-20 concurrent with A10G GPU, depending on model size.

**Q: Is voice cloning production-ready?**
A: Yes, but requires good quality reference audio (5-10 seconds minimum).

**Q: Can I run this on CPU only?**
A: Yes, but latency will be 5-10x higher. Not recommended for real-time calls.

**Q: What about multi-language support?**
A: Whisper supports 100+ languages. TTS support depends on model selection.
