import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userCount = 0;
  let adminCount = 0;

  if (user) {
    const { count, error } = await supabase
      .from("notifications_user")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      // 🚫 exclude "Rental request created" messages
      .neq("title", "Rental request created");

    if (error) console.error("userCount error", error);
    userCount = count ?? 0;
  }

  const { count: admin, error: adminError } = await supabase
    .from("notifications_admin")
    .select("*", { count: "exact", head: true })
    .eq("seen", false);

  if (adminError) console.error("adminCount error", adminError);
  adminCount = admin ?? 0;

  return NextResponse.json({ userCount, adminCount });
}
