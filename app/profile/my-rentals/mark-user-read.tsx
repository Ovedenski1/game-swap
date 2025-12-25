"use client";

import { useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/auth-context";

type NotificationsUserRow = {
  id: string;
  user_id: string;
  read: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getInsertedNotification(payload: unknown): NotificationsUserRow | null {
  if (!isRecord(payload)) return null;

  const n = payload["new"];
  if (!isRecord(n)) return null;

  const id = n["id"];
  const user_id = n["user_id"];

  if (typeof id !== "string" || typeof user_id !== "string") return null;

  return { id, user_id, read: n["read"] === true };
}

export function MarkUserNotificationsRead() {
  const { user } = useAuth() as { user: User | null };

  const supabase = useRef<SupabaseClient>(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  ).current;

  useEffect(() => {
    if (!user) return;

    const userId = user.id; // ✅ capture once, now NON-null
    let cancelled = false;

    async function markAllRead() {
      const { error } = await supabase
        .from("notifications_user")
        .update({ read: true })
        .eq("user_id", userId);

      if (!cancelled && error) {
        console.error("❌ Failed to mark notifications read:", error.message);
      }
    }

    void markAllRead();

    const channel = supabase
      .channel("notifications_user_auto_read")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications_user" },
        async (payload: unknown) => {
          const n = getInsertedNotification(payload);
          if (!n) return;
          if (n.user_id !== userId) return;

          const { error } = await supabase
            .from("notifications_user")
            .update({ read: true })
            .eq("id", n.id);

          if (error) {
            console.error(
              "❌ Failed to auto-mark notification read:",
              error.message,
            );
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  return null;
}
