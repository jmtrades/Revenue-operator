# Zoom integration setup

You need four values in `.env.local` for the Zoom call-aware flow. Here’s where each comes from.

---

## 1. ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET

These come from a **Zoom OAuth app** in the Zoom Marketplace.

1. Go to **https://marketplace.zoom.us/**
2. Sign in with your Zoom account.
3. **Develop** → **Build App** (or **Create**).
4. Choose **OAuth** (not JWT).
5. Fill in:
   - **App name**: e.g. `Revenue Operator`
   - **Company name**: your company
   - **Developer email**: your email
6. In **Redirect URL for OAuth** set:
   - Local: `http://localhost:3000/api/integrations/zoom/callback`
   - Production: `https://your-domain.com/api/integrations/zoom/callback`
7. After creating the app you’ll see **Client ID** and **Client Secret**. Copy them into `.env.local`:
   - `ZOOM_CLIENT_ID=...`
   - `ZOOM_CLIENT_SECRET=...`

(You can add both local and production redirect URLs in the app settings if needed.)

---

## 2. ENCRYPTION_KEY

This is a **secret you generate yourself**. It must be **at least 32 characters** (used for AES-GCM). You never get this from Zoom.

**Generate a random 32-byte hex key (recommended):**

```bash
openssl rand -hex 32
```

Then in `.env.local`:

```env
ENCRYPTION_KEY=paste-the-64-character-hex-string-here
```

Or use any 32+ character secret (e.g. a long random string). Keep it secret and don’t change it after you’ve stored Zoom tokens, or you won’t be able to decrypt them.

---

## 3. BASE_URL

This is **your app’s public URL**, used for OAuth redirects.

- **Local:** `http://localhost:3000`
- **Production:** `https://your-domain.com` (no trailing slash)

Example in `.env.local`:

```env
BASE_URL=http://localhost:3000
```

If you omit it, the app falls back to the request origin (usually fine for local dev).

---

## Summary: add to `.env.local`

```env
# Zoom (from Zoom Marketplace OAuth app)
ZOOM_CLIENT_ID=your-client-id
ZOOM_CLIENT_SECRET=your-client-secret

# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your-64-char-hex-or-32-char-secret

# Your app URL (for OAuth redirect)
BASE_URL=http://localhost:3000
```

Then restart the Next.js dev server and use **Dashboard → Activation → Connect Zoom**.
