// app/auth/page.tsx
"use client";

import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextUrl = useMemo(() => {
    const next = searchParams.get("next");
    if (!next) return "/";
    // avoid open redirects: only allow same-site paths
    if (!next.startsWith("/")) return "/";
    return next;
  }, [searchParams]);

  // If already logged in → redirect
  useEffect(() => {
    if (!authLoading && user) {
      router.push(nextUrl);
    }
  }, [authLoading, user, router, nextUrl]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpErr) throw signUpErr;

        if (data.user && !data.session) {
          setError("Моля, провери имейла си за линк за потвърждение.");
          return;
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;
      }

      router.push(nextUrl);
      router.refresh();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: unknown }).message || "")
          : "";
      setError(msg || "Неуспешна автентикация.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] w-full px-3 sm:px-6 lg:px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-white/10 bg-black/35 shadow-[0_20px_70px_rgba(0,0,0,0.45)] overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-7 pb-5 border-b border-white/10 bg-black/25">
            <p className="mt-1 text-sm text-white/65">
              {isSignUp ? "Създай акаунт" : "Влез в профила си"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="px-6 py-6 space-y-5">
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wide text-white/60"
              >
                Имейл
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Въведи имейл"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white/90 placeholder:text-white/30 outline-none focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/20"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wide text-white/60"
              >
                Парола
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Въведи парола"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white/90 placeholder:text-white/30 outline-none focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/20"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-full bg-news px-4 py-2.5 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "Моля, изчакай..." : isSignUp ? "Регистрация" : "Вход"}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp((v) => !v)}
                className="text-sm text-white/70 hover:text-white"
              >
                {isSignUp ? "Имаш акаунт? Влез" : "Нямаш акаунт? Регистрирай се"}
              </button>
            </div>

            <p className="text-center text-[11px] text-white/35">
              С натискане на бутона се съгласяваш с условията за ползване.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
