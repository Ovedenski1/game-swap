// app/api/chat/mark-read/route.ts
import { NextResponse } from "next/server";
import { markChatRead } from "@/lib/actions/chat-messages";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const matchId: string | undefined = body.matchId;

    if (!matchId) {
      return NextResponse.json(
        { error: "Missing matchId" },
        { status: 400 }
      );
    }

    await markChatRead(matchId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("mark-read route error:", err);
    return NextResponse.json(
      { error: "Failed to mark chat as read" },
      { status: 500 }
    );
  }
}
