// lib/actions/matches.ts
"use server";

import { UserProfile } from "@/app/profile/page";
import { createClient } from "../supabase/server";
import type { Game } from "@/types/game";

export interface PotentialMatch {
  user: UserProfile;
  games: Game[];
}

export interface ChatSummary {
  matchId: string;
  otherUser: UserProfile;
  lastMessage: string | null;
  lastMessageTime: string; // timestamp string
  unreadCount: number;     // 👈 add this
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
    if (authErr.name === "AuthSessionMissingError") {
      console.warn("getPotentialMatches: auth session missing (logged out).");
      return [];
    }
    console.error("getPotentialMatches auth error:", authErr);
    throw new Error(authErr.message);
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

  const likedIds = (likedRows ?? []).map((row) => row.to_user_id as string);

  /* ---------- 2) Users I already passed ---------- */
  const { data: passedRows, error: passedErr } = await supabase
    .from("passes")
    .select("to_user_id")
    .eq("from_user_id", user.id);

  if (passedErr) {
    console.error("Failed to fetch passed users:", passedErr);
  }

  const passedIds = (passedRows ?? []).map((row) => row.to_user_id as string);

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

  const preferredPlatforms =
    (meRow?.preferences as any)?.preferred_platforms ?? [];

  const platformFilter: string[] = Array.isArray(preferredPlatforms)
    ? preferredPlatforms.filter(Boolean)
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

