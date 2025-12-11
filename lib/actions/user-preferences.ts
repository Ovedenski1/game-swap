// lib/actions/user-preferences.ts
"use server";

import { createClient } from "../supabase/server";
import type { GamePlatform } from "@/types/game";

export async function updatePreferredPlatforms(platforms: GamePlatform[]) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) throw new Error(authErr.message);
  if (!user) throw new Error("Not authenticated.");

  // Get current preferences
  const { data: userRow, error: prefsErr } = await supabase
    .from("users")
    .select("preferences")
    .eq("id", user.id)
    .single();

  if (prefsErr) {
    console.error("updatePreferredPlatforms: fetch prefs error", prefsErr);
    throw new Error("Failed to load preferences");
  }

  const currentPrefs = (userRow?.preferences as any) || {};

  const newPrefs = {
    ...currentPrefs,
    preferred_platforms: platforms,
  };

  const { error: updateErr } = await supabase
    .from("users")
    .update({ preferences: newPrefs })
    .eq("id", user.id);

  if (updateErr) {
    console.error("updatePreferredPlatforms: update error", updateErr);
    throw new Error("Failed to save preferred platforms");
  }

  return { success: true };
}
