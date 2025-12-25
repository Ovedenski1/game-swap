// components/StreamChatInterface.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { StreamChat, Channel, Event } from "stream-chat";

import { UserProfile } from "@/app/profile/page";
import { createOrGetChannel, getStreamUserToken } from "@/lib/actions/stream";

interface Message {
  id: string;
  text: string;
  sender: "me" | "other";
  timestamp: Date;
  user_id: string;
}

interface StreamChatInterfaceProps {
  otherUser: UserProfile;
  matchId: string;
  onLastMessageUpdate?: (args: {
    matchId: string;
    content: string;
    createdAt: string;
  }) => void;
}

export default function StreamChatInterface({
  otherUser,
  matchId,
  onLastMessageUpdate,
}: StreamChatInterfaceProps) {
  const [error, setError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");

  // 👇 client is created once and is NEVER null → no TS error
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;
  const [client] = useState<StreamChat>(() => StreamChat.getInstance(apiKey));

  const [channel, setChannel] = useState<Channel | null>(null);
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  /* ---------- scrolling helpers ---------- */

  // no smooth animation – just jump to bottom instantly
  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    setShowScrollButton(false);
  }

  function handleScroll() {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  /* ---------- 1) Connect user to Stream ONCE ---------- */

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        setError(null);
        const { token, userId, userName, userImage } =
          await getStreamUserToken();

        if (cancelled) return;

        if (!token || !userId) {
          throw new Error("Missing Stream user token or ID");
        }

        setCurrentUserId(userId);

        if (!client.userID) {
          await client.connectUser(
            { id: userId, name: userName, image: userImage },
            token
          );
        }
      } catch (err) {
        console.error("Stream connect error:", err);
        if (!cancelled) {
          setError("Failed to start chat. Please try again.");
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      // do NOT disconnect the user here – keeps client warm between chats
    };
  }, [client]);

  /* ---------- 2) Load / switch channel when otherUser changes ---------- */

  useEffect(() => {
    if (!otherUser || !currentUserId) return;

    let cancelled = false;

    async function loadChannel() {
      try {
        setError(null);

        const { channelType, channelId } = await createOrGetChannel(otherUser.id);
        if (cancelled) return;

        const chatChannel = client.channel(channelType!, channelId);
        const watchState = await chatChannel.watch();
        if (cancelled) return;

        setChannel(chatChannel);

        // initial messages
        const mapMsg = (msg: any): Message => ({
          id: msg.id,
          text: msg.text || "",
          sender: msg.user?.id === currentUserId ? "me" : "other",
          timestamp: new Date(msg.created_at || new Date()),
          user_id: msg.user?.id || "",
        });

        const initial = (watchState.messages || []).map(mapMsg);
        setMessages(initial);

        // subscribe to new messages
        const handler = (event: Event) => {
          if (!event.message) return;

          const newMsg = mapMsg(event.message);

          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMsg.id);
            return exists ? prev : [...prev, newMsg];
          });

          // bubble up to sidebar
          if (onLastMessageUpdate && event.message.text) {
            onLastMessageUpdate({
              matchId,
              content: event.message.text,
              createdAt: event.message.created_at || new Date().toISOString(),
            });
          }
        };

        chatChannel.on("message.new", handler);

        return () => {
          chatChannel.off("message.new", handler);
        };
      } catch (err) {
        console.error("loadChannel error:", err);
        if (!cancelled) {
          setError("Failed to load this conversation.");
        }
      }
    }

    const cleanupPromise = loadChannel();

    return () => {
      cancelled = true;
      // remove listeners when switching chats
      cleanupPromise
        .then((cleanup) => typeof cleanup === "function" && cleanup())
        .catch(() => {});
    };
  }, [client, otherUser, currentUserId, matchId, onLastMessageUpdate]);

  /* ---------- 3) Send message (Stream + Supabase log) ---------- */

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !channel || !currentUserId) return;

    const text = newMessage.trim();
    setNewMessage("");

    try {
      const response = await channel.sendMessage({ text });
      const createdAt = response.message.created_at || new Date().toISOString();

      const message: Message = {
        id: response.message.id,
        text,
        sender: "me",
        timestamp: new Date(createdAt),
        user_id: currentUserId,
      };

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === message.id);
        return exists ? prev : [...prev, message];
      });

      // log for last-message in chat list
      try {
        await fetch("/api/chat-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId, content: text }),
        });
      } catch (logErr) {
        console.error("Failed to log chat message:", logErr);
      }

      if (onLastMessageUpdate) {
        onLastMessageUpdate({
          matchId,
          content: text,
          createdAt,
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  }

  function formatTime(date: Date) {
    return date.toLocaleString([], { hour: "2-digit", minute: "2-digit" });
  }

  /* ---------- render ---------- */

  // if user isn’t connected yet, just show a tiny hint (no big loader)
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
        // removed smooth scroll → instant jump
        style={{ scrollBehavior: "auto" }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "me" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={[
                "max-w-xs lg:max-w-md px-4 py-2 rounded-2xl border",
                message.sender === "me"
                  ? "bg-paprika text-white border-white/10"
                  : "bg-surface-soft text-foreground border-border",
              ].join(" ")}
            >
              <p className="text-sm break-words">{message.text}</p>
              <p
                className={[
                  "text-xs mt-1",
                  message.sender === "me" ? "text-white/80" : "text-text-muted",
                ].join(" ")}
              >
                {formatTime(message.timestamp)}
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
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-full border border-border bg-surface-soft text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            disabled={!channel}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !channel}
            className="px-6 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
