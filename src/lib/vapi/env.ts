export function getVapiServerKey(): string | null {
  const direct = process.env.VAPI_API_KEY?.trim();
  if (direct) {
    return direct;
  }

  const legacy = process.env.vapi_private_key?.trim();
  if (legacy) {
    return legacy;
  }

  return null;
}

export function hasVapiServerKey(): boolean {
  return Boolean(getVapiServerKey());
}
