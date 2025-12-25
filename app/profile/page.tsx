// app/profile/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfilePage from "@/components/ProfilePage";

export default async function ProfileRoute() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) console.error("[/profile] auth error:", error);

  if (!user) {
    redirect("/auth?next=/profile");
  }

  return <ProfilePage />;
}
