// lib/actions/matches.ts
"use server";

import { UserProfile } from "@/components/ProfilePage";
import { createClient } from "../supabase/server";
import type { Game } from "@/types/game";

/* =========================================================================
 * Small helpers (no `any`, keep runtime behavior stable)
 * =======================================================================*/

type Row = Record<string, unknown>;

function asRow(v: unknown): Row {
  return typeof v === "object" && v !== null ? (v as Row) : {};
}

function toStringValue(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function toNullableString(v: unknown): string | null {
  return v == null ? null : typeof v === "string" ? v : String(v);
}

function toNumberValue(v: unknown, fallback = 0): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toIsoStringOrNow(v: unknown): string {
  if (typeof v === "string" && v.trim() !== "") return v;
  return new Date().toISOString();
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => toStringValue(x)).filter(Boolean);
}

function toPgErrorCode(err: unknown): string | undefined {
  const code = asRow(err).code;
  return typeof code === "string" ? code : undefined;
}

function toPgErrorName(err: unknown): string | undefined {
  const name = asRow(err).name;
  return typeof name === "string" ? name : undefined;
}

function mapUserProfile(uInput: unknown): UserProfile {
  const u = asRow(uInput);

  return {
    id: toStringValue(u.id),
    full_name: toStringValue(u.full_name),
    username: toStringValue(u.username),
    email: toStringValue(u.email),
    
    birthdate: toStringValue(u.birthdate),
    bio: toStringValue(u.bio),
    avatar_url: toStringValue(u.avatar_url),
    city: (u.city == null ? null : toNullableString(u.city)) ?? null,
    preferences: u.preferences as UserProfile["preferences"],
    location_lat: u.location_lat as UserProfile["location_lat"],
    location_lng: u.location_lng as UserProfile["location_lng"],
    last_active: toIsoStringOrNow(u.last_active),
    is_verified: Boolean(u.is_verified ?? false),
    is_online: Boolean(u.is_online ?? false),
    created_at: toIsoStringOrNow(u.created_at),
    updated_at: toIsoStringOrNow(u.updated_at),
  };
}

function mapUserProfileFromMatch(otherUserInput: unknown, matchInput: unknown): UserProfile {
  const otherUser = asRow(otherUserInput);
  const match = asRow(matchInput);

  // This matches your previous behavior for getUserMatches:
  // created_at/updated_at come from match.created_at.
  return {
    id: toStringValue(otherUser.id),
    full_name: toStringValue(otherUser.full_name),
    username: toStringValue(otherUser.username),
    email: toStringValue(otherUser.email),
    
    birthdate: toStringValue(otherUser.birthdate),
    bio: toStringValue(otherUser.bio),
    avatar_url: toStringValue(otherUser.avatar_url),
    preferences: otherUser.preferences as UserProfile["preferences"],
    location_lat: otherUser.location_lat as UserProfile["location_lat"],
    location_lng: otherUser.location_lng as UserProfile["location_lng"],
    last_active: toIsoStringOrNow(otherUser.last_active),
    is_verified: Boolean(otherUser.is_verified ?? false),
    is_online: Boolean(otherUser.is_online ?? false),
    created_at: toIsoStringOrNow(match.created_at),
    updated_at: toIsoStringOrNow(match.created_at),
  };
}

function mapGameFromRow(gInput: unknown): Game {
  const g = asRow(gInput);

  const images = Array.isArray(g.game_images)
    ? (g.game_images as unknown[]).map((img) => toStringValue(asRow(img).url)).filter(Boolean)
    : [];

  return {
    id: toStringValue(g.id),
    owner_id: toStringValue(g.owner_id),
    title: toStringValue(g.title),
    platform: g.platform as Game["platform"],

    description: toStringValue(g.description),
    condition: toStringValue(g.condition),
    created_at: toStringValue(g.created_at),
    images,
  };
}

/* =========================================================================
 * Types
 * =======================================================================*/

export interface PotentialMatch {
  user: UserProfile;
  games: Game[];
}

export interface ChatSummary {
  matchId: string;
  otherUser: UserProfile;
  lastMessage: string | null;
  lastMessageTime: string; // timestamp string
  unreadCount: number;
}

