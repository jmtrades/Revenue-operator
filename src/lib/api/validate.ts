import { z, ZodSchema } from "zod";
import { NextResponse } from "next/server";

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 422 }) };
  }
  return { data: result.data };
}

// Common schemas
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number (E.164 format)");
export const emailSchema = z.string().email("Invalid email address").max(320);
export const workspaceIdSchema = z.string().uuid("Invalid workspace ID");
