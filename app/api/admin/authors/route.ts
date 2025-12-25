// app/api/admin/authors/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AuthorRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean | null;
};

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, avatar_url, is_admin")
    .eq("is_admin", true)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Load authors error", error);
    return NextResponse.json({ authors: [] }, { status: 500 });
  }

  const authors = ((data ?? []) as AuthorRow[]).map((row) => ({
    id: row.id,
    name: row.full_name ?? "",
    role: null as string | null,
    avatar_url: row.avatar_url ?? null,
  }));

  return NextResponse.json({ authors });
}
