// app/admin/ratings/[id]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RatingEditor from "@/components/RatingEditor";
import type { ComponentProps } from "react";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

type RatingEditorInitial = ComponentProps<typeof RatingEditor>["initial"];

export default async function EditRatingPage({ params }: PageProps) {
  const { id } = await Promise.resolve(params);

  const supabase = await createClient();

  const base = supabase.from("ratings").select("*");
  const query = looksLikeUuid(id) ? base.eq("id", id) : base.eq("slug", id);

  // ✅ type the returned data to whatever RatingEditor expects
  const { data, error } = await query.maybeSingle<RatingEditorInitial>();

  if (error || !data) {
    console.error("EditRatingPage error", error);
    notFound();
  }

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 py-8 text-white">
      <RatingEditor mode="edit" initial={data} />
    </div>
  );
}
