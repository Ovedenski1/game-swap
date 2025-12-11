// components/MatchNotification.tsx
"use client";

import Image from "next/image";
import type { UserProfile } from "@/app/profile/page";

interface MatchNotificationProps {
  match: UserProfile;
  onClose: () => void;
  onStartChat: () => void;
}

export default function MatchNotification({
  match,
  onClose,
  onStartChat,
}: MatchNotificationProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      {/* dark backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* card */}
      <div
        className="
          relative z-50 pointer-events-auto
          w-[90%] max-w-md
          bg-[#0B1120]
          border border-white/10
          rounded-2xl
          shadow-[0_25px_60px_rgba(0,0,0,0.9)]
          px-6 py-5
          flex flex-col
          gap-4
        "
      >
        {/* close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-white/60 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/20">
            <Image
              src={match.avatar_url || "/default-avatar.png"}
              alt={match.full_name}
              fill
              className="object-cover"
            />
          </div>

          <div>
            <h2 className="text-xl font-bold">It&apos;s a Match! 🎉</h2>
            <p className="text-sm text-white/70">
              You and <span className="font-semibold">{match.full_name}</span>{" "}
              liked each other!
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onStartChat}
            className="
              flex-1 inline-flex items-center justify-center
              rounded-full
              bg-pink-500 hover:bg-pink-600
              text-sm font-semibold text-white
              px-4 py-2.5
              transition-colors
            "
          >
            Start Chat
          </button>

          <button
            type="button"
            onClick={onClose}
            className="
              flex-1 inline-flex items-center justify-center
              rounded-full
              bg-white/10 hover:bg-white/15
              text-sm font-semibold text-white
              px-4 py-2.5
              transition-colors
            "
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
