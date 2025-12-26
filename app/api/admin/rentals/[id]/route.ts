// app/api/admin/rentals/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const formData = await req.formData();

  const payload = {
    title: String(formData.get("title") ?? ""),
    platform: String(formData.get("platform") ?? ""),
    total_copies: Number(formData.get("total_copies") ?? 0),
    price_amount: Number(formData.get("price_amount") ?? 0),
  };

  const { error } = await supabase.from("rental_games").update(payload).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { error } = await supabase.from("rental_games").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
