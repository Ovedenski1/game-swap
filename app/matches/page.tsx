// app/matches/page.tsx
"use client";

import {
  getPotentialMatches,
  likeUser,
  passUser,
  type PotentialMatch,
} from "@/lib/actions/matches";
import { useEffect, useState } from "react";
import { UserProfile } from "../profile/page";
import { useRouter } from "next/navigation";
import MatchCard from "@/components/MatchCard";
import MatchNotification from "@/components/MatchNotification";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

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
    if (authLoading) return;

    if (!user) {
      router.replace("/auth");
      return;
    }

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

  const isBusy = authLoading || loading;

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
      {/* Header (client style) */}
      <header className="text-center">
        <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center rounded-md border border-white/15 bg-black/20 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-white/90 hover:bg-black/30 transition"
            title="Back"
            aria-label="Back"
            type="button"
          >
            <ChevronLeft size={18} />
            Back
          </button>

          <div className="min-w-0">
            <h1
              className={[
                "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
                "tracking-tight text-foreground leading-none",
                "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
              ].join(" ")}
            >
              Swap Games
            </h1>

            {!isBusy && potentialMatches.length > 0 && currentIndex < potentialMatches.length && (
              <p className="mt-3 text-xs sm:text-sm text-text-muted">
                {currentIndex + 1} of {potentialMatches.length} profiles
              </p>
            )}

            {isBusy && (
              <p className="mt-3 text-xs sm:text-sm text-text-muted">
                {authLoading ? "Checking your session…" : "Finding your matches…"}
              </p>
            )}
          </div>

          {/* keep title centered */}
          <div className="w-[72px] sm:w-[80px]" />
        </div>
      </header>

      <div className="mt-7 h-px w-full bg-border/40" />

      {/* Body */}
      {authLoading ? (
        <div className="mt-10 grid place-items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6FF00] mx-auto" />
            <p className="mt-4 text-sm text-text-muted">Checking your session…</p>
          </div>
        </div>
      ) : loading ? (
        <div className="mt-10 grid place-items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6FF00] mx-auto" />
            <p className="mt-4 text-sm text-text-muted">Finding your matches…</p>
          </div>
        </div>
      ) : currentIndex >= potentialMatches.length ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface/40 shadow-[0_18px_45px_rgba(0,0,0,0.35)] p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold">
            No more profiles to show
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            Try again later or adjust your platform filters in your profile.
          </p>

          {showMatchNotification && matchedUser && (
            <MatchNotification
              match={matchedUser}
              onClose={handleCloseMatchNotification}
              onStartChat={handleStartChat}
            />
          )}
        </div>
      ) : (
        <div className="mt-6 flex items-start justify-center">
          <MatchCard
            user={potentialMatches[currentIndex].user}
            games={potentialMatches[currentIndex].games}
            onLike={handleLike}
            onPass={handlePass}
          />

          {showMatchNotification && matchedUser && (
            <MatchNotification
              match={matchedUser}
              onClose={handleCloseMatchNotification}
              onStartChat={handleStartChat}
            />
          )}
        </div>
      )}
    </div>
  );
}
