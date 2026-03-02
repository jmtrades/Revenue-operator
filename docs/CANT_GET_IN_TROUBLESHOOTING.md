# Can't get into the system — checklist

If you're stuck at sign-in, activate, or get redirected back to /activate after logging in, check these in order.

## 1. SESSION_SECRET (most common)

**Required for:** Session cookie so the app remembers you after login.

- **Vercel:** Project → Settings → Environment Variables. Add `SESSION_SECRET` with any long random string (e.g. 32+ characters). Redeploy after adding.
- **Local:** In `.env.local` set `SESSION_SECRET=something-at-least-32-characters-long`.

If this is missing, the auth callback cannot set the session cookie. You get redirected to the dashboard with no cookie, then the proxy sends you back to /activate. You never "stay" logged in.

## 2. Supabase env in Vercel

**Required for:** Login (magic link), workspace creation, /api/workspaces.

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key from Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (for creating workspaces and users table)

If these are wrong or missing, the auth callback may redirect to `/sign-in?error=auth`, or the workspace is never created and you have no workspace to land on.

## 3. Supabase redirect URLs

In Supabase Dashboard → Authentication → URL configuration:

- **Site URL:** `https://recall-touch.com` (or your real domain)
- **Redirect URLs:** Include `https://recall-touch.com/auth/callback` (and same for localhost if testing locally)

If the magic link redirect URL isn’t allowed, the callback never runs with a valid `code`.

## 4. Database (workspaces + users)

After login, the callback creates a **workspace** and optionally upserts into **users**. If the `workspaces` table is missing or RLS blocks the insert, you get a session with no workspace. Then /connect or dashboard may redirect to /activate because `workspaces` is empty.

- Run migrations so `revenue_operator.workspaces` (and `revenue_operator.users` for admin) exist.
- If using RLS, ensure the service role key can insert into `workspaces` and `users`.

## 5. BASE_URL / NEXT_PUBLIC_APP_URL (Vercel)

Set to your production URL, e.g. `https://recall-touch.com`. Used for redirects and links. Wrong value can send users to the wrong domain after login.

---

## Quick verification

1. **Session:** In Vercel, confirm `SESSION_SECRET` is set (no value shown) and redeploy.
2. **Login:** Use “Get started” on /activate, then open the magic link from email. You should land on /dashboard/onboarding or /connect.
3. **Cookie:** After that, open DevTools → Application → Cookies. You should see `revenue_session` for your domain. If it’s missing, the cookie wasn’t set — usually because `SESSION_SECRET` is missing or the callback failed before setting it.
4. **Workspaces:** If you have the cookie but /connect keeps sending you to /activate, `/api/workspaces` is likely returning `[]` (no workspace created). Check Supabase tables and service role key.

## Summary

| Symptom | Likely cause |
|--------|----------------|
| Magic link → sign-in again or error | Supabase redirect URL not allowlisted, or Supabase keys wrong in Vercel |
| After login → back to /activate | **SESSION_SECRET** not set in Vercel (cookie never set) |
| After login → /connect then redirect to /activate | No workspace created (Supabase/DB issue) or SESSION_SECRET still missing |
| 500 on /auth/callback | Supabase or DB error; check Vercel function logs |
