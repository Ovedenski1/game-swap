// app/admin/upcoming/page.tsx
import { createClient } from "@/lib/supabase/server";
import UpcomingGamesAdminEditor from "@/components/UpcomingGamesAdminEditor";

export default async function AdminUpcomingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-black/30 px-6 py-4">
          You must be logged in to view this page.
        </div>
      </div>
    );
  }

  return <UpcomingGamesAdminEditor />;
}
