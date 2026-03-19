import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Vapi integration has been deprecated. Use Recall voice system." },
    { status: 410 }
  );
}
