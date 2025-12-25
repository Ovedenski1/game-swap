// lib/actions/games.ts
"use server";

import { createClient } from "../supabase/server";
import type { Game, GamePlatform } from "@/types/game";

/* =============================
   Types (DB row shapes)
============================= */

type GameImageRow = { url: string | null };

type GameRow = {
  id: string;
  owner_id: string;
  title: string;
  platform: GamePlatform;
  description: string | null;
  condition: string | null;
  created_at: string;
  game_images?: GameImageRow[] | null;
};

/* =============================
   Mapper
============================= */

function mapGameRow(row: GameRow): Game {
  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    platform: row.platform,
    description: row.description ?? "",
    condition: row.condition ?? "",
    created_at: row.created_at,
    images: (row.game_images ?? [])
      .map((img) => img.url)
      .filter((u): u is string => typeof u === "string" && u.length > 0),
  };
}

/* ---------- Get ALL games for a specific user (used in swipe) ---------- */
export async function getGamesForUser(userId: string): Promise<Game[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("games")
    .select("id, owner_id, title, platform, description, condition, created_at, game_images(url)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("getGamesForUser error:", error);
    return [];
  }

  return (data as unknown as GameRow[]).map(mapGameRow);
}

/* ---------- Upload a single game image to Supabase Storage ---------- */
export async function uploadGameImage(file: File): Promise<
  | { success: true; url: string }
  | { success: false; error: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${user.id}/game-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("game-images").upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("uploadGameImage error:", error);
    return { success: false, error: error.message };
  }

  const { data } = supabase.storage.from("game-images").getPublicUrl(fileName);
  return { success: true, url: data.publicUrl };
}

/* ---------- Create a new game listing ---------- */
export async function createGameListing(input: {
  title: string;
  platform: GamePlatform;
  description?: string;
  condition?: string;
  imageUrls: string[]; // already uploaded via uploadGameImage
}): Promise<
  | { success: true; gameId: string }
  | { success: false; error: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const { data: gameRow, error } = await supabase
    .from("games")
    .insert({
      owner_id: user.id,
      title: input.title,
      platform: input.platform,
      description: input.description ?? null,
      condition: input.condition ?? null,
      is_available: true,
    })
    .select("id")
    .single();

  if (error || !gameRow?.id) {
    console.error("createGameListing error:", error);
    return { success: false, error: error?.message || "Failed to create game" };
  }

  // Attach images if provided
  if (input.imageUrls.length > 0) {
    const rows = input.imageUrls.map((url) => ({
      game_id: gameRow.id,
      url,
    }));

    const { error: imgErr } = await supabase.from("game_images").insert(rows);
    if (imgErr) {
      console.error("inserting game_images failed:", imgErr);
      // listing still exists; images just failed
    }
  }

  return { success: true, gameId: String(gameRow.id) };
}

/* ---------- Get *my* own games (profile page) ---------- */
export async function getMyGames(): Promise<Game[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("games")
    .select("id, owner_id, title, platform, description, condition, created_at, game_images(url)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("getMyGames error:", error);
    return [];
  }

  return (data as unknown as GameRow[]).map(mapGameRow);
}

/* ---------- Get games to swipe on (unused for now, but ready) ---------- */
export async function getSwipeGames(options?: {
  platforms?: GamePlatform[];
}): Promise<Game[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  let query = supabase
    .from("games")
    .select("id, owner_id, title, platform, description, condition, created_at, game_images(url)")
    .neq("owner_id", user.id)
    .limit(50);

  if (options?.platforms && options.platforms.length > 0) {
    query = query.in("platform", options.platforms);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("getSwipeGames error:", error);
    return [];
  }

  return (data as unknown as GameRow[]).map(mapGameRow);
}

/* ---------- Delete one of my games ---------- */
export async function deleteGame(gameId: string): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", gameId)
    .eq("owner_id", user.id);

  if (error) {
    console.error("deleteGame error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
