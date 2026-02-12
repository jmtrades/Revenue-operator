/**
 * Message simplicity: 1 intention, 1-2 sentences max.
 * No paragraphs, lists, or multi-step instructions.
 */

export interface SimplicityResult {
  message: string;
  modified: boolean;
  reason?: string;
}

function countSentences(text: string): number {
  return (text.match(/[.!?]+/g) || []).length;
}

export function enforceSimplicity(message: string): SimplicityResult {
  if (!message || message.length < 3) {
    return { message: message ?? "", modified: false };
  }

  let out = message.trim();

  // Remove bullet lists
  if (/^[\s•\-*]\s*m/m.test(out) || /\n[\s•\-*]\s/g.test(out)) {
    const firstLine = out.split(/\n/)[0]?.trim() ?? "";
    out = firstLine;
  }

  // Remove numbered lists
  out = out.replace(/^\d+[.)]\s+/gm, "").trim();

  // Max 2 sentences
  const sentences = out.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  if (sentences.length > 2) {
    out = sentences.slice(0, 2).join(" ").trim();
  }

  // Single paragraph
  const paragraphs = out.split(/\n\s*\n/);
  if (paragraphs.length > 1) {
    out = paragraphs[0]!.trim();
  }

  // Max ~200 chars for SMS-friendliness
  if (out.length > 220) {
    const atSpace = out.lastIndexOf(" ", 200);
    out = (atSpace > 120 ? out.slice(0, atSpace) : out.slice(0, 200)).trim();
    if (!/[-.!?]$/.test(out)) out += ".";
  }

  const modified = out !== message.trim();
  return {
    message: out,
    modified,
    reason: modified ? "simplicity" : undefined,
  };
}
