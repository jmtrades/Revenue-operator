# Fix "OAuth client was not found" / Error 401 invalid_client (Google Sign-in)

When you click **Continue with Google** and see **"Access blocked: Authorization Error"** and **"The OAuth client was not found"**, Google does not recognize the OAuth client. Fix it with these steps.

---

## 1. Get your Supabase project URL

- Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
- In **Project Settings → API**, copy the **Project URL** (e.g. `https://xxxxx.supabase.co`).
- The part before `.supabase.co` is your **project ref** (e.g. `ucjbsftixnnbmuodholg`).

---

## 2. Create a Web OAuth client in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Select (or create) the project you want to use for Recall Touch.
3. Click **+ Create credentials** → **OAuth client ID**.
4. If asked, configure the **OAuth consent screen** first (External, add your app name and support email, add your email as test user if in Testing mode).
5. **Application type:** choose **Web application**.
6. **Name:** e.g. "Recall Touch" or "Recall Touch (Supabase)".
7. Under **Authorized redirect URIs** click **+ Add URI** and add **exactly** (replace `YOUR_PROJECT_REF` with your Supabase project ref from step 1):

   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

   Example if your Project URL is `https://ucjbsftixnnbmuodholg.supabase.co`:

   ```
   https://ucjbsftixnnbmuodholg.supabase.co/auth/v1/callback
   ```

   No trailing slash. No typos. This must match exactly what Supabase uses.

8. Click **Create**. Copy the **Client ID** and **Client Secret** (you may need to show the secret).

---

## 3. Configure Google in Supabase

1. In **Supabase Dashboard** → **Authentication** → **Providers**.
2. Find **Google** and turn it **ON**.
3. Paste the **Client ID** from step 2 into **Client ID**.
4. Paste the **Client secret** into **Client secret**.
5. Click **Save**.

---

## 4. Try again

- Sign out if needed, then on your app click **Continue with Google** again.
- If you still see an error:
  - Double-check the redirect URI in Google Cloud matches exactly (including `https`, no trailing slash).
  - Make sure you’re using the **Web application** OAuth client (not Desktop or Mobile).
  - Make sure the same Client ID and Secret are in Supabase with no extra spaces.

---

**Summary:** The client ID Google sees comes from Supabase. So the OAuth client must exist in **your** Google Cloud project, and the **Authorized redirect URI** in that client must be your Supabase callback URL above. Supabase then sends users back to your app (e.g. `/auth/callback?next=/app/activity`).
