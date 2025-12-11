// components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { LogIn, BookCopy, MessageCircle, LayoutDashboard } from "lucide-react";

const SIGNIN_PATH = "/auth";

export default function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Figure out if this user is an admin on the client
  const isAdmin =
    (user as any)?.is_admin === true ||
    (user as any)?.user_metadata?.is_admin === true ||
    (user as any)?.profile?.is_admin === true;

  // 🔔 Initial fetch + polling as backup
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    async function fetchUnread() {
      try {
        const res = await fetch("/api/unread-count");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setUnreadCount(data.count ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch unread count:", err);
      }
    }

    fetchUnread();
    const id = setInterval(fetchUnread, 8000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user]);

  // 🔁 Live updates from chat pages (chat:unread-changed)
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleUnreadEvent(e: Event) {
      const custom = e as CustomEvent<{ totalUnread: number }>;
      if (
        custom.detail &&
        typeof custom.detail.totalUnread === "number"
      ) {
        setUnreadCount(custom.detail.totalUnread);
      }
    }

    window.addEventListener("chat:unread-changed", handleUnreadEvent);

    return () => {
      window.removeEventListener(
        "chat:unread-changed",
        handleUnreadEvent,
      );
    };
  }, []);

  return (
    <nav className="bg-navbar text-foreground border-b border-border text-white flex items-center justify-between px-5 sm:px-10 py-3 shadow-md sticky top-0 z-50">
      {/* Left: Logo */}
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="GameLink Logo"
          width={140}
          height={40}
          priority
          className="object-contain w-[120px] sm:w-[140px] lg:w-[160px]"
        />
      </Link>

      <div className="hidden sm:flex gap-6 text-sm font-medium" />

      <div className="flex items-center gap-3">
        {loading && (
          <div className="w-10 h-10 rounded-full" aria-hidden="true" />
        )}

        {!loading && !user && (
          <Link
            href={SIGNIN_PATH}
            className="p-2 hover:bg-[#C6FF00]/20 rounded-full text-[#C6FF00] transition"
            title="Sign In"
            aria-label="Sign In"
          >
            <LogIn size={22} />
          </Link>
        )}

        {!loading && user && (
          <>
            {/* Admin Dashboard (only for admins) */}
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1 rounded-full border border-lime-400/70 bg-black/40 px-3 py-1.5 text-xs font-semibold text-lime-300 hover:bg-lime-400/10 transition"
                title="Admin Dashboard"
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
            )}

            {/* GameSwap */}
            <Link
              href="/matches"
              className="p-2 hover:bg-white/10 rounded-full transition"
              title="Matches"
            >
              <BookCopy className="transform rotate-180" size={22} />
            </Link>

            {/* Messages with badge */}
            <Link
              href="/chat"
              className="relative p-2 hover:bg-white/10 rounded-full transition"
              title="Messages"
            >
              <MessageCircle size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[11px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* Profile Avatar */}
            <button
              onClick={() => router.push("/profile")}
              className="w-10 h-10 rounded-full border border-white/30 overflow-hidden hover:border-white/60 transition"
              title="Profile"
            >
              <Image
                src={user.avatar_url || "/default.jpg"}
                alt={user.full_name || "Profile avatar"}
                width={40}
                height={40}
                className="object-cover w-full h-full rounded-full"
              />
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
