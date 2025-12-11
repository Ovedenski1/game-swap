// app/chat/page.tsx
"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { getUserChats } from "@/lib/actions/matches";
import { useAuth } from "@/contexts/auth-context";
import type { UserProfile } from "../profile/page";

interface ChatData {
  id: string; // match id
  user: UserProfile;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const REFRESH_INTERVAL_MS = 4000;

/* ---------- Shared shell ---------- */
function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col bg-background text-white">
      <main className="flex-1 flex">
        <div className="flex-1 max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 flex">
          <div className="flex-1 bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-b-3xl flex flex-col">
            <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
              {children}
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

export default function ChatPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [chats, setChats] = useState<ChatData[]>([]);
  const [loading, setLoading] = useState(true);

  // redirect if not logged in
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace("/auth");
    }
  }, [authLoading, authUser, router]);

  // 🔁 poll the server for chats (last message + unread) every few seconds
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
          // 👇 this must come from your updated getUserChats()
          unreadCount: item.unreadCount ?? 0,
        }));

        setChats(chatData);
      } catch (error) {
        console.error("loadChats error:", error);
        if (!cancelled) setChats([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          // schedule next refresh
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
    const diffInHours =
      (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  }

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6FF00] mx-auto" />
            <p className="mt-4 text-white/70">Loading your conversations...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!authUser) return null;

  return (
    <PageShell>
      <div className="flex flex-col flex-1">
        <header className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Messages
          </h1>
          <p className="text-white/60 mt-1">
            {chats.length} conversation{chats.length !== 1 ? "s" : ""}
          </p>
        </header>

        {chats.length === 0 ? (
          <div className="text-center max-w-md mx-auto p-8 bg-surface-soft rounded-2xl border border-border shadow-[0_18px_45px_rgba(0,0,0,0.8)]">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
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
              className="inline-flex items-center justify-center rounded-full bg-[#C6FF00] text-black text-sm font-semibold px-5 py-2.5 hover:bg-lime-300 transition-colors"
            >
              Start Swiping
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto flex-1 w-full">
            <div className="bg-surface-soft rounded-2xl border border-border shadow-[0_18px_45px_rgba(0,0,0,0.8)] overflow-hidden">
              {chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className={`block transition-colors duration-200 ${
                    chat.unreadCount > 0
                      ? "bg-[#2b1120] hover:bg-[#3b162b]"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center p-5 border-b border-border last:border-b-0">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border border-white/15">
                      <img
                        src={chat.user.avatar_url || "/default.jpg"}
                        alt={chat.user.full_name || "User avatar"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 ml-4">
                      <div className="flex items-center justify-between mb-1">
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
    </PageShell>
  );
}
