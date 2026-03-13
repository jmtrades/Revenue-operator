import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const body = await req.json();

  const {
    phone_number,
    current_carrier,
    account_number,
    account_pin,
    loa_url,
    contact_name,
    contact_email,
  } = body as {
    phone_number?: string;
    current_carrier?: string;
    account_number?: string;
    account_pin?: string;
    loa_url?: string;
    contact_name?: string;
    contact_email?: string;
  };

  if (!phone_number || !current_carrier) {
    return NextResponse.json({ error: "Phone number and carrier required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("port_requests")
    .insert({
      workspace_id: session.workspaceId,
      phone_number,
      current_carrier,
      account_number: account_number || null,
      account_pin: account_pin || null,
      loa_url: loa_url || null,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

