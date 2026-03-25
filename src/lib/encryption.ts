/**
 * AES-GCM encryption for sensitive tokens at rest.
 * Uses ENCRYPTION_KEY (32 bytes hex or base64).
 */

async function getKey(): Promise<CryptoKey> {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 chars for AES-GCM");
  }
  const buf = Buffer.from(raw.slice(0, 32), "utf8");
  return crypto.subtle.importKey("raw", buf, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

let _key: CryptoKey | null = null;

async function key(): Promise<CryptoKey> {
  if (_key) return _key;
  _key = await getKey();
  return _key;
}

const IV_LEN = 12;
const TAG_LEN = 128;

export async function encrypt(plaintext: string): Promise<string> {
  const k = await key();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: TAG_LEN },
    k,
    encoded
  );
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(cipher), iv.length);
  return Buffer.from(combined).toString("base64");
}

export async function decrypt(ciphertext: string): Promise<string> {
  const k = await key();
  const combined = Buffer.from(ciphertext, "base64");
  const iv = combined.subarray(0, IV_LEN);
  const data = combined.subarray(IV_LEN);
  const dec = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: TAG_LEN },
    k,
    data
  );
  return new TextDecoder().decode(dec);
}
