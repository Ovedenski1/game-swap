// lib/actions/chat-messages.ts
"use server";

import { createClient } from "../supabase/server";

/* =============================
   Types
============================= */

type MatchRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  is_active: boolean;
};

type ChatMessageRow = {
  match_id: string;
  sender_id: string;
  created_at: string;
};

type ChatReadRow = {
  match_id: string;
  last_read_at: string;
};

/* =============================
   Actions
============================= */

/**
 * Save / update the *last* message for a match (one row per match_id)
 */
export async function logChatMessage(matchId: string, content: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    console.error("logChatMessage auth error:", authErr);
    throw new Error(authErr.message);
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("chat_messages")
    .upsert(
      {
        match_id: matchId,
        sender_id: user.id,
        content,
        created_at: new Date().toISOString(),
      },
      { onConflict: "match_id" },
    );

  if (error) {
    console.error("logChatMessage upsert error:", error);
  }
}

/**
 * Mark a conversation as "read" for the current user
 * (called when you open a chat)
 */
export async function markChatRead(matchId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    console.error("markChatRead auth error:", authErr);
    throw new Error(authErr.message);
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("chat_reads")
    .upsert(
      {
        match_id: matchId,
        user_id: user.id,
        last_read_at: now,
      },
      { onConflict: "match_id,user_id" },
    );

  if (error) {
    console.error("markChatRead upsert error:", error);
  }
}

/**
 * Return: how many different chats have an unread last message
 * (i.e. last message is from OTHER user and newer than my last_read_at)
 */
export async function getUnreadChatCount(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    console.error("getUnreadChatCount auth error:", authErr);
    return 0;
  }

  if (!user) return 0;

  // 1) All active matches for this user
  const { data: matchesRaw, error: matchesErr } = await supabase
    .from("matches")
    .select("id, user1_id, user2_id, is_active")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("is_active", true);

  if (matchesErr || !matchesRaw) {
    console.error("getUnreadChatCount matches error:", matchesErr);
    return 0;
  }

  const matches = matchesRaw as unknown as MatchRow[];
  if (matches.length === 0) return 0;

  const matchIds = matches.map((m) => m.id);

  // 2) Last message per match (we already store exactly one per match)
  const { data: lastMessagesRaw, error: msgErr } = await supabase
    .from("chat_messages")
    .select("match_id, sender_id, created_at")
    .in("match_id", matchIds);

  if (msgErr || !lastMessagesRaw) {
    console.error("getUnreadChatCount messages error:", msgErr);
    return 0;
  }

  const lastMessages = lastMessagesRaw as unknown as ChatMessageRow[];
  if (lastMessages.length === 0) return 0;

  // 3) Read markers for this user
  const { data: readsRaw, error: readsErr } = await supabase
    .from("chat_reads")
    .select("match_id, last_read_at")
    .eq("user_id", user.id)
    .in("match_id", matchIds);

  if (readsErr) {
    console.error("getUnreadChatCount reads error:", readsErr);
    return 0;
  }

  const reads = (readsRaw ?? []) as unknown as ChatReadRow[];

  const readMap = new Map<string, string>();
  for (const r of reads) readMap.set(r.match_id, r.last_read_at);

  // 4) Count how many matches have an unread last message
  let unreadChats = 0;

  for (const msg of lastMessages) {
    // Last message must be from OTHER user
    if (msg.sender_id === user.id) continue;

    const lastReadAt = readMap.get(msg.match_id);

    const isUnread =
      !lastReadAt ||
      new Date(msg.created_at).getTime() > new Date(lastReadAt).getTime();

    if (isUnread) unreadChats += 1;
  }

  return unreadChats;
}
