"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  LogIn,
  BookCopy,
  MessageCircle,
  LayoutDashboard,
  Gamepad2,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

const SIGNIN_PATH = "/auth";

export default function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const supabase = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  ).current;

  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userUnread, setUserUnread] = useState<boolean>(false);
  const [adminUnread, setAdminUnread] = useState<number>(0);

  const isAdmin =
    (user as any)?.is_admin === true ||
    (user as any)?.user_metadata?.is_admin === true ||
    (user as any)?.profile?.is_admin === true;

  useEffect(() => setMounted(true), []);

  // 🔁 Poll notification counts periodically
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setUserUnread(false);
      setAdminUnread(0);
      return;
    }

    async function fetchCounts() {
      try {
        const res = await fetch("/api/notification-count");
        if (!res.ok) return;
        const data = await res.json();

        setUserUnread(data.userCount > 0);
        setAdminUnread(data.adminCount ?? 0);
      } catch (err) {
        console.error("❌ Failed to fetch counts:", err);
      }
    }

    fetchCounts();
    const id = setInterval(fetchCounts, 8000);
    return () => clearInterval(id);
  }, [user]);

  // 🔹 Always clear user badge when opening My Rentals
  useEffect(() => {
    if (pathname === "/profile/my-rentals") {
      markUserNotificationsRead();
    }
  }, [pathname]);

  async function markUserNotificationsRead() {
  if (!user) return;
  try {
    await supabase
      .from("notifications_user")
      .update({ read: true })
      .eq("user_id", user.id);
    setUserUnread(false);
  } catch (err) {
    console.error("❌ Failed to mark notifications read:", err);
  }
}


  // 🔹 Clear admin badge when visiting admin rentals
  useEffect(() => {
    if (pathname === "/admin/rentals" && adminUnread > 0) {
      setAdminUnread(0);
    }
  }, [pathname, adminUnread]);

  if (!mounted)
    return <nav className="h-[60px] w-full bg-navbar border-b border-border" />;

  return (
    <nav className="bg-navbar text-white border-b border-border flex items-center justify-between px-5 sm:px-10 py-3 sticky top-0 z-50 shadow-md transition-all duration-300">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="Checkpoint Logo"
          width={140}
          height={40}
          priority
        />
      </Link>

      <div className="flex items-center gap-3">
        {!loading && !user && (
          <Link
            href={SIGNIN_PATH}
            className="p-2 hover:bg-[#C6FF00]/20 rounded-full text-[#C6FF00] transition"
          >
            <LogIn size={22} />
          </Link>
        )}

        {!loading && user && (
          <>
            {isAdmin && (
              <Link
                href="/admin"
                className="relative hidden sm:inline-flex items-center gap-1 rounded-full border border-lime-400/70 bg-black/40 px-3 py-1.5 text-xs font-semibold text-lime-300 hover:bg-lime-400/10 transition"
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>

                {/* 🔴 Admin badge number */}
                {adminUnread > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[11px] font-bold flex items-center justify-center transition-all duration-300">
                    {adminUnread}
                  </span>
                )}
              </Link>
            )}

            <Link
              href="/matches"
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <BookCopy className="transform rotate-180" size={22} />
            </Link>

            {/* 🎮 My Rentals — user red dot */}
            <Link
              href="/profile/my-rentals"
              className="relative p-2 hover:bg-white/10 rounded-full transition"
            >
              <Gamepad2 size={22} />
              {userUnread && !isAdmin && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500" />
              )}
            </Link>

            {/* 💬 Messages */}
            <Link
              href="/chat"
              className="relative p-2 hover:bg-white/10 rounded-full transition"
            >
              <MessageCircle size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[11px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => router.push("/profile")}
              className="w-10 h-10 rounded-full border border-white/30 overflow-hidden hover:border-white/60 transition"
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
