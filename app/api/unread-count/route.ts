import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/unread-count
 * Returns: { count: number }
 *
 * "count" = how many conversations (matches) have a last message
 * from someone else that the current user has not read yet.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  // If not logged in we just say 0 (navbar will hide the badge)
  if (authErr || !user) {
    if (authErr) console.error("unread-count auth error:", authErr);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  const userId = user.id;

  // 1) Find all active matches for this user
  const { data: matches, error: matchesErr } = await supabase
    .from("matches")
    .select("id, user1_id, user2_id")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq("is_active", true);

  if (matchesErr || !matches || matches.length === 0) {
    if (matchesErr) {
      console.error("unread-count matches error:", matchesErr);
    }
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  const matchIds = matches.map((m) => m.id as string);

  // 2) Grab the *last* message per match from chat_messages
  // (remember: chat_messages has UNIQUE(match_id), so one row per match)
  const { data: lastMessages, error: msgErr } = await supabase
    .from("chat_messages")
    .select("match_id, sender_id, created_at")
    .in("match_id", matchIds);

  if (msgErr || !lastMessages) {
    if (msgErr) console.error("unread-count messages error:", msgErr);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  // 3) Read markers for THIS user
  const { data: readRows, error: readErr } = await supabase
    .from("chat_reads")
    .select("match_id, last_read_at")
    .eq("user_id", userId);

  if (readErr) {
    console.error("unread-count chat_reads error:", readErr);
  }

  const readMap = new Map<string, string>();
  (readRows ?? []).forEach((row) => {
    readMap.set(row.match_id as string, row.last_read_at as string);
  });

  // 4) Count conversations where:
  //    - last message sender is NOT me
  //    - AND (no read row yet OR last message is newer than my last_read_at)
  let unreadConversationCount = 0;

  for (const msg of lastMessages) {
    const matchId = msg.match_id as string;
    const senderId = msg.sender_id as string;
    const createdAtStr = msg.created_at as string;

    // Ignore conversations where the last message is from ME
    if (senderId === userId) continue;

    const lastReadAtStr = readMap.get(matchId);

    if (!lastReadAtStr) {
      // never marked as read -> definitely unread
      unreadConversationCount += 1;
      continue;
    }

    const lastMsgTime = new Date(createdAtStr).getTime();
    const lastReadTime = new Date(lastReadAtStr).getTime();

    if (isNaN(lastMsgTime) || isNaN(lastReadTime)) continue;

    if (lastMsgTime > lastReadTime) {
      unreadConversationCount += 1;
    }
  }

  return NextResponse.json({ count: unreadConversationCount }, { status: 200 });
}
