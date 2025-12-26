// app/admin/polls/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminGetPollForEdit } from "@/lib/actions/admin-polls";
import AdminPollEditor from "@/components/AdminPollEditor";

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export default async function AdminPollEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const poll = await adminGetPollForEdit(id);
  if (!poll) return notFound();

  const questions = poll.questions
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((q) => ({
      prompt: q.prompt,
      options: poll.options
        .filter((o) => o.question_id === q.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({
          label: o.label,
          style: o.style,
          image_url: o.image_url ?? "",
        })),
    }));

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 py-8">
      <AdminPollEditor
        mode="edit"
        initial={{
          id: poll.id,
          title: poll.title,
          slug: poll.slug,
          description: poll.description ?? "",
          hero_image_url: poll.hero_image_url ?? "",
          card_image_url: poll.card_image_url ?? "",
          status: poll.status,
          starts_at: toDateOrNull(poll.starts_at),
          ends_at: toDateOrNull(poll.ends_at),
          questions,
        }}
      />

      <div className="mt-6 text-xs text-text-muted">
        Note: If the poll already has votes, v1 blocks editing questions/options.
      </div>
    </div>
  );
}
