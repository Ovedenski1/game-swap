// app/chat/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { getUserChats } from "@/lib/actions/matches";
import { useAuth } from "@/contexts/auth-context";
import type { UserProfile } from "@/components/ProfilePage";

interface ChatData {
  id: string; // match id
  user: UserProfile;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const REFRESH_INTERVAL_MS = 4000;

export default function ChatPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [chats, setChats] = useState<ChatData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace("/auth");
    }
  }, [authLoading, authUser, router]);

  useEffect(() => {
    if (!authUser) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function loadChats(firstLoad: boolean) {
      try {
        if (firstLoad) setLoading(true);

        const chatSummaries = await getUserChats();
        if (cancelled) return;

        const chatData: ChatData[] = chatSummaries.map((item) => ({
          id: item.matchId,
          user: item.otherUser,
          lastMessage: item.lastMessage ?? "Start your conversation!",
          lastMessageTime: item.lastMessageTime || new Date().toISOString(),
          unreadCount: item.unreadCount ?? 0,
        }));

        setChats(chatData);
      } catch (error) {
        console.error("loadChats error:", error);
        if (!cancelled) setChats([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          timeout = setTimeout(() => loadChats(false), REFRESH_INTERVAL_MS);
        }
      }
    }

    loadChats(true);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [authUser]);

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  }

  /* ---------- Loading ---------- */
  if (authLoading || loading) {
    return (
      <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
        <header className="text-center">
          <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />
          <h1
            className={[
              "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
              "tracking-tight text-foreground leading-none",
              "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
            ].join(" ")}
          >
            Messages
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-text-muted">
            Loading your conversations…
          </p>
        </header>

        <div className="mt-7 h-px w-full bg-border/40" />

        <div className="mt-10 grid place-items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6FF00] mx-auto" />
            <p className="mt-4 text-sm text-text-muted">
              Loading your conversations…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!authUser) return null;

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
      {/* Header (client style) */}
      <header className="text-center">
        <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />

        <h1
          className={[
            "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
            "tracking-tight text-foreground leading-none",
            "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
          ].join(" ")}
        >
          Messages
        </h1>

        <p className="mt-3 text-xs sm:text-sm text-text-muted">
          {chats.length} conversation{chats.length !== 1 ? "s" : ""}
        </p>
      </header>

      <div className="mt-7 h-px w-full bg-border/40" />

      {chats.length === 0 ? (
        <div className="mt-8 grid place-items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface/40 p-8 shadow-[0_18px_45px_rgba(0,0,0,0.35)] text-center">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">💬</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold mb-3">
              No conversations yet
            </h2>

            <p className="text-white/70 mb-6 text-sm">
              Start swiping to find matches and begin conversations!
            </p>

            <Link
              href="/matches"
              className="inline-flex items-center justify-center rounded-md bg-[#C6FF00] text-black text-xs font-extrabold uppercase tracking-wide px-5 py-2 hover:bg-lime-300 transition"
            >
              Start Swiping →
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-border bg-surface/40 shadow-[0_18px_45px_rgba(0,0,0,0.35)] overflow-hidden">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className={[
                  "block transition-colors duration-200",
                  chat.unreadCount > 0
                    ? "bg-[#2b1120] hover:bg-[#3b162b]"
                    : "hover:bg-white/5",
                ].join(" ")}
              >
                <div className="flex items-center p-5 border-b border-border last:border-b-0">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border border-white/15 bg-black/20">
                    <Image
                      src={chat.user.avatar_url || "/default.jpg"}
                      alt={chat.user.full_name || "User avatar"}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>

                  <div className="flex-1 min-w-0 ml-4">
                    <div className="flex items-center justify-between mb-1 gap-3">
                      <h3 className="text-sm font-semibold truncate">
                        {chat.user.full_name}
                      </h3>
                      <span className="text-xs text-white/50 flex-shrink-0">
                        {formatTime(chat.lastMessageTime)}
                      </span>
                    </div>

                    <p className="text-xs text-white/60 truncate">
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
