/**
 * GET /api/integrations/crm/[provider]/mapping — Get field mapping config.
 * PUT /api/integrations/crm/[provider]/mapping — Save field mapping config.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { z } from "zod";
import {
  getDefaultMappings,
  type CrmProviderId,
  type FieldMappingConfig,
  type MapEntry,
} from "@/lib/integrations/field-mapper";

const ALLOWED_PROVIDERS: CrmProviderId[] = [
  "salesforce",
  "hubspot",
  "zoho_crm",
  "pipedrive",
  "gohighlevel",
  "google_contacts",
  "microsoft_365",
];

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
  const { provider } = await ctx.params;
  if (!provider || !isCrmProviderId(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const db = getDb();
  const { data, error } = await db
    .from("integration_configs")
    .select("config")
    .eq("workspace_id", session.workspaceId)
    .eq("provider", provider)
    .eq("config_type", "field_mapping")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load mapping" }, { status: 500 });
  }

  const config = (data as { config?: FieldMappingConfig } | null)?.config;
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
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
        config_type: "field_mapping",
        config: config as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,provider,config_type" }
    );

  if (error) {
    return NextResponse.json({ error: "Failed to save mapping" }, { status: 500 });
  }
  return NextResponse.json(config);
}
