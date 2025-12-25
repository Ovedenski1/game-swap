// app/chat/[userId]/page.tsx
"use client";

import { useEffect, useState } from "react";

import { getUserChats } from "@/lib/actions/matches";
import type { UserProfile } from "@/components/ProfilePage";
import ChatHeader from "@/components/ChatHeader";
import StreamChatInterface from "@/components/StreamChatInterface";
import { useAuth } from "@/contexts/auth-context";

interface ChatData {
  id: string; // match id
  user: UserProfile;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

type RawChatSummary = {
  matchId: string;
  otherUser: UserProfile;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  unreadCount?: number | null;
};

export default function ChatConversationPage({
  params,
}: {
  params: { userId: string };
}) {
  const matchIdFromUrl = params.userId;

  const { user: authUser } = useAuth();

  const [chats, setChats] = useState<ChatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatData | null>(null);

  function normalizeChats(raw: RawChatSummary[]): ChatData[] {
    const chatData: ChatData[] = raw.map((item) => ({
      id: item.matchId,
      user: item.otherUser,
      lastMessage: item.lastMessage ?? "Start your conversation!",
      lastMessageTime: item.lastMessageTime ?? new Date().toISOString(),
      unreadCount: item.unreadCount ?? 0,
    }));

    chatData.sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    return chatData;
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (Number.isNaN(diffInHours)) return "";
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  }

  useEffect(() => {
    let cancelled = false;

    async function loadChats() {
      try {
        const chatSummaries = (await getUserChats()) as RawChatSummary[];
        if (cancelled) return;

        const normalized = normalizeChats(Array.isArray(chatSummaries) ? chatSummaries : []);
        setChats(normalized);

        const found =
          normalized.find((c) => c.id === matchIdFromUrl) || normalized[0] || null;

        setSelectedChat(found);
      } catch (err: unknown) {
        console.error(err);
        if (!cancelled) setChats([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadChats();

    return () => {
      cancelled = true;
    };
  }, [matchIdFromUrl]);

  useEffect(() => {
    if (!authUser) return;

    let cancelled = false;

    async function refreshChats() {
      try {
        const chatSummaries = (await getUserChats()) as RawChatSummary[];
        if (cancelled) return;

        const normalized = normalizeChats(Array.isArray(chatSummaries) ? chatSummaries : []);
        setChats(normalized);

        // keep selected chat in sync WITHOUT depending on `selectedChat`
        setSelectedChat((prev) => {
          if (!prev) return prev;
          return normalized.find((c) => c.id === prev.id) ?? prev;
        });
      } catch (err: unknown) {
        console.error("Failed to refresh chats:", err);
      }
    }

    const id = window.setInterval(refreshChats, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [authUser]);

  function handleLastMessageUpdate({
    matchId,
    content,
    createdAt,
  }: {
    matchId: string;
    content: string;
    createdAt: string;
  }) {
    setChats((prev) => {
      if (prev.length === 0) return prev;

      const updated = prev.map((chat) =>
        chat.id === matchId
          ? { ...chat, lastMessage: content, lastMessageTime: createdAt }
          : chat
      );

      updated.sort(
        (a, b) =>
          new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      return updated;
    });

    setSelectedChat((prev) =>
      prev && prev.id === matchId
        ? { ...prev, lastMessage: content, lastMessageTime: createdAt }
        : prev
    );
  }

  useEffect(() => {
    if (!selectedChat) return;

    const matchId = selectedChat.id;

    async function markRead() {
      try {
        await fetch("/api/chat/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId }),
        });
      } catch (err: unknown) {
        console.error("Failed to mark chat as read:", err);
      }
    }

    markRead();

    setChats((prev) => prev.map((c) => (c.id === matchId ? { ...c, unreadCount: 0 } : c)));
  }, [selectedChat]);

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
      <div className="rounded-2xl border border-border bg-surface/40 shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex w-full min-h-[70vh] min-h-0 rounded-none md:rounded-2xl bg-background shadow-lg overflow-hidden">
            <aside className="hidden md:flex w-80 border-r border-border bg-surface-elevated flex-col">
              <div className="px-4 py-3 border-b border-gray-800">
                <h1 className="text-lg font-semibold text-white">Messages</h1>
                <p className="text-xs text-gray-400">
                  {chats.length} conversation{chats.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto chat-scrollbar">
                {!loading && chats.length === 0 && (
                  <div className="p-4 text-sm text-gray-400">
                    No conversations yet. Start matching to chat!
                  </div>
                )}

                {!loading &&
                  chats.map((chat) => {
                    const isActive = selectedChat?.id === chat.id;
                    const isUnread = chat.unreadCount > 0;

                    return (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => {
                          setSelectedChat({ ...chat, unreadCount: 0 });
                          setChats((prev) =>
                            prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
                          );
                        }}
                        className={`w-full flex items-center px-4 py-3 text-left border-b border-gray-800/60 transition ${
                          isUnread
                            ? "bg-[#2b1120] hover:bg-[#3b162b]"
                            : isActive
                              ? "bg-gray-800/60 hover:bg-gray-800/80"
                              : "hover:bg-gray-800/40"
                        }`}
                      >
                        <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={chat.user.avatar_url || "/default.jpg"}
                            alt={chat.user.full_name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="ml-3 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white truncate">
                              {chat.user.full_name}
                            </span>
                            <span className="ml-2 text-[11px] text-gray-400 flex-shrink-0">
                              {formatTime(chat.lastMessageTime)}
                            </span>
                          </div>

                          <p
                            className={`text-xs truncate ${
                              isUnread ? "text-pink-200 font-semibold" : "text-gray-400"
                            }`}
                          >
                            {isUnread ? "New message" : chat.lastMessage}
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </aside>

            <section className="flex-1 flex flex-col min-h-0 bg-background">
              {!selectedChat ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                  {loading ? " " : "Select a conversation from the list on the left."}
                </div>
              ) : (
                <>
                  <div className="sticky top-0 z-10 bg-background">
                    <ChatHeader user={selectedChat.user} />
                  </div>

                  <div className="flex-1 min-h-0">
                    <StreamChatInterface
                      otherUser={selectedChat.user}
                      matchId={selectedChat.id}
                      onLastMessageUpdate={handleLastMessageUpdate}
                    />
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
