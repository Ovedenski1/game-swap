// lib/actions/games.ts
"use server";

import { createClient } from "../supabase/server";
import type { Game, GamePlatform } from "@/types/game";

/* ---------- Get ALL games for a specific user (used in swipe) ---------- */
export async function getGamesForUser(userId: string): Promise<Game[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("games")
    // IMPORTANT: we do NOT filter by is_available here,
    // because your column name in the DB is a bit different
    // and that was returning 0 rows.
    .select("*, game_images(url)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("getGamesForUser error:", error);
    return [];
  }

  return data.map((g: any) => ({
    id: g.id,
    owner_id: g.owner_id,
    title: g.title,
    platform: g.platform,
    description: g.description,
    condition: g.condition,
    created_at: g.created_at,
    images: (g.game_images || []).map((img: any) => img.url),
  }));
}

/* ---------- Upload a single game image to Supabase Storage ---------- */
export async function uploadGameImage(file: File) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const ext = file.name.split(".").pop();
  const fileName = `${user.id}/game-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("game-images") // bucket name
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("uploadGameImage error:", error);
    return { success: false, error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("game-images").getPublicUrl(fileName);

  return { success: true, url: publicUrl };
}

/* ---------- Create a new game listing ---------- */
export async function createGameListing(input: {
  title: string;
  platform: GamePlatform;
  description?: string;
  condition?: string;
  imageUrls: string[]; // already uploaded via uploadGameImage
}) {
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
      // use whatever your column is called, or omit it:
      is_available: true,
    })
    .select("*")
    .single();

  if (error || !gameRow) {
    console.error("createGameListing error:", error);
    return { success: false, error: error?.message || "Failed to create game" };
  }

  // Attach images if provided
  if (input.imageUrls.length > 0) {
    const { error: imgErr } = await supabase.from("game_images").insert(
      input.imageUrls.map((url) => ({
        game_id: gameRow.id,
        url,
      }))
    );

    if (imgErr) {
      console.error("inserting game_images failed:", imgErr);
      // listing still exists; images just failed
    }
  }

  return { success: true, gameId: gameRow.id };
}

/* ---------- Get *my* own games (profile page) ---------- */
export async function getMyGames(): Promise<Game[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("games")
    .select("*, game_images(url)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("getMyGames error:", error);
    return [];
  }

  return data.map((g: any) => ({
    id: g.id,
    owner_id: g.owner_id,
    title: g.title,
    platform: g.platform,
    description: g.description,
    condition: g.condition,
    created_at: g.created_at,
    images: (g.game_images || []).map((img: any) => img.url),
  }));
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
    .select("*, game_images(url)")
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

  return data.map((g: any) => ({
    id: g.id,
    owner_id: g.owner_id,
    title: g.title,
    platform: g.platform,
    description: g.description,
    condition: g.condition,
    created_at: g.created_at,
    images: (g.game_images || []).map((img: any) => img.url),
  }));
}

/* ---------- Delete one of my games ---------- */
export async function deleteGame(gameId: string) {
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
