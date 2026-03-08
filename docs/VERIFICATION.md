# Verification: Invite, Welcome Email, and Crons

Use this guide to verify that team invites, welcome emails, and lifecycle crons work after deploying to Vercel.

---

## 1. Invite flow

### 1.1 Send an invite

1. Sign in to the app and open **Settings → Team** (or `/app/team`).
2. Click **+ Invite Member**.
3. Enter an email address (use a real inbox you can access) and choose a role (e.g. Agent).
4. Click **Send Invite**.

**Expected:**

- Button shows “Sending…” then the modal closes.
- A toast: “Invite sent to {email}.”
- The invited email appears in the list with a **Pending** badge.

### 1.2 Check email and accept link

1. Open the inbox for the invited email.
2. Find an email with subject: **{InviterName} invited you to {WorkspaceName} on Recall Touch**.
3. Click **Accept invitation →** in the email.

**Expected:**

- Browser opens `/accept-invite?token=...`.
- Page shows “Join {WorkspaceName}” and “Accept invitation”.
- If not signed in: click **Accept invitation** → “Please sign in first” and links to **Sign in** / **Create account** with `?next=/accept-invite?token=...` so after login you return to the same accept page.
- After signing in or signing up (or if already signed in), click **Accept invitation** again → redirect to `/app/activity?welcome=...` and the user is in the workspace.

### 1.3 Resend and Revoke (pending invites)

- In **Pending invitations**, each row has **Resend** and **Revoke**.
- **Resend**: Sends the same invite email again (new link, 7-day expiry). Use if the first email was missed or expired.
- **Revoke**: Cancels the invite; the link will no longer work.

### 1.4 Invalid / expired token

- Open `/accept-invite?token=invalid123` → “Invalid invite link.”
- Use an expired token (e.g. after 7 days or one already accepted) → “This invite has expired.”

### 1.5 After accepting

- After you accept, you are redirected to `/app/activity?welcome={WorkspaceName}`.
- The Activity page shows a toast: **“Welcome to {WorkspaceName}!”** for a few seconds, then the URL is cleaned (no `?welcome=` in the address bar).

---

## 2. Welcome email (signup)

1. Sign up with a **new** email at `/sign-in` (e.g. “Create account” or your signup flow).
2. Complete the signup form (email + password + optional business name) and submit.

**Expected:**

- Account is created and you are redirected (e.g. to `/app/onboarding`).
- In that email’s inbox, receive: **Welcome to Recall Touch — let's set up your AI**.
- Email body includes the 5-step list and a **Start setup →** button linking to `/app/onboarding`.
- Signature: “— Junior, Founder of Recall Touch.”

If the welcome email does not arrive, check:

- `RESEND_API_KEY` is set in Vercel.
- Resend dashboard for that domain (e.g. `noreply@recall-touch.com` or your `EMAIL_FROM`) and any bounces or errors.

---

## 3. First-day check cron

Sends “Quick question — did you get stuck?” to users who signed up **more than 4 hours ago**, have **not** completed onboarding, and have **no** conversations. Each workspace is only emailed once (`first_day_email_sent_at`).

### 3.1 Vercel Cron

- In Vercel, the cron should call: `GET https://<your-domain>/api/cron/first-day-check`.
- Schedule: e.g. every 6–12 hours so that 4+ hours after signup they can get the email.
- No custom headers needed if Vercel adds `x-vercel-cron` (cron auth allows that).

### 3.2 Manual trigger (for verification)

From your machine (replace with your domain and secret):

```bash
curl -s -X GET "https://YOUR_VERCEL_URL/api/cron/first-day-check" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or, if your stack uses the same secret as Vercel Cron:

```bash
curl -s -X GET "https://YOUR_VERCEL_URL/api/cron/first-day-check" \
  -H "x-vercel-cron: 1"
```

**Expected response (200):**

```json
{ "ok": true, "checked": N, "sent": M, "results": [ ... ] }
```

- `checked`: number of workspaces considered.
- `sent`: number of emails actually sent.
- If no one is eligible, `checked` may be 0 or `sent` 0; that’s normal.

### 3.3 Confirm email

- Create a test workspace (sign up with a new email), **do not** complete onboarding and **do not** create any conversations.
- Wait 4+ hours (or temporarily change the cron window in code for testing).
- Run the cron (or wait for the scheduled run).
- Check that workspace owner’s inbox for: **Quick question — did you get stuck?** with “Continue setup” and “— Junior.”

---

## 4. Day-3 nudge cron

Sends “Your AI is waiting for its first call” to workspaces created **3+ days ago** with **no** conversations and **no** previous day-3 email (`day_3_email_sent_at`).

### 4.1 Vercel Cron

- Call: `GET https://<your-domain>/api/cron/day-3-nudge`.
- Schedule: e.g. once per day.

### 4.2 Manual trigger

```bash
curl -s -X GET "https://YOUR_VERCEL_URL/api/cron/day-3-nudge" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Expected response (200):**

```json
{ "ok": true, "checked": N, "sent": M, "results": [ ... ] }
```

### 4.3 Confirm email

- Use a workspace that is 3+ days old, has no conversations, and has not received the day-3 email before.
- Run the cron; check the owner’s inbox for: **Your AI is waiting for its first call** and “Test your agent →”.

---

## 5. Phone: area code and SMS verification

### 5.1 Get a number with area code

- In **Settings → Phone**, when you don’t have a number yet, you’ll see **Area code (optional)**.
- Enter a 3-digit area code (e.g. 503) and click **Get my number**. The provisioned number will be in that area when available.

### 5.2 Verify a number by SMS

- In **Settings → Phone**, after you have a number, use the **Verify a number by SMS** block.
- Enter the phone number (e.g. your forwarding number), click **Send code**, then enter the 6-digit code from SMS and click **Verify**.
- On success you’ll see “Phone verified ✓”. The number is stored on the workspace (`workspaces.verified_phone`).
- Verified state is persisted: after refresh or reopening **Settings → Phone**, the page loads `verified_phone` from **GET /api/workspace/phone** (and **GET /api/workspace/me**) and shows the verified number and badge.
- Requires `TWILIO_VERIFY_SERVICE_SID` and Twilio credentials in Vercel.

---

## 6. Environment variables (recap)

Ensure these are set in Vercel (and in any local `.env` for testing):

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | All transactional email (welcome, invite, first-day, day-3) |
| `CRON_SECRET` | Auth for manual cron calls (`Authorization: Bearer CRON_SECRET`) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Phone provisioning and (with Verify) SMS verification |
| `TWILIO_VERIFY_SERVICE_SID` | SMS verification (create a Verify Service in Twilio) |
| `EMAIL_FROM` | Optional; defaults to `Recall Touch <noreply@recall-touch.com>` |
| `NEXT_PUBLIC_APP_URL` | Base URL for links in emails (e.g. `https://your-app.vercel.app`) |

Vercel Cron jobs that call your app with `x-vercel-cron` do not need `CRON_SECRET` in the request; the app treats them as authorized.

---

## 7. Quick checklist

- [ ] Invite: send from Team page → email received → accept link → join workspace.
- [ ] Welcome: sign up with new email → welcome email received with correct subject and link.
- [ ] First-day cron: run manually or wait for schedule → 200 + correct JSON; optional: confirm email for an eligible workspace.
- [ ] Day-3 cron: run manually or wait for schedule → 200 + correct JSON; optional: confirm email for an eligible workspace.
