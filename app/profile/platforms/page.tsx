// app/profile/platforms/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/actions/profile";
import PlatformPreferencesForm from "@/components/PlatformPreferencesForm";
import type { GamePlatform } from "@/types/game";

export default async function PlatformPreferencesPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    // not logged in → go to auth
    redirect("/auth");
  }

  const preferred =
    ((profile.preferences?.preferred_platforms ||
      []) as GamePlatform[]) || [];

  return (
    <div className="flex-1 flex flex-col bg-background text-white">
      <main className="flex-1 flex">
        <div className="flex-1 max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 flex">
          {/* outer shell – same as Profile / EditProfile */}
          <div className="flex-1 bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-b-3xl flex flex-col">
            <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
              <div className="max-w-3xl mx-auto w-full">
                {/* Header: back link row + centered title, like EditProfile */}
                <header className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <Link
                      href="/profile"
                      className="text-xs sm:text-sm text-white/70 hover:text-white underline underline-offset-4"
                    >
                      ← Back to Profile
                    </Link>
                  </div>

                  <div className="text-center">
                    <h1 className="text-3xl font-bold mb-2">
                      Filter by Platforms
                    </h1>
                    <p className="text-white/60 text-sm">
                      Choose which game platforms you want to see when swiping.
                    </p>
                  </div>
                </header>

                {/* Inner card – same style as other inner cards */}
                <div className="bg-surface-soft rounded-2xl border border-border shadow-[0_18px_45px_rgba(0,0,0,0.8)] p-6 sm:p-8">
                  <PlatformPreferencesForm initialSelected={preferred} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-navbar border-t border-border text-foreground text-center py-4 text-xs sm:text-sm font-medium">
        © {new Date().getFullYear()} GameLink — Built with ❤️ using Next.js
      </footer>
    </div>
  );
}
