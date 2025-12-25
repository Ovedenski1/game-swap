"use client";

import type { UserProfile } from "@/app/profile/page";
import { calculateAge } from "@/lib/helpers/calculate-age";
import { useRouter } from "next/navigation";
import type { Game } from "@/types/game";

interface SwapInfo {
  myWantedGames?: Game[];
  theirWantedGames?: Game[];
}

interface ChatHeaderProps {
  user: UserProfile;
  swap?: SwapInfo;
}

export default function ChatHeader({ user, swap }: ChatHeaderProps) {
  const router = useRouter();

  return (
    <div className="bg-surface-elevated/70 backdrop-blur border-b border-border px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200"
            aria-label="Back"
            title="Back"
            type="button"
          >
            <svg
              className="w-6 h-6 text-white/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="flex items-center space-x-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatar_url || "/default.jpg"}
                alt={user.full_name || "User"}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-surface-elevated rounded-full" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                {user.full_name}
                {user.birthdate ? `, ${calculateAge(user.birthdate)}` : ""}
              </h2>

              <p className="text-sm text-text-muted truncate">
                @{user.username || "user"}
              </p>

              {swap && (
                <p className="text-xs text-text-muted mt-1">
                  You liked{" "}
                  <span className="font-semibold text-foreground">
                    {swap.theirWantedGames?.length ?? 0}
                  </span>{" "}
                  of their games, and they liked{" "}
                  <span className="font-semibold text-foreground">
                    {swap.myWantedGames?.length ?? 0}
                  </span>{" "}
                  of yours.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right side empty for now – you can put status / menu later if you want */}
        <div />
      </div>
    </div>
  );
}
