/**
 * Invariant: public record views store only domain for referrer; no raw URL, IP, or UA.
 * Hash uses PUBLIC_VIEW_SALT + date rotation; if salt missing → hash null.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf-8");
}

describe("Public record views referrer invariant", () => {
  it("getReferrerDomain uses hostname only (strips protocol and path)", () => {
    const views = read("src/lib/public-record/views.ts");
    expect(views).toMatch(/url\.hostname/);
    expect(views).toMatch(/new URL\(ref\)/);
    expect(views).not.toMatch(/referer.*referrer.*raw|store.*raw|\.href|\.pathname/);
  });

  it("only domain is stored; no raw URL saved", () => {
    const views = read("src/lib/public-record/views.ts");
    expect(views).toMatch(/referrer_domain/);
    expect(views).not.toMatch(/referrer_url|referrer_raw|full_url|request\.url/);
  });

  it("no IP stored", () => {
    const views = read("src/lib/public-record/views.ts");
    expect(views).not.toMatch(/ip_address|client_ip|\.ip\b|x-forwarded-for|x-real-ip|getClientIp/);
  });

  it("no UA stored (only hashed in fingerprint)", () => {
    const views = read("src/lib/public-record/views.ts");
    expect(views).not.toMatch(/user_agent|user-agent.*insert|\.insert\([^)]*user_agent/);
    expect(views).toMatch(/viewer_fingerprint_hash/);
  });

  it("hash uses PUBLIC_VIEW_SALT and date rotation", () => {
    const views = read("src/lib/public-record/views.ts");
    expect(views).toMatch(/PUBLIC_VIEW_SALT/);
    expect(views).toMatch(/toISOString|slice\(0,\s*10\)|YYYY-MM-DD|daySalt|getDaySalt/);
  });

  it("if salt missing hash is null (safe)", () => {
    const views = read("src/lib/public-record/views.ts");
    expect(views).toMatch(/daySalt.*null|!daySalt|getEnv.*PUBLIC_VIEW_SALT/);
    expect(views).toMatch(/hashViewerFingerprint.*daySalt/);
  });
});
