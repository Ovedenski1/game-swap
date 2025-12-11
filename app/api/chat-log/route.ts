import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    console.error("chat-log auth error:", authErr);
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const matchId: string | undefined = body.matchId;
  const contentRaw: string | undefined = body.content;

  if (!matchId || !contentRaw || !contentRaw.trim()) {
    return NextResponse.json(
      { error: "Missing matchId or content" },
      { status: 400 },
    );
  }

  const content = contentRaw.trim();
  const now = new Date().toISOString();

  // 👉 ONE ROW PER MATCH: update or insert
  const { data, error } = await supabase
    .from("chat_messages")
    .upsert(
      [
        {
          match_id: matchId,
          sender_id: user.id,
          content,
          created_at: now,
        },
      ],
      {
        onConflict: "match_id",       // requires UNIQUE(match_id)
        ignoreDuplicates: false,
      },
    )
    .select()
    .single();

  if (error) {
    console.error("chat-log upsert error:", error);
    return NextResponse.json(
      { error: "Failed to save last message" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, row: data });
}
