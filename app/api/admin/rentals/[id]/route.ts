import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const formData = await req.formData();
  const payload = {
    title: formData.get("title") as string,
    platform: formData.get("platform") as string,
    total_copies: Number(formData.get("total_copies")),
    price_amount: Number(formData.get("price_amount")),
  };
  const { error } = await supabase
    .from("rental_games")
    .update(payload)
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { error } = await supabase.from("rental_games").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
