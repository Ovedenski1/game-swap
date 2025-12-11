export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { passUser } from "@/lib/actions/matches";

export async function POST(req: Request) {
  try {
    const { toUserId } = await req.json();
    if (!toUserId) {
      return NextResponse.json({ error: "Missing toUserId" }, { status: 400 });
    }
    const res = await passUser(toUserId);
    return NextResponse.json(res);
  } catch (e: any) {
    console.error("PASS API ERROR:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed to pass user" }, { status: 500 });
  }
}