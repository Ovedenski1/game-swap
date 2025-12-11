// contexts/auth-context.tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { UserProfile } from "@/types/user";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // create the Supabase client only once
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    async function loadProfile(userId: string) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
        setUser(null);
        return;
      }

      setUser(data as UserProfile);
    }

    async function init() {
      try {
        // 1) initial user
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          console.error("auth.getUser error:", error);
          setUser(null);
        } else if (data.user) {
          await loadProfile(data.user.id);
        } else {
          setUser(null);
        }

        // 2) listen for login / logout
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("onAuthStateChange:", event, session?.user?.id);

          if (!session?.user) {
            setUser(null);
            return;
          }

          await loadProfile(session.user.id);
        });

        unsub = () => subscription.unsubscribe();
      } catch (err) {
        console.error("Auth init error:", err);
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [supabase]);

  async function signOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
