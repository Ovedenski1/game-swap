"use client";

import { useState } from "react";
import type { GamePlatform } from "@/types/game";
import { upsertPreferredPlatforms } from "@/lib/actions/profile";

const PLATFORM_LABELS: Record<GamePlatform, string> = {
  ps1: "PlayStation 1",
  ps2: "PlayStation 2",
  ps3: "PlayStation 3",
  ps4: "PlayStation 4",
  ps5: "PlayStation 5",
  xbox: "Xbox",
  xbox360: "Xbox 360",
  xbox_one: "Xbox One",
  xbox_series: "Xbox Series X|S",
  switch: "Nintendo Switch",
  wii: "Nintendo Wii",
  wiiu: "Nintendo Wii U",
  ds: "Nintendo DS",
  "3ds": "Nintendo 3DS",
  pc: "PC",
  sega: "Sega",
  other: "Other",
};

const PLATFORM_GROUPS: { label: string; options: GamePlatform[] }[] = [
  {
    label: "PlayStation",
    options: ["ps1", "ps2", "ps3", "ps4", "ps5"],
  },
  {
    label: "Xbox",
    options: ["xbox", "xbox360", "xbox_one", "xbox_series"],
  },
  {
    label: "Nintendo",
    options: ["switch", "wii", "wiiu", "ds", "3ds"],
  },
  {
    label: "Other",
    options: ["pc", "sega", "other"],
  },
];

interface Props {
  initialSelected: GamePlatform[];
}

export default function PlatformPreferencesForm({ initialSelected }: Props) {
  const [selected, setSelected] = useState<GamePlatform[]>(initialSelected);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function togglePlatform(platform: GamePlatform) {
    setSelected((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await upsertPreferredPlatforms(selected);

    if (!res.success) {
      setMessage(res.error || "Failed to save preferences.");
    } else {
      setMessage("Preferences saved! Your matches will now be filtered.");
    }

    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-sm text-white/70 mb-3">
          Choose which platforms you want to see when swiping.  
          If you select nothing, you&apos;ll see games from all platforms.
        </p>

        <div className="space-y-4">
          {PLATFORM_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-wide">
                {group.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.options.map((platform) => {
                  const isActive = selected.includes(platform);
                  const label = PLATFORM_LABELS[platform];

                  let colorClass =
                    "border-white/40 text-white/80 hover:bg-white/5";
                  if (platform.startsWith("ps")) {
                    colorClass =
                      "border-blue-400/70 text-blue-100 hover:bg-blue-500/10";
                  } else if (platform.startsWith("xbox")) {
                    colorClass =
                      "border-emerald-400/70 text-emerald-100 hover:bg-emerald-500/10";
                  } else if (
                    ["switch", "wii", "wiiu", "ds", "3ds"].includes(platform)
                  ) {
                    colorClass =
                      "border-red-400/70 text-red-100 hover:bg-red-500/10";
                  } else if (platform === "pc") {
                    colorClass =
                      "border-sky-400/70 text-sky-100 hover:bg-sky-500/10";
                  } else if (platform === "sega") {
                    colorClass =
                      "border-yellow-300/70 text-yellow-100 hover:bg-yellow-400/10";
                  }

                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={`text-[11px] px-3 py-1.5 rounded-full border transition ${
                        isActive
                          ? `${colorClass} bg-white/10`
                          : `${colorClass} bg-transparent`
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {message && (
        <p className="text-xs text-center text-white/70 bg-white/5 rounded-lg py-2 px-3">
          {message}
        </p>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-[#C6FF00] text-black text-sm font-semibold px-4 py-2 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save Preferences"}
        </button>
      </div>
    </form>
  );
}
