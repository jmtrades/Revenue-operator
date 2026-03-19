# Deploy (Fly.io)

Use the config at the voice-server root so the build context includes `requirements.txt` and app code:

```bash
cd services/voice-server
flyctl deploy --remote-only
```

The legacy `fly.toml` in this folder was moved to `../fly.toml`.
