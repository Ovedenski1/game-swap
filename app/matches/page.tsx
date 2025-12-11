// app/matches/page.tsx
"use client";

import {
  getPotentialMatches,
  likeUser,
  passUser,
  type PotentialMatch,
} from "@/lib/actions/matches";
import { useEffect, useState, ReactNode } from "react";
import { UserProfile } from "../profile/page";
import { useRouter } from "next/navigation";
import MatchCard from "@/components/MatchCard";
import MatchNotification from "@/components/MatchNotification";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

/* ---------- Page shell with attached footer ---------- */
function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col bg-background text-white">
      <main className="flex-1 flex">
        <div className="flex-1 max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 flex">
          <div className="flex-1 bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-b-3xl flex flex-col">
            <div className="p-4 sm:p-6 lg:px-8 lg:py-8 flex-1 flex flex-col">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MatchesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatchNotification, setShowMatchNotification] = useState(false);
  const [matchedUser, setMatchedUser] = useState<UserProfile | null>(null);

  /* ---------- Auth guard + load candidates ---------- */
  useEffect(() => {
    // still figuring out if user is logged in → do nothing yet
    if (authLoading) return;

    // not logged in → go to /auth and do NOT fetch matches
    if (!user) {
      router.replace("/auth");
      return;
    }

    // logged in → fetch matches
    async function loadUsers() {
      try {
        const data = await getPotentialMatches();
        setPotentialMatches(data);
      } catch (error) {
        console.error("Failed to load potential matches:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [authLoading, user, router]);

  /* ---------- Like ---------- */
  async function handleLike() {
    if (currentIndex < potentialMatches.length) {
      const liked = potentialMatches[currentIndex];

      try {
        const result = await likeUser(liked.user.id);

        if (result?.isMatch && result.matchedUser) {
          setMatchedUser(result.matchedUser as UserProfile);
          setShowMatchNotification(true);
        }
      } catch (err) {
        console.error("likeUser failed:", err);
      } finally {
        setCurrentIndex((prev) => prev + 1);
      }
    }
  }

  /* ---------- Pass ---------- */
  async function handlePass() {
    if (currentIndex < potentialMatches.length) {
      const passed = potentialMatches[currentIndex];
      try {
        await passUser(passed.user.id);
      } catch (err) {
        console.error("passUser failed:", err);
      } finally {
        setCurrentIndex((prev) => prev + 1);
      }
    }
  }

  function handleCloseMatchNotification() {
    setShowMatchNotification(false);
  }

  function handleStartChat() {
    if (!matchedUser) {
      setShowMatchNotification(false);
      router.push("/chat");
      return;
    }

    setShowMatchNotification(false);
    router.push(`/chat/${matchedUser.id}`);
  }

  /* ---------- While auth is loading ---------- */
  if (authLoading) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6FF00] mx-auto" />
            <p className="mt-4 text-white/70">Checking your session…</p>
          </div>
        </div>
      </PageShell>
    );
  }

  /* ---------- Loading matches ---------- */
  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6FF00] mx-auto" />
            <p className="mt-4 text-white/70">Finding your matches…</p>
          </div>
        </div>
      </PageShell>
    );
  }

  /* ---------- No more profiles ---------- */
  if (currentIndex >= potentialMatches.length) {
    return (
      <PageShell>
        <div className="flex flex-col flex-1">
          <header className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition"
              title="Back"
              aria-label="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Swap Games
              </h1>
            </div>
            <span className="w-9" />
          </header>

          <div className="flex-1 flex flex-col items-center justify-center">
            <h2 className="mt-2 text-2xl font-semibold">
              No more profiles to show
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Try again later or adjust your platform filters in your profile.
            </p>
          </div>

          {showMatchNotification && matchedUser && (
            <MatchNotification
              match={matchedUser}
              onClose={handleCloseMatchNotification}
              onStartChat={handleStartChat}
            />
          )}
        </div>
      </PageShell>
    );
  }

  /* ---------- Current card ---------- */
  const currentPotentialMatch = potentialMatches[currentIndex];

  return (
    <PageShell>
      <div className="flex flex-col flex-1">
        <header className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition"
            title="Back"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex-1 text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Swap Games
            </h1>
            <p className="mt-1 text-sm text-white/60">
              {currentIndex + 1} of {potentialMatches.length} profiles
            </p>
          </div>

          <span className="w-9" />
        </header>

        <div className="flex-1 flex items-start justify-center mt-2 sm:mt-4">
          <MatchCard
            user={currentPotentialMatch.user}
            games={currentPotentialMatch.games}
            onLike={handleLike}
            onPass={handlePass}
          />
        </div>

        {showMatchNotification && matchedUser && (
          <MatchNotification
            match={matchedUser}
            onClose={handleCloseMatchNotification}
            onStartChat={handleStartChat}
          />
        )}
      </div>
    </PageShell>
  );
}
