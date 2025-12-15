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

  // 1) Who is logged in?
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[/admin] auth.getUser error:", userError);
  }

  // Not logged in at all → home
  if (!user) {
    console.log("[/admin] no user, redirecting to /");
    redirect("/");
  }

  // 2) Load is_admin for that user from public.users
  const {
    data: dbUser,
    error: dbUserError,
  } = await supabase
    .from("users") // ✅ your table with is_admin
    .select("id, is_admin")
    .eq("id", user.id)
    .single();

  if (dbUserError) {
    console.error("[/admin] users query error:", dbUserError);
  } else {
    console.log("[/admin] users row:", dbUser);
  }

  const isAdminFromDb = dbUser?.is_admin === true;

  // Optional backup via auth metadata (not required if you don't use it)
  const isAdminFromMetadata = user.user_metadata?.is_admin === true;

  const isAdmin = isAdminFromDb || isAdminFromMetadata;

  if (!isAdmin) {
    console.log("[/admin] user is NOT admin, redirecting", {
      userId: user.id,
      email: user.email,
      isAdminFromDb,
      metaIsAdmin: user.user_metadata?.is_admin,
    });
    redirect("/");
  }

  // 3) User is admin → load dashboard data
  const [stories, ratings, heroSlides] = await Promise.all([
    adminGetTopStories(),
    adminGetRatings(),
    adminGetHeroSlides(),
  ]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 text-white">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        {/* ✅ Step 3: Rentals inbox link */}
        <a
          href="/admin/rentals"
          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-semibold hover:bg-white/5"
        >
          Rentals
        </a>
      </div>

      <AdminDashboard
        initialStories={stories}
        initialRatings={ratings}
        initialHeroSlides={heroSlides}
      />
    </div>
  );
}