/* ---------- Get potential matches for swiping ---------- */
export async function getPotentialMatches(): Promise<PotentialMatch[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  // handle "Auth session missing" gracefully
  if (authErr) {
    if (toPgErrorName(authErr) === "AuthSessionMissingError") {
      console.warn("getPotentialMatches: auth session missing (logged out).");
      return [];
    }
    console.error("getPotentialMatches auth error:", authErr);
    throw new Error((authErr as Error).message);
  }

  if (!user) {
    // treat as logged out – caller (client) will redirect
    return [];
  }

  /* ---------- 1) Users I already liked ---------- */
  const { data: likedRows, error: likedErr } = await supabase
    .from("likes")
    .select("to_user_id")
    .eq("from_user_id", user.id);

  if (likedErr) {
    console.error("Failed to fetch liked users:", likedErr);
  }

  const likedIds = (likedRows as unknown[] | null | undefined ?? []).map((row) =>
    toStringValue(asRow(row).to_user_id),
  );

  /* ---------- 2) Users I already passed ---------- */
  const { data: passedRows, error: passedErr } = await supabase
    .from("passes")
    .select("to_user_id")
    .eq("from_user_id", user.id);

  if (passedErr) {
    console.error("Failed to fetch passed users:", passedErr);
  }

  const passedIds = (passedRows as unknown[] | null | undefined ?? []).map((row) =>
    toStringValue(asRow(row).to_user_id),
  );

  const excludedIds = new Set<string>([user.id, ...likedIds, ...passedIds]);

  /* ---------- 3) My platform preferences ---------- */
  const { data: meRow, error: meErr } = await supabase
    .from("users")
    .select("preferences")
    .eq("id", user.id)
    .single();

  if (meErr) {
    console.error("Failed to load my preferences:", meErr);
  }

  const prefs = asRow((meRow as Row | null | undefined)?.preferences);
  const preferredPlatforms = prefs.preferred_platforms;

  const platformFilter: string[] = Array.isArray(preferredPlatforms)
    ? toStringArray(preferredPlatforms)
    : [];

  /* ---------- 4) Candidate games for OTHER users ---------- */
  let gamesQuery = supabase
    .from("games")
    .select(
      "id, owner_id, title, platform, description, condition, created_at, is_available, game_images (url)",
    )
    .eq("is_available", true)
    .neq("owner_id", user.id);

  if (platformFilter.length > 0) {
    gamesQuery = gamesQuery.in("platform", platformFilter);
  }

  const { data: candidateGames, error: gamesErr } = await gamesQuery;

  if (gamesErr) {
    console.error("Failed to fetch candidate games:", gamesErr);
    return [];
  }

  if (!candidateGames || candidateGames.length === 0) {
    return [];
  }

  /* ---------- 5) Group games by owner ---------- */
  const gamesByOwner = new Map<string, Game[]>();

  for (const g of candidateGames as unknown[]) {
    const row = asRow(g);
    const ownerId = toNullableString(row.owner_id);
    if (!ownerId) continue;

    const mappedGame = mapGameFromRow(row);

    const list = gamesByOwner.get(ownerId) ?? [];
    list.push(mappedGame);
    gamesByOwner.set(ownerId, list);
  }

  const candidateUserIds = Array.from(gamesByOwner.keys());
  if (candidateUserIds.length === 0) return [];

  /* ---------- 6) Fetch those users ---------- */
  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("*")
    .in("id", candidateUserIds)
    .limit(50);

  if (usersErr) {
    console.error("Failed to fetch potential match users:", usersErr);
    throw new Error("Failed to fetch potential matches");
  }

  /* ---------- 7) Build final list user + games ---------- */
  const potentialMatches: PotentialMatch[] =
    (users as unknown[] | null | undefined)
      ?.filter((u) => !excludedIds.has(toStringValue(asRow(u).id)))
      .map((u) => {
        const uRow = asRow(u);
        const userId = toStringValue(uRow.id);
        const games = gamesByOwner.get(userId) ?? [];

        const profile = mapUserProfile(uRow);
        return { user: profile, games };
      }) || [];

  return potentialMatches;
}

