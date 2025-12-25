export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { passUser } from "@/lib/actions/matches";

type PassBody = { toUserId?: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();

    const toUserId =
      isRecord(json) && "toUserId" in json ? (json as PassBody).toUserId : undefined;

    if (typeof toUserId !== "string" || !toUserId.trim()) {
      return NextResponse.json({ error: "Missing toUserId" }, { status: 400 });
    }

    const res = await passUser(toUserId);
    return NextResponse.json(res);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("PASS API ERROR:", message);
    return NextResponse.json(
      { error: message || "Failed to pass user" },
      { status: 500 },
    );
  }
}
