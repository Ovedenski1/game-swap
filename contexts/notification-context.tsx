"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";

export function NotificationListener() {
  const { user } = useAuth();
  const supabase = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  ).current;

  useEffect(() => {
    if (!user) return;

    const isAdmin =
      (user as any)?.is_admin ||
      (user as any)?.user_metadata?.is_admin ||
      (user as any)?.profile?.is_admin;

    // ✅ Subscribe to correct table for role
    const table = isAdmin ? "notifications_admin" : "notifications_user";

    const channel = supabase
      .channel(`channel_${table}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table },
        (payload) => {
          const n = payload.new as any;

          if (isAdmin) {
            toast.success(n.message || "🟢 New rental request received!", {
              duration: 4000,
            });
          } else if (n.user_id === user.id) {
            toast.success(n.message || "🎮 Rental update!", { duration: 4000 });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
