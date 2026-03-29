/**
 * Day-3 nudge email: "Your AI is waiting for its first call".
 * Builds subject and HTML; sending is done by the cron route.
 */

export function buildDay3NudgeEmail(params: {
  userName: string;
  readinessPct: number;
  appUrl: string;
}): { subject: string; html: string } {
  const { userName, readinessPct, appUrl } = params;
  const subject = "Your AI is waiting for its first call";
  const html = `
    <p>Hi ${userName},</p>
    <p>Your Revenue Operator agent is ${readinessPct}% configured but hasn't taken any calls yet.</p>
    <p>The fastest way to see it work: open the Test step in your agent setup and have a conversation with it.</p>
    <p><a href="${appUrl}/activate" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; font-weight: 600; border-radius: 8px;">Test your agent →</a></p>
    <p>— Junior</p>
  `;
  return { subject, html };
}
