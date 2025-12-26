// components/StreamChatInterface.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { StreamChat, type Channel } from "stream-chat";

import type { UserProfile } from "@/components/ProfilePage";
import { createOrGetChannel, getStreamUserToken } from "@/lib/actions/stream";

type ChatMessage = {
  id: string;
  text: string;
  sender: "me" | "other";
  timestamp: Date;
  user_id: string;
};

type StreamUserLike = { id?: string | null } | null | undefined;

type StreamMessageLike = {
  id: string;
  text?: string | null;
  created_at?: string | Date | null;
  user?: StreamUserLike;
};

type WatchStateLike = {
  messages?: StreamMessageLike[] | null;
};

type EventWithMessageLike = {
  message?: StreamMessageLike | null;
};

type StreamChatInterfaceProps = {
  otherUser: UserProfile;
  matchId: string;
  onLastMessageUpdate?: (args: {
    matchId: string;
    content: string;
    createdAt: string;
  }) => void;
};

function toDate(value: string | Date | null | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toIso(value: string | Date | null | undefined): string {
  return toDate(value).toISOString();
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong";
}

export default function StreamChatInterface({
  otherUser,
  matchId,
  onLastMessageUpdate,
}: StreamChatInterfaceProps) {
  const [error, setError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");

  // Stream client instance (created once)
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const [client] = useState<StreamChat>(() => {
    if (!apiKey) {
      // still create, but you’ll see a friendly error below
      return StreamChat.getInstance("missing_key");
    }
    return StreamChat.getInstance(apiKey);
  });

  const [channel, setChannel] = useState<Channel | null>(null);
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    setShowScrollButton(false);
  }

  function handleScroll() {
    const el = messagesContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  /* ---------- 1) Connect user to Stream ONCE ---------- */
  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        setError(null);

        if (!process.env.NEXT_PUBLIC_STREAM_API_KEY) {
          throw new Error("Missing NEXT_PUBLIC_STREAM_API_KEY");
        }

        const { token, userId, userName, userImage } =
          await getStreamUserToken();

        if (cancelled) return;

        if (!token || !userId) {
          throw new Error("Missing Stream user token or userId");
        }

        setCurrentUserId(userId);

        // connect only once
        if (!client.userID) {
          await client.connectUser(
            { id: userId, name: userName, image: userImage },
            token
          );
        }
      } catch (err: unknown) {
        console.error("Stream connect error:", err);
        if (!cancelled) setError(getErrorMessage(err));
      }
    }

    connect();

    return () => {
      cancelled = true;
      // keep client connected between chats
    };
  }, [client]);

  /* ---------- 2) Load / switch channel ---------- */
  useEffect(() => {
    if (!otherUser?.id || !currentUserId) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    function mapMsg(msg: StreamMessageLike): ChatMessage {
      const userId = msg.user?.id ?? "";
      const created = toDate(msg.created_at);
      return {
        id: msg.id,
        text: msg.text ?? "",
        sender: userId === currentUserId ? "me" : "other",
        timestamp: created,
        user_id: userId,
      };
    }

    async function load() {
      try {
        setError(null);

        const { channelType, channelId } = await createOrGetChannel(otherUser.id);
        if (cancelled) return;

        if (!channelType || !channelId) {
          throw new Error("Missing channelType/channelId from createOrGetChannel()");
        }

        const ch = client.channel(channelType, channelId);
        const watchStateUnknown = await ch.watch();

        if (cancelled) return;

        setChannel(ch);

        const watchState = watchStateUnknown as unknown as WatchStateLike;
        const initial = (watchState.messages ?? []).map(mapMsg);
        setMessages(initial);

        const handler = (eventUnknown: unknown) => {
          const event = eventUnknown as EventWithMessageLike;
          const msg = event.message ?? null;
          if (!msg) return;

          const next = mapMsg(msg);

          setMessages((prev) => {
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });

          if (onLastMessageUpdate && (msg.text ?? "").trim()) {
            onLastMessageUpdate({
              matchId,
              content: msg.text ?? "",
              createdAt: toIso(msg.created_at),
            });
          }
        };

        // stream-chat typings differ across versions; string event name is stable
        ch.on("message.new", handler as unknown as (e: unknown) => void);

        unsubscribe = () => {
          ch.off("message.new", handler as unknown as (e: unknown) => void);
        };
      } catch (err: unknown) {
        console.error("loadChannel error:", err);
        if (!cancelled) setError(getErrorMessage(err));
      }
    }

    load();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [client, otherUser, currentUserId, matchId, onLastMessageUpdate]);

  /* ---------- 3) Send message ---------- */
  async function handleSendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newMessage.trim() || !channel || !currentUserId) return;

    const text = newMessage.trim();
    setNewMessage("");

    try {
      const resUnknown = await channel.sendMessage({ text });

      // Keep this minimal & safe across versions
      const res = resUnknown as unknown as {
        message?: {
          id: string;
          text?: string | null;
          created_at?: string | Date | null;
        };
      };

      const createdAtIso = toIso(res.message?.created_at);

      const local: ChatMessage = {
        id: res.message?.id ?? `${Date.now()}`,
        text,
        sender: "me",
        timestamp: new Date(createdAtIso),
        user_id: currentUserId,
      };

      setMessages((prev) => {
        if (prev.some((m) => m.id === local.id)) return prev;
        return [...prev, local];
      });

      // optional log endpoint
      try {
        await fetch("/api/chat-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId, content: text }),
        });
      } catch (logErr: unknown) {
        console.error("Failed to log chat message:", logErr);
      }

      if (onLastMessageUpdate) {
        onLastMessageUpdate({
          matchId,
          content: text,
          createdAt: createdAtIso,
        });
      }
    } catch (err: unknown) {
      console.error("Error sending message:", err);
      setError(getErrorMessage(err));
    }
  }

  function formatTime(date: Date) {
    return date.toLocaleString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (!currentUserId || !channel) {
    return (
      <div className="h-full flex items-center justify-center bg-background text-xs text-text-muted">
        Initializing chat…
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col bg-background">
      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 chat-scrollbar"
        style={{ scrollBehavior: "auto" }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={[
                "max-w-xs lg:max-w-md px-4 py-2 rounded-2xl border",
                m.sender === "me"
                  ? "bg-paprika text-white border-white/10"
                  : "bg-surface-soft text-foreground border-border",
              ].join(" ")}
            >
              <p className="text-sm break-words">{m.text}</p>
              <p
                className={[
                  "text-xs mt-1",
                  m.sender === "me" ? "text-white/80" : "text-text-muted",
                ].join(" ")}
              >
                {formatTime(m.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <div className="absolute bottom-20 right-6 z-10">
          <button
            onClick={scrollToBottom}
            className="bg-primary hover:opacity-90 text-primary-foreground p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            title="Scroll to bottom"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-surface/40 backdrop-blur p-4">
        <form className="flex space-x-2" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setNewMessage(e.target.value)
            }
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-full border border-border bg-surface-soft text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            disabled={!channel}

          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !channel}
            className="px-6 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14m-7-7l7 7-7 7"
              />
            </svg>
          </button>
        </form>

        {error && (
          <p className="mt-2 text-xs text-red-400">
            {error} (chat will still try to reconnect automatically)
          </p>
        )}
      </div>
    </div>
  );
}
