import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/actions/profile";
import PlatformPreferencesForm from "@/components/PlatformPreferencesForm";
import type { GamePlatform } from "@/types/game";

export default async function PlatformPreferencesPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/auth");
  }

  const preferred =
    ((profile.preferences?.preferred_platforms || []) as GamePlatform[]) || [];

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
      {/* Header (client style) */}
      <header className="text-center">
        <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />

        <div className="flex items-center justify-between gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/20 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-white/90 hover:bg-black/30 transition"
          >
            ← Back
          </Link>

          <h1
            className={[
              "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
              "tracking-tight text-foreground leading-none",
              "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
            ].join(" ")}
          >
            Filter by Platforms
          </h1>

          {/* keeps title centered */}
          <div className="w-[72px] sm:w-[80px]" />
        </div>

        <p className="mt-3 text-xs sm:text-sm text-text-muted">
          Choose which game platforms you want to see when swiping.
        </p>
      </header>

      <div className="mt-7 h-px w-full bg-border/40" />

      <div className="mt-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-border bg-background/40 shadow-[0_18px_45px_rgba(0,0,0,0.35)] p-6 sm:p-8">
          <PlatformPreferencesForm initialSelected={preferred} />
        </div>
      </div>
    </div>
  );
}
