/**
 * Runs Conversion, Attendance, and Retention operators for all active workspaces.
 * Operators schedule actions independently of inbound messages.
 */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { runConversionOperator } from "@/lib/operators/conversion-operator";
import { runAttendanceOperator } from "@/lib/operators/attendance-operator";
import {
  runRetentionCheckIns,
  runRetentionReactivation,
} from "@/lib/operators/retention-operator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id")
    .eq("status", "active")
    .is("paused_at", null);

  const ids = (workspaces ?? []).map((w: { id: string }) => w.id);
  let conversion = 0;
  let attendance = 0;
  let retentionCheckIn = 0;
  let retentionReactivation = 0;

  for (const workspaceId of ids) {
    try {
      const c = await runConversionOperator(workspaceId);
      conversion += c.scheduled;
      const a = await runAttendanceOperator(workspaceId);
      attendance += a.scheduled;
      const r1 = await runRetentionCheckIns(workspaceId);
      retentionCheckIn += r1.scheduled;
      const r2 = await runRetentionReactivation(workspaceId);
      retentionReactivation += r2.scheduled;
    } catch {
      // continue
    }
  }

  return NextResponse.json({
    ok: true,
    workspaces: ids.length,
    conversion_scheduled: conversion,
    attendance_scheduled: attendance,
    retention_checkin_scheduled: retentionCheckIn,
    retention_reactivation_scheduled: retentionReactivation,
  });
}
