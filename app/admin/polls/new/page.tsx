import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminPollEditor from "@/components/AdminPollEditor";

export default async function AdminPollNewPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect("/");

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, is_admin")
    .eq("id", auth.user.id)
    .single();

  const isAdmin = dbUser?.is_admin || auth.user.user_metadata?.is_admin;
  if (!isAdmin) redirect("/");

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 py-8">
      {/* No extra background wrappers — let ClientLayout own the background */}
      <AdminPollEditor mode="create" />
    </div>
  );
}
