"use client";

import { useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useAuth } from "@/contexts/auth-context";

export function MarkUserNotificationsRead() {
  const { user } = useAuth();
  const supabase = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  ).current;

  useEffect(() => {
    if (!user) return;

    // 👇 1️⃣ Mark all existing unread notifications as read when page opens
    supabase
      .from("notifications_user")
      .update({ read: true })
      .eq("user_id", user.id);

    // 👇 2️⃣ Subscribe to new notifications in realtime
    const channel = supabase
      .channel("notifications_user_auto_read")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications_user" },
        async (payload) => {
          const n = payload.new as any;
          if (n.user_id === user.id) {
            // ✅ Instantly mark as read if user is currently on My Rentals
            await supabase
              .from("notifications_user")
              .update({ read: true })
              .eq("id", n.id);
          }
        }
      )
      .subscribe();

    // 🧹 Clean up listener when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
