# Voice Synthesis Integration Guide

This guide explains how to integrate the self-hosted voice synthesis server with your Revenue Operator application.

## Overview

The application previously used **ElevenLabs** for voice synthesis via their Conversational AI API. We've now added a **Recall** provider that uses a self-hosted voice synthesis server, giving you:

- **Lower costs**: ~$130-150/month vs $500+ for ElevenLabs
- **Full control**: No vendor lock-in
- **Privacy**: Audio stays on your infrastructure
- **Customization**: Easy to modify models and voices

## Architecture

```
Application (Next.js)
    ↓
VoiceProvider Interface (Abstraction)
    ├── ElevenLabsConversationalProvider (original)
    ├── VapiProvider (original)
    └── RecallVoiceProvider (NEW) ← Self-hosted
    ↓
Voice Synthesis Server (FastAPI)
    ├── TTS (FishSpeech)
    ├── STT (Faster-Whisper)
    ├── Conversation Engine
    └── 30+ Voice Profiles
    ↓
Twilio (Phone Calls)
```

## Quick Setup

### 1. Start the Voice Server

**Option A: Local Development**
```bash
cd services/voice-server
docker-compose up -d
```

**Option B: Production (Fly.io)**
```bash
cd services/voice-server/deploy
flyctl deploy
```

Verify it's running:
```bash
curl http://localhost:8100/health
# or
curl https://your-voice-server.fly.dev/health
```

### 2. Configure Your Application

In `.env.local` (development) or `.env.vercel.production` (production):

```bash
# Use the self-hosted provider
VOICE_PROVIDER=recall

# Point to your voice server
VOICE_SERVER_URL=http://localhost:8100
# Production example:
# VOICE_SERVER_URL=https://your-voice-server.fly.dev
```

### 3. Update Voice Selection

Replace ElevenLabs voice IDs with Recall voice IDs:

**Before (ElevenLabs):**
```typescript
const { assistantId } = await provider.createAssistant({
  voiceId: "EXAVITQu4vr4xnSDxMaL", // ElevenLabs ID
  // ...
});
```

**After (Recall):**
```typescript
import { RECALL_VOICES } from "@/lib/constants/recall-voices";

const { assistantId } = await provider.createAssistant({
  voiceId: RECALL_VOICES[0].id, // "us-female-warm-receptionist"
  // ...
});
```

## Voice Selection Guide

The Recall server includes 30 curated voices. Here's how to choose:

### By Industry

**Sales/Outbound:**
- `us-male-confident` (Adam) - Persuasive, assertive
- `us-female-energetic` (Madison) - Excited, engaging
- `us-female-friendly` (Holly) - Approachable, warm

**Customer Service:**
- `us-female-warm-receptionist` (Sarah) - Welcoming
- `us-male-warm` (Michael) - Personable
- `us-female-calm` (Rachel) - Reassuring

**Healthcare/Support:**
- `us-female-empathetic` (Sophie) - Compassionate
- `us-female-calm` (Rachel) - Reassuring
- `us-male-calm` (Daniel) - Steady

**Legal/Financial:**
- `us-male-confident` (Adam) - Authoritative
- `uk-male-professional` (George) - Sophisticated
- `us-female-professional` (Jennifer) - Corporate

**Luxury/Premium:**
- `uk-female-professional` (Charlotte) - Elegant
- `uk-male-deep` (Benedict) - Prestigious
- `us-male-deep` (Marcus) - Commanding

**Tech/Modern:**
- `us-male-casual` (Sam) - Approachable
- `us-female-casual` (Emma) - Friendly
- `neutral-friendly` (Alex) - Inclusive

### By Tone

- **Warm**: Sarah, Michael, Holly, Olivia
- **Professional**: Jennifer, James, Charlotte, George
- **Casual**: Emma, Sam, Poppy, Liam
- **Energetic**: Madison, Nathan, Gigi (see voice_library.py for all)
- **Calm**: Rachel, Daniel
- **Deep**: Marcus, Benedict
- **Empathetic**: Sophie
- **Authoritative**: Victoria, Eleanor
- **Friendly**: Holly, Chris, Chloe, Oliver, Alex

### Complete Voice List

Import from TypeScript:
```typescript
import { RECALL_VOICES, searchRecallVoices } from "@/lib/constants/recall-voices";

// Get all voices
RECALL_VOICES

// Search by criteria
searchRecallVoices({
  gender: "female",
  accent: "American",
  tone: "warm"
})

// Get available accents
import { getRecallAccents } from "@/lib/constants/recall-voices";
const accents = getRecallAccents(); // ["American", "British", "Australian"]
```

