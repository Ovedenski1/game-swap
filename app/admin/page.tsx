// app/admin/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import AdminDashboard from "@/components/AdminDashboard";
import {
  adminGetTopStories,
  adminGetRatings,
  adminGetHeroSlides,
} from "@/lib/actions/admin-content";

export default async function AdminPage() {
  const supabase = await createClient();

  // 1) Check user session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) console.error("[/admin] auth.getUser error:", userError);
  if (!user) redirect("/");

  // 2) Verify admin
  const { data: dbUser, error: dbUserError } = await supabase
    .from("users")
    .select("id, is_admin")
    .eq("id", user.id)
    .single();

  if (dbUserError) console.error("[/admin] users query error:", dbUserError);
  const isAdmin = dbUser?.is_admin || user.user_metadata?.is_admin;
  if (!isAdmin) redirect("/");

  // 3) Load dashboard data
  const [stories, ratings, heroSlides] = await Promise.all([
    adminGetTopStories(),
    adminGetRatings(),
    adminGetHeroSlides(),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-white">
      <main className="flex-1 flex flex-col">
        <div className="max-w-[1200px] mx-auto px-4 py-8 flex-1 flex flex-col">
          

          <AdminDashboard
            initialStories={stories}
            initialRatings={ratings}
            initialHeroSlides={heroSlides}
          />
        </div>
      </main>

      {/* Unified footer (matches profile layout) */}
     
    </div>
  );
}