  for (const g of candidateGames as any[]) {
    const ownerId = g.owner_id as string;
    if (!ownerId) continue;

    const images = (g.game_images || []).map((img: any) => img.url as string);

    const mappedGame: Game = {
      id: g.id,
      owner_id: ownerId,
      title: g.title,
      platform: g.platform,
      description: g.description,
      condition: g.condition,
      created_at: g.created_at,
      images,
    };

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
    users
      ?.filter((u) => !excludedIds.has(u.id))
      .map((u) => {
        const games = gamesByOwner.get(u.id) ?? [];

        const profile: UserProfile = {
          id: u.id,
          full_name: u.full_name,
          username: u.username,
          email: u.email,
          gender: u.gender,
          birthdate: u.birthdate,
          bio: u.bio,
          avatar_url: u.avatar_url,
          city: u.city ?? null,
          preferences: u.preferences,
          location_lat: u.location_lat,
          location_lng: u.location_lng,
          last_active: u.last_active ?? new Date().toISOString(),
          is_verified: u.is_verified ?? false,
          is_online: u.is_online ?? false,
          created_at: u.created_at ?? new Date().toISOString(),
          updated_at: u.updated_at ?? new Date().toISOString(),
        };

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

  if (authErr) throw new Error(authErr.message);
  if (!user) throw new Error("Not authenticated.");

  const { error: likeError } = await supabase.from("likes").insert({
    from_user_id: user.id,
    to_user_id: toUserId,
    game_id: gameId ?? null,
  });

  if (likeError && (likeError as any).code !== "23505") {
    console.error("Failed to create like:", likeError);
    return { success: false, isMatch: false, matchedUser: null, matchId: null };
  }

  const { data: existingLike, error: checkError } = await supabase
    .from("likes")
    .select("*")
    .eq("from_user_id", toUserId)
    .eq("to_user_id", user.id)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
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

  if (matchFetchErr && matchFetchErr.code !== "PGRST116") {
    console.error("Failed to fetch existing match:", matchFetchErr);
  }

  if (existingMatch) {
    matchId = existingMatch.id as string;
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
      matchId = newMatch?.id as string;
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
  if (authErr) throw new Error(authErr.message);
  if (!user) throw new Error("Not authenticated.");

  const { error } = await supabase.from("passes").insert({
    from_user_id: user.id,
    to_user_id: toUserId,
  });

  if (error && (error as any).code !== "23505") {
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

  for (const match of matches || []) {
    const otherUserId =
      match.user1_id === user.id ? match.user2_id : match.user1_id;

    const { data: otherUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", otherUserId)
      .single();

    if (userError || !otherUser) {
      console.error("Failed to fetch matched user:", userError);
      continue;
    }

    matchedUsers.push({
      id: otherUser.id,
      full_name: otherUser.full_name,
      username: otherUser.username,
      email: otherUser.email,
      gender: otherUser.gender,
      birthdate: otherUser.birthdate,
      bio: otherUser.bio,
      avatar_url: otherUser.avatar_url,
      preferences: otherUser.preferences,
      location_lat: otherUser.location_lat,
      location_lng: otherUser.location_lng,
      last_active: otherUser.last_active ?? new Date().toISOString(),
      is_verified: otherUser.is_verified ?? false,
      is_online: otherUser.is_online ?? false,
      created_at: match.created_at,
      updated_at: match.created_at,
    });
  }

  return matchedUsers;
}

// lib/actions/matches.ts

/* ---------- Get chats + last message per match ---------- */
// lib/actions/matches.ts  (only the getUserChats part)

// lib/actions/matches.ts

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

  for (const match of matches) {
    const otherUserId =
      match.user1_id === user.id ? match.user2_id : match.user1_id;

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
      .eq("match_id", match.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (msgErr && msgErr.code !== "PGRST116") {
      console.error("getUserChats last message error:", msgErr);
    }

    // 3) unread?  (has the other person sent something after my last_read_at)
    let unreadCount = 0;

    if (lastMsgRow) {
      const { data: readRow, error: readErr } = await supabase
        .from("chat_reads")
        .select("last_read_at")
        .eq("match_id", match.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (readErr && readErr.code !== "PGRST116") {
        console.error("getUserChats readRow error:", readErr);
      }

      const lastReadAt = readRow?.last_read_at
        ? new Date(readRow.last_read_at)
        : null;
      const lastMsgAt = new Date(lastMsgRow.created_at);

      if (
        lastMsgRow.sender_id !== user.id && // message from OTHER user
        (!lastReadAt || lastMsgAt > lastReadAt)
      ) {
        unreadCount = 1; // we only care "has unread?", not exact number
      }
    }

    const profile: UserProfile = {
      id: otherUser.id,
      full_name: otherUser.full_name,
      username: otherUser.username,
      email: otherUser.email,
      gender: otherUser.gender,
      birthdate: otherUser.birthdate,
      bio: otherUser.bio,
      avatar_url: otherUser.avatar_url,
      city: otherUser.city ?? null,
      preferences: otherUser.preferences,
      location_lat: otherUser.location_lat,
      location_lng: otherUser.location_lng,
      last_active: otherUser.last_active ?? new Date().toISOString(),
      is_verified: otherUser.is_verified ?? false,
      is_online: otherUser.is_online ?? false,
      created_at: otherUser.created_at ?? new Date().toISOString(),
      updated_at: otherUser.updated_at ?? new Date().toISOString(),
    };

    chats.push({
      matchId: match.id as string,
      otherUser: profile,
      lastMessage: lastMsgRow?.content ?? null,
      lastMessageTime:
        lastMsgRow?.created_at ??
        match.created_at ??
        new Date().toISOString(),
      unreadCount,
    });
  }

  // newest chats first
  chats.sort(
    (a, b) =>
      new Date(b.lastMessageTime).getTime() -
      new Date(a.lastMessageTime).getTime(),
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

  if (authErr) throw new Error(authErr.message);
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

  const myGameIds = (myLikes || [])
    .map((row) => row.game_id as string)
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

  const theirGameIds = (theirLikes || [])
    .map((row) => row.game_id as string)
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

  const myWantedGames: Game[] = (myGamesRes.data || []).map((g: any) => ({
    id: g.id,
    owner_id: g.owner_id,
    title: g.title,
    platform: g.platform,
    description: g.description,
    condition: g.condition,
    created_at: g.created_at,
    images: (g.game_images || []).map((img: any) => img.url),
  }));

  const theirWantedGames: Game[] = (theirGamesRes.data || []).map(
    (g: any) => ({
      id: g.id,
      owner_id: g.owner_id,
      title: g.title,
      platform: g.platform,
      description: g.description,
      condition: g.condition,
      created_at: g.created_at,
      images: (g.game_images || []).map((img: any) => img.url),
    }),
  );

  return { myWantedGames, theirWantedGames };
}