## Code Examples

### Creating an Assistant with Recall

```typescript
import { getVoiceProvider } from "@/lib/voice";
import { RECALL_VOICES } from "@/lib/constants/recall-voices";

const provider = getVoiceProvider({ provider: "recall" });

const { assistantId } = await provider.createAssistant({
  name: "Sales Assistant",
  systemPrompt: "You are a friendly sales representative...",
  voiceId: "us-female-warm-receptionist",
  voiceProvider: "deepgram", // Can omit for self-hosted
  voiceModel: "glow-tts",    // Optional
  language: "en",
  silenceTimeout: 30,
  tools: [
    {
      type: "function",
      name: "transfer_to_agent",
      description: "Transfer call to human agent",
      parameters: {
        type: "object",
        properties: {
          queue: { type: "string" }
        }
      }
    }
  ]
});
```

### Making an Outbound Call

```typescript
const callResult = await provider.createOutboundCall({
  assistantId,
  phoneNumber: "+14155552671",
  metadata: {
    campaign: "Q1-2024",
    customer_id: "12345"
  }
});

console.log(callResult);
// {
//   callId: "call_...",
//   status: "queued",
//   provider: "recall"
// }
```

### Handling Inbound Calls

In your Twilio webhook handler:

```typescript
import { getVoiceProvider } from "@/lib/voice";

async function handleTwilioStreamCallback(req: Request) {
  const callSid = req.body.CallSid;
  const assistantId = "your-assistant-id";

  const provider = getVoiceProvider({ provider: "recall" });

  // Get TwiML that streams to voice server
  const twiml = await provider.createInboundCall(callSid, assistantId);

  return new Response(twiml, {
    headers: { "Content-Type": "application/xml" }
  });
}
```

### Listening to Conversation Events

```typescript
const provider = getVoiceProvider({ provider: "recall" });

// Parse webhook events from voice server
const event = provider.parseWebhookEvent(webhookBody);

if (event.type === "tool-call") {
  console.log(`Tool called: ${event.toolName}`, event.toolArgs);
  // Execute tool and send result back
}

if (event.type === "end-of-call") {
  console.log(`Call ended. Duration: ${event.duration}s`);
  console.log(`Transcript: ${event.transcript}`);
  // Store call recording, update CRM, etc.
}
```

## Deployment Checklist

### Local Development
- [ ] Voice server running on `http://localhost:8100`
- [ ] `VOICE_PROVIDER=recall` in `.env.local`
- [ ] `VOICE_SERVER_URL=http://localhost:8100` in `.env.local`
- [ ] Can access `/health` endpoint

### Production (Fly.io)
- [ ] Voice server deployed to Fly.io
- [ ] GPU instance selected (A10G recommended)
- [ ] `VOICE_SERVER_URL` points to production server
- [ ] Health checks enabled
- [ ] Logs configured
- [ ] Monitoring alerts set up

### Security
- [ ] HTTPS/WSS enabled for production
- [ ] CORS properly configured
- [ ] API keys/secrets not exposed
- [ ] Rate limiting enabled
- [ ] DDoS protection configured

## Performance Tuning

### Optimize Latency

1. **Reduce silence timeout** (default 1.5s)
   - Lower = faster responses but more false positives
   - Typical: 0.8-1.5 seconds

2. **Stream TTS chunks immediately**
   - Start playing audio before LLM finishes
   - Implemented in `conversation_engine.py`

3. **Use smaller STT model**
   - `whisper-tiny`: Fastest, lower accuracy
   - `whisper-base`: Good balance (recommended)
   - `whisper-large`: Highest accuracy, slower

4. **Pre-warm models**
   - Models are loaded on first request
   - Send a test request on startup

### Reduce Costs

1. **Use CPU instances for testing**
   - `cpu-4x` on Fly.io: $0.20/hour
   - `performance-4x` on Render: $0.25/hour

2. **Implement request batching**
   - Process multiple TTS requests together
   - Reduces per-request overhead

3. **Cache model weights**
   - Volume mount for model cache
   - Configured in `docker-compose.yml`

4. **Use spot instances** (AWS)
   - 70% discount on g4dn instances
   - Trade off: can be interrupted

## Troubleshooting

### Voice server not accessible

```bash
# Check if server is running
curl http://localhost:8100/health

# If using Docker
docker-compose ps
docker-compose logs voice-server

# If on Fly
flyctl logs
```

