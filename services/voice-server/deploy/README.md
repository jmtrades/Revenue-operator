# Deploy (Fly.io)

Use the config at the voice-server root so the build context includes `requirements.txt` and app code:

```bash
cd services/voice-server
flyctl deploy --remote-only
```

The legacy `fly.toml` in this folder was moved to `../fly.toml`.

## Enable Orpheus TTS (gated on Hugging Face)

Without a token, the server falls back to **placeholder** audio for TTS.

1. On [Hugging Face](https://huggingface.co), request access to the model repo (e.g. `canopylabs/orpheus-3b-0.1-ft`).
2. Create a **read** token (Settings → Access Tokens).
3. Set it on the Fly app (either env name works with `huggingface_hub` / `transformers`):

   ```bash
   flyctl secrets set -a recall-voice HF_TOKEN=hf_xxxxxxxx
   # or
   flyctl secrets set -a recall-voice HUGGINGFACE_HUB_TOKEN=hf_xxxxxxxx
   ```

4. Redeploy so the process picks up the secret:

   ```bash
   cd services/voice-server && flyctl deploy --remote-only
   ```

5. Confirm: `GET /health` includes `"huggingface_hub_token_configured": true` and `/status` shows a non-placeholder TTS engine when the model loads successfully.

**Note:** Orpheus 3B on **CPU** is heavy; production voice quality usually needs a **GPU** Fly machine and matching `fly.toml` `[vm]` block (see comments in `fly.toml`).

## Optional: skip STT on very small VMs

```bash
flyctl secrets set -a recall-voice LOAD_STT_ENGINE=false
```

Redeploy afterward.
