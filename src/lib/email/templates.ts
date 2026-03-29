/**
 * Shared email template system for Revenue Operator.
 * Professional, branded HTML emails that convert.
 * All emails use a consistent design language with the Revenue Operator brand.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.revenueoperator.ai";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared email wrapper with Revenue Operator branding */
function emailWrapper(content: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Revenue Operator</title>
${preheader ? `<span style="display:none;font-size:1px;color:#f8f8f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>` : ""}
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

<!-- Logo -->
<tr><td style="padding-bottom:32px;text-align:center;">
  <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Revenue Operator</span>
</td></tr>

<!-- Content Card -->
<tr><td style="background-color:#141414;border:1px solid #262626;border-radius:16px;padding:40px 32px;">
${content}
</td></tr>

<!-- Footer -->
<tr><td style="padding-top:24px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#525252;line-height:1.6;">
    Revenue Operator Inc. · AI that makes and takes your phone calls<br>
    <a href="${APP_URL}/app/settings" style="color:#525252;text-decoration:underline;">Manage preferences</a>
     · <a href="${APP_URL}/terms" style="color:#525252;text-decoration:underline;">Terms</a>
     · <a href="${APP_URL}/privacy" style="color:#525252;text-decoration:underline;">Privacy</a>
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Primary CTA button */
function ctaButton(text: string, href: string, color: string = "#10b981"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td style="background-color:${color};border-radius:12px;">
  <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 32px;color:#000000;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">${escapeHtml(text)}</a>
</td></tr>
</table>`;
}

/** Metric highlight box */
function metricBox(label: string, value: string): string {
  return `<td style="text-align:center;padding:12px 16px;background:#1a1a1a;border-radius:8px;border:1px solid #262626;">
  <p style="margin:0;font-size:11px;color:#737373;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(label)}</p>
  <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#10b981;">${escapeHtml(value)}</p>
</td>`;
}

// ─── WELCOME EMAIL ──────────────────────────────────────────────────────

export function buildWelcomeEmail(name: string): { subject: string; html: string } {
  const safeName = name?.trim() || "there";
  const subject = `Welcome to Revenue Operator, ${safeName} — your AI operator is ready`;

  const content = `
  <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">Welcome to Revenue Operator</h1>
  <p style="margin:0 0 24px;font-size:15px;color:#a3a3a3;line-height:1.6;">Your account is ready. Let's get your AI answering calls in under 3 minutes.</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:24px;">
  <tr>
    ${metricBox("Access", "Full")}
    ${metricBox("Setup", "3 min")}
    ${metricBox("Support", "24/7")}
  </tr>
  </table>

  <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#ffffff;">Your 4-step quickstart:</h2>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:12px 0;border-bottom:1px solid #1f1f1f;">
      <table role="presentation"><tr>
        <td style="width:32px;height:32px;background:#10b981;border-radius:8px;text-align:center;vertical-align:middle;font-weight:700;color:#000;font-size:14px;">1</td>
        <td style="padding-left:12px;color:#e5e5e5;font-size:14px;line-height:1.5;"><strong>Tell us about your business</strong> — 30 seconds, we'll configure your AI</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:12px 0;border-bottom:1px solid #1f1f1f;">
      <table role="presentation"><tr>
        <td style="width:32px;height:32px;background:#10b981;border-radius:8px;text-align:center;vertical-align:middle;font-weight:700;color:#000;font-size:14px;">2</td>
        <td style="padding-left:12px;color:#e5e5e5;font-size:14px;line-height:1.5;"><strong>Choose your AI voice</strong> — 41 voices, pick the one that sounds like you</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:12px 0;border-bottom:1px solid #1f1f1f;">
      <table role="presentation"><tr>
        <td style="width:32px;height:32px;background:#10b981;border-radius:8px;text-align:center;vertical-align:middle;font-weight:700;color:#000;font-size:14px;">3</td>
        <td style="padding-left:12px;color:#e5e5e5;font-size:14px;line-height:1.5;"><strong>Test your agent</strong> — have a real conversation before going live</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:12px 0;">
      <table role="presentation"><tr>
        <td style="width:32px;height:32px;background:#10b981;border-radius:8px;text-align:center;vertical-align:middle;font-weight:700;color:#000;font-size:14px;">4</td>
        <td style="padding-left:12px;color:#e5e5e5;font-size:14px;line-height:1.5;"><strong>Connect your number</strong> — start handling calls instantly</td>
      </tr></table>
    </td></tr>
  </table>

  ${ctaButton("Start Setup — Takes 3 Minutes", `${APP_URL}/activate`)}

  <p style="margin:0;font-size:13px;color:#737373;line-height:1.6;">
    Questions? Just reply to this email — I personally read every one.
  </p>
  <p style="margin:12px 0 0;font-size:14px;color:#e5e5e5;">
    — Junior, Founder of Revenue Operator
  </p>`;

  return { subject, html: emailWrapper(content, `Your account is active. Set up your AI operator in 3 minutes.`) };
}

// ─── TRIAL EXPIRING EMAIL ───────────────────────────────────────────────

export function buildTrialExpiringEmail(params: {
  name: string;
  daysLeft: number;
  callsHandled: number;
  minutesSaved: number;
  leadsCapture: number;
  tier: string;
}): { subject: string; html: string } {
  const { name, daysLeft, callsHandled, minutesSaved, leadsCapture, tier } = params;
  const safeName = name?.trim() || "there";
  const tierDisplay = tier === "solo" ? "Starter ($147/mo)" : tier === "business" ? "Growth ($297/mo)" : tier === "scale" ? "Business ($597/mo)" : "Agency ($997/mo)";
  const subject = daysLeft <= 1
    ? `Your trial ends tomorrow — don't lose your AI operator`
    : `${daysLeft} days left on your trial — here's what you'd lose`;

  const content = `
  <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">Your trial ${daysLeft <= 1 ? "ends tomorrow" : `ends in ${daysLeft} days`}</h1>
  <p style="margin:0 0 24px;font-size:15px;color:#a3a3a3;line-height:1.6;">Hi ${escapeHtml(safeName)}, here's what your AI operator has done so far:</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:24px;">
  <tr>
    ${metricBox("Calls Handled", String(callsHandled))}
    ${metricBox("Minutes Saved", String(minutesSaved))}
    ${metricBox("Leads Captured", String(leadsCapture))}
  </tr>
  </table>

  ${callsHandled > 0 ? `
  <div style="background:#1a1a1a;border:1px solid #262626;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <p style="margin:0;font-size:14px;color:#fbbf24;font-weight:600;">What happens if you don't subscribe:</p>
    <p style="margin:8px 0 0;font-size:13px;color:#a3a3a3;line-height:1.6;">
      Your AI operator stops answering calls. Every call goes to voicemail — and
      <strong style="color:#ef4444;">80% of callers who reach voicemail never call back</strong>.
    </p>
  </div>` : ""}

  <p style="margin:0 0 4px;font-size:14px;color:#e5e5e5;">Continue on <strong>${tierDisplay}</strong>:</p>

  ${ctaButton("Activate My Plan — Keep My Operator Running", `${APP_URL}/app/settings/billing`)}

  <p style="margin:0;font-size:13px;color:#737373;line-height:1.6;">
    Not ready? <a href="${APP_URL}/app/settings/billing" style="color:#10b981;text-decoration:underline;">Downgrade to Starter ($147/mo)</a> or reply to this email for help.
  </p>
  <p style="margin:12px 0 0;font-size:14px;color:#e5e5e5;">— Junior</p>`;

  return {
    subject,
    html: emailWrapper(content, `Your Revenue Operator trial ${daysLeft <= 1 ? "ends tomorrow" : `ends in ${daysLeft} days`}. ${callsHandled > 0 ? `Your operator handled ${callsHandled} calls.` : "Activate now to start."}`),
  };
}

// ─── USAGE MILESTONE EMAIL ──────────────────────────────────────────────

export function buildMilestoneEmail(params: {
  name: string;
  milestone: number; // e.g., 1, 10, 50, 100, 500
  totalCalls: number;
  estimatedRevenueSaved: number;
}): { subject: string; html: string } {
  const { name, milestone, totalCalls, estimatedRevenueSaved } = params;
  const safeName = name?.trim() || "there";

  const milestoneMessages: Record<number, { headline: string; body: string }> = {
    1: { headline: "Your AI operator just handled its first call", body: "Your phone line is now live with AI coverage. Every call from here is one less you have to worry about." },
    10: { headline: "10 calls handled — your operator is working", body: "That's 10 calls answered instantly, zero hold times, zero voicemails. The ROI is already building." },
    50: { headline: "50 calls handled — momentum is building", body: "At this pace, your AI operator is saving you hours of phone time every week." },
    100: { headline: "100 calls — this is real ROI", body: "100 calls handled by your operator. At $47 average value per call, that's potentially $4,700 in recovered revenue." },
    500: { headline: "500 calls — your operator is a full-time employee", body: "Most businesses need 2-3 staff to handle this volume. Your operator does it alone, 24/7." },
  };

  const msg = milestoneMessages[milestone] ?? { headline: `${milestone} calls handled!`, body: `Your AI operator has handled ${milestone} calls.` };

  const subject = msg.headline;

  const content = `
  <div style="text-align:center;margin-bottom:24px;">
    <div style="width:56px;height:56px;border-radius:50%;background:#10b981;margin:0 auto;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:24px;color:#fff;font-weight:700;">${milestone}</span>
    </div>
  </div>
  <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;text-align:center;">${msg.headline}</h1>
  <p style="margin:0 0 24px;font-size:15px;color:#a3a3a3;line-height:1.6;text-align:center;">${msg.body}</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:24px;">
  <tr>
    ${metricBox("Total Calls", String(totalCalls))}
    ${metricBox("Est. Revenue Saved", `$${estimatedRevenueSaved.toLocaleString()}`)}
  </tr>
  </table>

  <div style="text-align:center;">
    ${ctaButton("View Your Dashboard", `${APP_URL}/app/dashboard`)}
  </div>

  <p style="margin:0;font-size:13px;color:#737373;line-height:1.6;text-align:center;">
    Share the love — <a href="https://twitter.com/intent/tweet?text=My+AI+phone+agent+just+handled+${milestone}+calls+with+@RevenueOperator" style="color:#10b981;text-decoration:underline;">tweet about it</a>
  </p>`;

  return {
    subject,
    html: emailWrapper(content, `Your Revenue Operator has handled ${milestone} calls and saved ~$${estimatedRevenueSaved.toLocaleString()}.`),
  };
}

// ─── MINUTE PACK PURCHASE CONFIRMATION ──────────────────────────────────

export function buildMinutePackEmail(params: {
  name: string;
  minutes: number;
  price: string;
  newBalance: number;
}): { subject: string; html: string } {
  const { name, minutes, price, newBalance } = params;
  const safeName = name?.trim() || "there";
  const subject = `${minutes.toLocaleString()} minutes added to your account`;

  const content = `
  <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">Minutes added!</h1>
  <p style="margin:0 0 24px;font-size:15px;color:#a3a3a3;line-height:1.6;">Hi ${escapeHtml(safeName)}, your minute pack purchase is confirmed.</p>

  <div style="background:#1a1a1a;border:1px solid #262626;border-radius:12px;padding:20px;margin-bottom:24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="color:#a3a3a3;font-size:13px;padding:8px 0;border-bottom:1px solid #262626;">Minutes purchased</td>
        <td style="color:#ffffff;font-size:14px;font-weight:600;text-align:right;padding:8px 0;border-bottom:1px solid #262626;">${minutes.toLocaleString()} min</td>
      </tr>
      <tr>
        <td style="color:#a3a3a3;font-size:13px;padding:8px 0;border-bottom:1px solid #262626;">Amount charged</td>
        <td style="color:#ffffff;font-size:14px;font-weight:600;text-align:right;padding:8px 0;border-bottom:1px solid #262626;">${escapeHtml(price)}</td>
      </tr>
      <tr>
        <td style="color:#a3a3a3;font-size:13px;padding:8px 0;">New bonus balance</td>
        <td style="color:#10b981;font-size:14px;font-weight:700;text-align:right;padding:8px 0;">${newBalance.toLocaleString()} min</td>
      </tr>
    </table>
  </div>

  <p style="margin:0 0 4px;font-size:13px;color:#737373;">Bonus minutes never expire and are used before overage billing kicks in.</p>

  ${ctaButton("View Usage Dashboard", `${APP_URL}/app/settings/billing`)}

  <p style="margin:0;font-size:14px;color:#e5e5e5;">— Revenue Operator</p>`;

  return {
    subject,
    html: emailWrapper(content, `${minutes.toLocaleString()} minutes added. New balance: ${newBalance.toLocaleString()} min.`),
  };
}

// ─── PROFESSIONAL DUNNING EMAILS ────────────────────────────────────────

export function buildDunningEmail(params: {
  attempt: number;
  amountDue: string;
  nextRetryDate?: string;
}): { subject: string; html: string } {
  const { attempt, amountDue, nextRetryDate } = params;

  const configs: Record<number, { subject: string; urgency: string; headline: string; body: string; color: string }> = {
    1: {
      subject: "Action needed: payment failed",
      urgency: "Payment Issue",
      headline: "Your payment didn't go through",
      body: "We tried to charge your card but it was declined. Please update your payment method to keep your AI operator running without interruption.",
      color: "#fbbf24",
    },
    2: {
      subject: "Second attempt failed — update your payment",
      urgency: "Second Attempt Failed",
      headline: "We still can't process your payment",
      body: "This is the second failed attempt. Your AI operator is still running, but service will be paused soon if we can't collect payment.",
      color: "#f97316",
    },
    3: {
      subject: "Final warning: service pauses in 48 hours",
      urgency: "Final Warning",
      headline: "Your AI operator will stop in 48 hours",
      body: "Three payment attempts have failed. If we don't receive payment within 48 hours, your AI operator will be paused and calls will go to voicemail.",
      color: "#ef4444",
    },
    4: {
      subject: "Service paused — update payment to reactivate",
      urgency: "Service Paused",
      headline: "Your AI operator has been paused",
      body: "After four failed payment attempts, your service has been paused. All calls are now going to voicemail. Update your payment to reactivate instantly.",
      color: "#ef4444",
    },
  };

  const cfg = configs[Math.min(attempt, 4)] ?? configs[4];

  const content = `
  <div style="background:${cfg.color}15;border:1px solid ${cfg.color}40;border-radius:12px;padding:12px 16px;margin-bottom:24px;">
    <p style="margin:0;font-size:12px;font-weight:700;color:${cfg.color};text-transform:uppercase;letter-spacing:0.5px;">${cfg.urgency}</p>
  </div>

  <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">${cfg.headline}</h1>
  <p style="margin:0 0 24px;font-size:15px;color:#a3a3a3;line-height:1.6;">${cfg.body}</p>

  <div style="background:#1a1a1a;border:1px solid #262626;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="color:#a3a3a3;font-size:13px;padding:6px 0;">Amount due</td>
        <td style="color:#ffffff;font-size:14px;font-weight:600;text-align:right;padding:6px 0;">${escapeHtml(amountDue)}</td>
      </tr>
      <tr>
        <td style="color:#a3a3a3;font-size:13px;padding:6px 0;">Failed attempts</td>
        <td style="color:${cfg.color};font-size:14px;font-weight:600;text-align:right;padding:6px 0;">${attempt}</td>
      </tr>
      ${nextRetryDate ? `<tr>
        <td style="color:#a3a3a3;font-size:13px;padding:6px 0;">Next retry</td>
        <td style="color:#ffffff;font-size:14px;text-align:right;padding:6px 0;">${escapeHtml(nextRetryDate)}</td>
      </tr>` : ""}
    </table>
  </div>

  ${ctaButton("Update Payment Method", `${APP_URL}/app/settings/billing`, cfg.color)}

  <p style="margin:0;font-size:13px;color:#737373;line-height:1.6;">
    Need help? Reply to this email or contact support@revenueoperator.ai
  </p>`;

  return {
    subject: cfg.subject,
    html: emailWrapper(content, `${cfg.headline}. Amount due: ${amountDue}. Update your payment to keep your operator running.`),
  };
}