/* ---------- Like a user (optionally for a specific game) ---------- */
export async function likeUser(toUserId: string, gameId?: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) throw new Error((authErr as Error).message);
  if (!user) throw new Error("Not authenticated.");

  const { error: likeError } = await supabase.from("likes").insert({
    from_user_id: user.id,
    to_user_id: toUserId,
    game_id: gameId ?? null,
  });

  if (likeError && toPgErrorCode(likeError) !== "23505") {
    console.error("Failed to create like:", likeError);
    return { success: false, isMatch: false, matchedUser: null, matchId: null };
  }

  const { data: existingLike, error: checkError } = await supabase
    .from("likes")
    .select("*")
    .eq("from_user_id", toUserId)
    .eq("to_user_id", user.id)
    .single();

  if (checkError && toPgErrorCode(checkError) !== "PGRST116") {
    console.error("Failed to check for match:", checkError);
    return { success: false, isMatch: false, matchedUser: null, matchId: null };
  }

  if (!existingLike) {
    return { success: true, isMatch: false, matchedUser: null, matchId: null };
  }

  const ordered = [user.id, toUserId].sort();
  const user1 = ordered[0];
  const user2 = ordered[1];

  const { data: existingMatch, error: matchFetchErr } = await supabase
    .from("matches")
    .select("*")
    .eq("user1_id", user1)
    .eq("user2_id", user2)
    .maybeSingle();

  let matchId: string | null = null;

  if (matchFetchErr && toPgErrorCode(matchFetchErr) !== "PGRST116") {
    console.error("Failed to fetch existing match:", matchFetchErr);
  }

  const existingMatchRow = existingMatch ? asRow(existingMatch) : null;

  if (existingMatchRow) {
    matchId = toNullableString(existingMatchRow.id);
  } else {
    const { data: newMatch, error: matchInsertErr } = await supabase
      .from("matches")
      .insert({
        user1_id: user1,
        user2_id: user2,
        is_active: true,
      })
      .select()
      .single();

    if (matchInsertErr) {
      console.error("Failed to create match:", matchInsertErr);
    } else {
      matchId = toNullableString(asRow(newMatch).id);
    }
  }

  const { data: matchedUser, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", toUserId)
    .single();

  if (userError) {
    console.error("Failed to fetch matched user:", userError);
    return { success: false, isMatch: false, matchedUser: null, matchId };
  }

  return {
    success: true,
    isMatch: true,
    matchedUser: matchedUser as UserProfile,
    matchId,
  };
}

/* ---------- Pass user ---------- */
export async function passUser(toUserId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) throw new Error((authErr as Error).message);
  if (!user) throw new Error("Not authenticated.");

  const { error } = await supabase.from("passes").insert({
    from_user_id: user.id,
    to_user_id: toUserId,
  });

  if (error && toPgErrorCode(error) !== "23505") {
    throw new Error("Failed to save pass");
  }

  return { success: true };
}

/* ---------- Get my matched users (no messages) ---------- */
export async function getUserMatches() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    console.error("getUserMatches auth error:", authErr);
    // don’t crash the UI, just behave as “no matches”
    return [];
  }

  if (!user) {
    // not logged in → no matches
    console.warn("getUserMatches called without user – returning empty list.");
    return [];
  }

  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("is_active", true);

  if (error) {
    console.error("Failed to fetch matches:", error);
    return [];
  }

  const matchedUsers: UserProfile[] = [];

  for (const match of (matches as unknown[] | null | undefined) ?? []) {
    const m = asRow(match);

    const user1Id = toStringValue(m.user1_id);
    const user2Id = toStringValue(m.user2_id);

    const otherUserId = user1Id === user.id ? user2Id : user1Id;

    const { data: otherUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", otherUserId)
      .single();

    if (userError || !otherUser) {
      console.error("Failed to fetch matched user:", userError);
      continue;
    }

    matchedUsers.push(mapUserProfileFromMatch(otherUser, m));
  }

  return matchedUsers;
}

