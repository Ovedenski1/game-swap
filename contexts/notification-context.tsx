"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { CheckCircle } from "lucide-react";

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

    const table = isAdmin ? "notifications_admin" : "notifications_user";

    const channel = supabase
      .channel(`channel_${table}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table },
        (payload) => {
          const n = payload.new as any;

          // 🧩 Single function to render a one-line toast
          const showToast = (msg: string) => {
            toast.custom(
              () => (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#1a1a1a",
                    color: "#fff",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                    whiteSpace: "nowrap",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  <CheckCircle size={18} color="#22c55e" />
                  <span>{msg}</span>
                </div>
              ),
              { duration: 4000 }
            );
          };

          if (isAdmin) {
            showToast(n.message || "New rental request received!");
          } else if (n.user_id === user.id) {
            showToast(n.message || "Rental update!");
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
