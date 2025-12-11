// app/api/admin/authors/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  // Use the "users" table
  const { data, error } = await supabase
    .from("users")
    // IMPORTANT: only select columns that actually exist
    .select("id, full_name, avatar_url, is_admin")
    .eq("is_admin", true)
    .order("full_name", { ascending: true });

  // Don't swallow errors – log & return 500 so you can see when it breaks
  if (error) {
    console.error("Load authors error", error);
    return NextResponse.json({ authors: [] }, { status: 500 });
  }

  const authors = (data ?? []).map((row: any) => ({
    id: row.id as string,
    name: (row.full_name as string) ?? "",
    // you don't have a 'role' column, so just expose null for now
    role: null as string | null,
    avatar_url: (row.avatar_url as string | null) ?? null,
  }));

  return NextResponse.json({ authors });
}