/* ---------- Get chats + last message per match ---------- */
export async function getUserChats(): Promise<ChatSummary[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    console.error("getUserChats auth error:", authErr);
    return [];
  }

  if (!user) {
    console.warn("getUserChats called without user – returning empty list.");
    return [];
  }

  const { data: matches, error: matchesErr } = await supabase
    .from("matches")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("is_active", true);

  if (matchesErr) {
    console.error("getUserChats matches error:", matchesErr);
    return [];
  }

  if (!matches || matches.length === 0) return [];

  const chats: ChatSummary[] = [];

  for (const match of matches as unknown[]) {
    const m = asRow(match);

    const matchId = toStringValue(m.id);
    const user1Id = toStringValue(m.user1_id);
    const user2Id = toStringValue(m.user2_id);

    const otherUserId = user1Id === user.id ? user2Id : user1Id;

    // 1) load other user
    const { data: otherUser, error: userErr } = await supabase
      .from("users")
      .select("*")
      .eq("id", otherUserId)
      .single();

    if (userErr || !otherUser) {
      console.error("getUserChats other user error:", userErr);
      continue;
    }

    // 2) last message for this match (newest one)
    const { data: lastMsgRow, error: msgErr } = await supabase
      .from("chat_messages")
      .select("content, created_at, sender_id")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (msgErr && toPgErrorCode(msgErr) !== "PGRST116") {
      console.error("getUserChats last message error:", msgErr);
    }

    const lastMsg = lastMsgRow ? asRow(lastMsgRow) : null;

    // 3) unread?  (has the other person sent something after my last_read_at)
    let unreadCount = 0;

    if (lastMsg) {
      const { data: readRow, error: readErr } = await supabase
        .from("chat_reads")
        .select("last_read_at")
        .eq("match_id", matchId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (readErr && toPgErrorCode(readErr) !== "PGRST116") {
        console.error("getUserChats readRow error:", readErr);
      }

      const read = readRow ? asRow(readRow) : null;

      const lastReadAt =
        read?.last_read_at != null ? new Date(toStringValue(read.last_read_at)) : null;
      const lastMsgAt = new Date(toStringValue(lastMsg.created_at));

      const senderId = toStringValue(lastMsg.sender_id);

      if (senderId !== user.id && (!lastReadAt || lastMsgAt > lastReadAt)) {
        unreadCount = 1; // we only care "has unread?", not exact number
      }
    }

    const profile = mapUserProfile(otherUser);

    chats.push({
      matchId,
      otherUser: profile,
      lastMessage: lastMsg ? toNullableString(lastMsg.content) : null,
      lastMessageTime:
        (lastMsg ? toNullableString(lastMsg.created_at) : null) ??
        toNullableString(m.created_at) ??
        new Date().toISOString(),
      unreadCount,
    });
  }

  // newest chats first
  chats.sort(
    (a, b) =>
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime(),
  );

  return chats;
}

/* ---------- Swap context ---------- */
export async function getSwapContext(
  otherUserId: string,
): Promise<{
  myWantedGames: Game[];
  theirWantedGames: Game[];
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) throw new Error((authErr as Error).message);
  if (!user) throw new Error("Not authenticated.");

  const { data: myLikes, error: myLikesErr } = await supabase
    .from("likes")
    .select("game_id")
    .eq("from_user_id", user.id)
    .eq("to_user_id", otherUserId)
    .not("game_id", "is", null);

  if (myLikesErr) {
    console.error("getSwapContext myLikes error:", myLikesErr);
  }

  const myGameIds = ((myLikes as unknown[] | null | undefined) ?? [])
    .map((row) => toStringValue(asRow(row).game_id))
    .filter(Boolean);

  const { data: theirLikes, error: theirLikesErr } = await supabase
    .from("likes")
    .select("game_id")
    .eq("from_user_id", otherUserId)
    .eq("to_user_id", user.id)
    .not("game_id", "is", null);

  if (theirLikesErr) {
    console.error("getSwapContext theirLikes error:", theirLikesErr);
  }

  const theirGameIds = ((theirLikes as unknown[] | null | undefined) ?? [])
    .map((row) => toStringValue(asRow(row).game_id))
    .filter(Boolean);

  if (myGameIds.length === 0 && theirGameIds.length === 0) {
    return { myWantedGames: [], theirWantedGames: [] };
  }

  const [myGamesRes, theirGamesRes] = await Promise.all([
    myGameIds.length
      ? supabase
          .from("games")
          .select(
            "id, owner_id, title, platform, description, condition, created_at, game_images(url)",
          )
          .in("id", myGameIds)
      : { data: [], error: null },
    theirGameIds.length
      ? supabase
          .from("games")
          .select(
            "id, owner_id, title, platform, description, condition, created_at, game_images(url)",
          )
          .in("id", theirGameIds)
      : { data: [], error: null },
  ]);

  if (myGamesRes.error) {
    console.error("getSwapContext myGames error:", myGamesRes.error);
  }
  if (theirGamesRes.error) {
    console.error("getSwapContext theirGames error:", theirGamesRes.error);
  }

  const myWantedGames: Game[] = ((myGamesRes.data as unknown[] | null | undefined) ?? []).map(
    (g) => mapGameFromRow(g),
  );

  const theirWantedGames: Game[] = (
    (theirGamesRes.data as unknown[] | null | undefined) ?? []
  ).map((g) => mapGameFromRow(g));

  return { myWantedGames, theirWantedGames };
}