### WebSocket connection fails

```bash
# Test WebSocket endpoint
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://localhost:8100/ws/conversation

# Check firewall rules
sudo ufw allow 8100/tcp  # Linux
```

### High latency

1. Check GPU utilization: `nvidia-smi`
2. Check concurrent conversations: `curl http://localhost:8100/status`
3. Increase instance size or scale horizontally
4. Use smaller model variants

### Audio quality issues

1. Adjust voice parameters:
   ```typescript
   await provider.createAssistant({
     // ...
     metadata: {
       stability: 0.5,      // 0-1, higher = more consistent
       style: 0.4,          // 0-1, higher = more expressive
       warmth: 0.5,         // 0-1, warmth of voice
     }
   });
   ```

2. Check audio encoding (should be 16-bit, 16kHz)

## Migration from ElevenLabs

If you're already using ElevenLabs, here's how to migrate:

### Step 1: Replace Provider in Config
```bash
# Before
VOICE_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=sk-...

# After
VOICE_PROVIDER=recall
VOICE_SERVER_URL=http://localhost:8100
```

### Step 2: Update Voice IDs
Create a migration script:
```typescript
const ELEVENLABS_TO_RECALL: Record<string, string> = {
  "EXAVITQu4vr4xnSDxMaL": "us-female-warm-receptionist", // Sarah -> Sarah
  "21m00Tcm4TlvDq8ikWAM": "us-female-calm",             // Rachel -> Rachel
  "pNInz6obpgDQGcFmaJgB": "us-male-confident",          // Adam -> Adam
  // Map all your voices
};

// Update database
await db.assistant.updateMany({
  where: { voiceId: { in: Object.keys(ELEVENLABS_TO_RECALL) } },
  data: {
    voiceId: ELEVENLABS_TO_RECALL[old]
  }
});
```

### Step 3: Test Thoroughly
1. Create test assistant with Recall voice
2. Make test calls
3. Compare call quality with ElevenLabs
4. Verify all tools still work
5. Check webhook parsing

### Step 4: Rollout Strategy
1. Start with small percentage of calls
2. Monitor quality and latency
3. Gradually increase traffic
4. Keep ElevenLabs as fallback initially

## Cost Comparison

| Component | ElevenLabs | Recall (Fly.io) |
|-----------|-----------|-----------------|
| Monthly usage (1000 calls/month) | $500-1000 | $0 (per call) |
| Server infrastructure | - | $100-150 |
| Setup complexity | Low | Medium |
| Customization | Limited | Full |
| Vendor lock-in | Yes | No |
| Privacy | Cloud | Your infra |

**Breaking even**: ~5 months for typical usage.

## Support & Resources

- Voice Server Docs: `services/voice-server/README.md`
- Deployment Guide: `services/voice-server/deploy/DEPLOYMENT_GUIDE.md`
- Voice Library: `services/voice-server/voice_library.py`
- TypeScript Provider: `src/lib/voice/providers/recall-voice.ts`
- Voice Constants: `src/lib/constants/recall-voices.ts`

## FAQ

**Q: Can I use both ElevenLabs and Recall at the same time?**
A: Yes! Switch with `VOICE_PROVIDER` environment variable. Useful for gradual migration.

**Q: Do I need a GPU to run the voice server?**
A: Recommended for production (10+ concurrent calls). CPU-only is fine for testing.

**Q: What if the voice server goes down?**
A: Implement fallback provider in your code:
```typescript
let provider = getVoiceProvider({ provider: "recall" });
try {
  await provider.createAssistant(...);
} catch {
  // Fallback to ElevenLabs
  provider = getVoiceProvider({ provider: "elevenlabs" });
}
```

**Q: Can I customize the voices?**
A: Yes! Edit `services/voice-server/voice_library.py` to add new voices or modify parameters.

**Q: Is there a limit on concurrent conversations?**
A: Depends on instance size. A10G supports ~10-20 concurrent. Vertical or horizontal scaling available.

**Q: Can I use different TTS/STT models?**
A: Yes! Modify `main.py` to use your preferred models (OpenAI API, Replicate, etc.).

**Q: What about multi-language support?**
A: Whisper supports 100+ languages. TTS support depends on model selection.

## Next Steps

1. Deploy voice server: `cd services/voice-server/deploy && flyctl deploy`
2. Configure environment variables
3. Test with sample calls
4. Monitor performance and costs
5. Adjust voice profiles based on feedback

For questions or issues, refer to the comprehensive documentation in the `services/voice-server/` directory.
