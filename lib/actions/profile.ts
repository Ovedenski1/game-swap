"use server";

import { createClient } from "../supabase/server";
import type { GamePlatform } from "@/types/game";

/* =========================================================================
 * Helpers (no `any`, stable runtime)
 * =======================================================================*/

type Row = Record<string, unknown>;

function asRow(v: unknown): Row {
  return typeof v === "object" && v !== null ? (v as Row) : {};
}

/* ========= PREFERRED PLATFORMS ========= */

export async function upsertPreferredPlatforms(
  platforms: GamePlatform[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    console.error(authErr);
    return { success: false, error: authErr.message };
  }

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("users")
    .select("preferences")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Failed to load preferences:", error);
    return { success: false, error: "Failed to load preferences." };
  }

  // preferences could be null, an object, or something else (avoid `any`)
  const currentPrefs = asRow((data as Row | null | undefined)?.preferences);
  const nextPrefs: Row = { ...currentPrefs, preferred_platforms: platforms };

  const { error: updateErr } = await supabase
    .from("users")
    .update({ preferences: nextPrefs })
    .eq("id", user.id);

  if (updateErr) {
    console.error("Failed to update preferences:", updateErr);
    return { success: false, error: "Failed to update preferences." };
  }

  return { success: true };
}

/* ========= LOAD CURRENT USER PROFILE ========= */

export async function getCurrentUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return profile;
}

/* ========= UPDATE PROFILE (ONLY name, city, avatar) ========= */

type UpdateProfilePayload = {
  full_name: string;
  city?: string;
  avatar_url?: string;
};

export async function updateUserProfile(profileData: UpdateProfilePayload) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const { error } = await supabase
    .from("users")
    .update({
      full_name: profileData.full_name,
      city:
        profileData.city && profileData.city.trim().length > 0
          ? profileData.city
          : null,
      avatar_url:
        profileData.avatar_url && profileData.avatar_url.trim().length > 0
          ? profileData.avatar_url
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.log(error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/* ========= UPLOAD PROFILE PHOTO ========= */

export async function uploadProfilePhoto(file: File) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("profile-photos")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("profile-photos").getPublicUrl(fileName);

  return { success: true, url: publicUrl };
}
