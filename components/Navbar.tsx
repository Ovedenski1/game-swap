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
  Newspaper,
  Star,
  BarChart3,
  Menu,
  X,
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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  ).current;

  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userUnread, setUserUnread] = useState<boolean>(false);
  const [adminUnread, setAdminUnread] = useState<number>(0);

  // ✅ mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin =
    (user as any)?.is_admin === true ||
    (user as any)?.user_metadata?.is_admin === true ||
    (user as any)?.profile?.is_admin === true;

  useEffect(() => setMounted(true), []);

  // close menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
        setUnreadCount(data.unreadCount ?? data.chatCount ?? 0); // keep compatible if your API changes
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const IconBtn = ({
    href,
    title,
    children,
    badge,
  }: {
    href: string;
    title: string;
    children: React.ReactNode;
    badge?: React.ReactNode;
  }) => (
    <Link
      href={href}
      title={title}
      className="relative p-2 hover:bg-news rounded-full transition"
    >
      {children}
      {badge}
    </Link>
  );

  const MobileRowLink = ({
    href,
    label,
    icon,
    right,
  }: {
    href: string;
    label: string;
    icon: React.ReactNode;
    right?: React.ReactNode;
  }) => (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 hover:bg-white/[0.05] transition"
    >
      <span className="flex items-center gap-2.5">
        <span className="text-white/85">{icon}</span>
        <span className="text-sm font-semibold text-white/90">{label}</span>
      </span>
      {right ? right : <span className="text-white/40">→</span>}
    </Link>
  );

  return (
    <nav className="bg-navbar text-white border-b border-border sticky top-0 z-50 shadow-md transition-all duration-300">
      <div className="flex items-center justify-between px-4 sm:px-10 py-3">
      {/* ✅ LOGO */}
<Link href="/" className="relative flex items-center gap-2 group">
  {/* 🐶 Mascot (hover swap) */}
  <span className="relative w-[44px] h-[44px]">
    {/* default */}
    <Image
      src="/dogo.png"
      alt="Pokko mascot"
      fill
      priority
      className="
        select-none object-contain
        transition-all duration-200 ease-out
        opacity-100 scale-100
        group-hover:opacity-0 group-hover:scale-95
      "
    />
    {/* hover */}
    <Image
      src="/dogo2.png"
      alt="Pokko mascot (open mouth)"
      fill
      className="
        select-none object-contain
        transition-all duration-200 ease-out
        opacity-0 scale-100
        group-hover:opacity-100 group-hover:scale-100
      "
    />
  </span>

  {/* 📝 Text logo */}
  <span className="relative text-2xl sm:text-3xl font-extrabold tracking-tight leading-none flex items-baseline">
    <span className="text-white">Пo</span>
    <span className="text-[#F05A28] mx-[1px]">ッ</span>

    {/* 👇 Anime flip K */}
    <span
      className="
        inline-block
        text-white
        transition-transform
        duration-500
        ease-out
        origin-center
        group-hover:rotate-y-180
        group-hover:scale-110
      "
      style={{ transformStyle: "preserve-3d" }}
    >
      K
    </span>

    <span className="text-white">o</span>
  </span>
</Link>

        {/* ✅ RIGHT SIDE */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* ✅ DESKTOP ICONS */}
          <div className="hidden sm:flex items-center gap-2">
            <IconBtn href="/news" title="News">
              <Newspaper size={22} />
            </IconBtn>

            <IconBtn href="/ratings" title="Ratings">
              <Star size={22} />
            </IconBtn>

            <IconBtn href="/polls" title="Polls">
              <BarChart3 size={22} />
            </IconBtn>

            {!loading && !user && (
              <Link
                href={SIGNIN_PATH}
                className="p-2 hover:bg-[#C6FF00]/20 rounded-full text-[#C6FF00] transition"
                title="Sign in"
              >
                <LogIn size={22} />
              </Link>
            )}

            {!loading && user && (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="relative hidden md:inline-flex items-center gap-1 rounded-full border border-news bg-news px-3 py-1.5 text-xs font-semibold text-white hover:bg-background transition"
                  >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>

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
                  title="Matches"
                >
                  <BookCopy className="transform rotate-180" size={22} />
                </Link>

                <Link
                  href="/profile/my-rentals"
                  className="relative p-2 hover:bg-white/10 rounded-full transition"
                  title="My rentals"
                >
                  <Gamepad2 size={22} />
                  {userUnread && !isAdmin && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500" />
                  )}
                </Link>

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

                <button
                  onClick={() => router.push("/profile")}
                  className="w-10 h-10 rounded-full border border-white/30 overflow-hidden hover:border-white/60 transition"
                  title="Profile"
                >
                  <Image
                    src={(user as any).avatar_url || "/default.jpg"}
                    alt={(user as any).full_name || "Profile avatar"}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full rounded-full"
                  />
                </button>
              </>
            )}
          </div>

          {/* ✅ MOBILE: sandwich */}
          <button
            className="sm:hidden inline-flex items-center justify-center rounded-full border border-white/15 bg-black/30 w-10 h-10 hover:bg-white/10 transition"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ✅ MOBILE MENU PANEL */}
      {mobileOpen && (
        <div className="sm:hidden px-4 pb-4">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-3 shadow-[0_18px_55px_rgba(0,0,0,0.45)]">
            <div className="grid gap-2">
              <MobileRowLink
                href="/news"
                label="News"
                icon={<Newspaper size={18} />}
              />
              <MobileRowLink
                href="/ratings"
                label="Ratings"
                icon={<Star size={18} />}
              />
              <MobileRowLink
                href="/polls"
                label="Polls"
                icon={<BarChart3 size={18} />}
              />

              <div className="h-px bg-white/10 my-1" />

              {!loading && !user && (
                <MobileRowLink
                  href={SIGNIN_PATH}
                  label="Sign in"
                  icon={<LogIn size={18} />}
                />
              )}

              {!loading && user && (
                <>
                  {isAdmin && (
                    <MobileRowLink
                      href="/admin"
                      label="Dashboard"
                      icon={<LayoutDashboard size={18} />}
                      right={
                        adminUnread > 0 ? (
                          <span className="min-w-[22px] h-[22px] px-2 rounded-full bg-red-500 text-[11px] font-bold flex items-center justify-center">
                            {adminUnread}
                          </span>
                        ) : (
                          <span className="text-white/40">→</span>
                        )
                      }
                    />
                  )}

                  <MobileRowLink
                    href="/matches"
                    label="Matches"
                    icon={<BookCopy className="transform rotate-180" size={18} />}
                  />

                  <MobileRowLink
                    href="/profile/my-rentals"
                    label="My rentals"
                    icon={<Gamepad2 size={18} />}
                    right={
                      userUnread && !isAdmin ? (
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                      ) : (
                        <span className="text-white/40">→</span>
                      )
                    }
                  />

                  <MobileRowLink
                    href="/chat"
                    label="Messages"
                    icon={<MessageCircle size={18} />}
                    right={
                      unreadCount > 0 ? (
                        <span className="min-w-[22px] h-[22px] px-2 rounded-full bg-red-500 text-[11px] font-bold flex items-center justify-center">
                          {unreadCount}
                        </span>
                      ) : (
                        <span className="text-white/40">→</span>
                      )
                    }
                  />

                  <button
                    onClick={() => router.push("/profile")}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 hover:bg-white/[0.05] transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="relative w-7 h-7 rounded-full overflow-hidden border border-white/25">
                        <Image
                          src={(user as any).avatar_url || "/default.jpg"}
                          alt={(user as any).full_name || "Profile avatar"}
                          fill
                          className="object-cover"
                        />
                      </span>
                      <span className="text-sm font-semibold text-white/90">
                        Profile
                      </span>
                    </span>
                    <span className="text-white/40">→</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
