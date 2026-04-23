/**
 * GET /api/integrations/crm/[provider]/mapping — Get field mapping config.
 * PUT /api/integrations/crm/[provider]/mapping — Save field mapping config.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { z } from "zod";
import {
  getDefaultMappings,
  type FieldMappingConfig,
  type MapEntry,
} from "@/lib/integrations/field-mapper";
import { assertSameOrigin } from "@/lib/http/csrf";
import {
  SUPPORTED_CRM_PROVIDERS,
  type CrmProviderId,
} from "@/lib/crm/providers";

// Phase 78 Task 9.3: mapping is supported for every CRM provider we ship.
// Source of truth: `SUPPORTED_CRM_PROVIDERS` from `@/lib/crm/providers`.
const ALLOWED_PROVIDERS: readonly CrmProviderId[] = SUPPORTED_CRM_PROVIDERS;

const MapEntrySchema = z.object({
  rtField: z.string(),
  crmField: z.string(),
  transformation: z.enum(["format_phone", "map_status", "concatenate", "none"]).optional(),
  statusMap: z.record(z.string(), z.string()).optional(),
  concatFields: z.array(z.string()).optional(),
});

const PutBodySchema = z.object({
  mappings: z.array(MapEntrySchema),
  customRtFields: z.array(z.string()).optional(),
  customCrmFields: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
});

export const dynamic = "force-dynamic";

function isCrmProviderId(s: string): s is CrmProviderId {
  return ALLOWED_PROVIDERS.includes(s as CrmProviderId);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { provider } = await ctx.params;
  if (!provider || !isCrmProviderId(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const db = getDb();
  const { data, error } = await db
    .from("integration_configs")
    .select("field_mapping")
    .eq("workspace_id", session.workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load mapping" }, { status: 500 });
  }

  const config = (data as { field_mapping?: FieldMappingConfig } | null)?.field_mapping;
  if (config && typeof config === "object" && Array.isArray((config as FieldMappingConfig).mappings)) {
    return NextResponse.json(config as FieldMappingConfig);
  }

  return NextResponse.json({
    mappings: getDefaultMappings(provider),
    customRtFields: [],
    customCrmFields: [],
  } satisfies FieldMappingConfig);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErrPut = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErrPut) return authErrPut;

  const { provider } = await ctx.params;
  if (!provider || !isCrmProviderId(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid mapping config" }, { status: 400 });
  }

  const config: FieldMappingConfig = {
    mappings: parsed.data.mappings as MapEntry[],
    customRtFields: parsed.data.customRtFields,
    customCrmFields: parsed.data.customCrmFields,
  };

  const db = getDb();
  const { error } = await db
    .from("integration_configs")
    .upsert(
      {
        workspace_id: session.workspaceId,
        provider,
        field_mapping: config as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,provider" }
    );

  if (error) {
    return NextResponse.json({ error: "Failed to save mapping" }, { status: 500 });
  }
  return NextResponse.json(config);
}
