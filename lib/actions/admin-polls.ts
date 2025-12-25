"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/* =============================
   Types
============================= */

export type PollStatus = "draft" | "published" | "archived";

export type AdminPollListItem = {
  id: string;
  slug: string;
  title: string;
  status: PollStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type AdminPollForEdit = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  hero_image_url: string | null;
  card_image_url: string | null;
  status: PollStatus;
  starts_at: string | null;
  ends_at: string | null;

  questions: {
    id: string;
    prompt: string;
    sort_order: number;
  }[];

  options: {
    id: string;
    question_id: string;
    label: string;
    style: "text" | "image";
    image_url: string | null;
    sort_order: number;
  }[];
};

export type AdminPollInput = {
  title: string;
  slug?: string | null;
  description?: string | null;
  hero_image_url?: string | null;
  card_image_url?: string | null;
  status: PollStatus;
  starts_at?: string | null;
  ends_at?: string | null;

  questions: {
    prompt: string;
    sort_order: number;
    options: {
      label: string;
      style: "text" | "image";
      image_url?: string | null;
      sort_order: number;
    }[];
  }[];
};

/* =============================
   Helpers
============================= */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("NOT_AUTHENTICATED");

  const { data: dbUser, error } = await supabase
    .from("users")
    .select("id, is_admin")
    .eq("id", user.id)
    .single();

  if (error) throw new Error(error.message);

  const isAdmin = dbUser?.is_admin || user.user_metadata?.is_admin;
  if (!isAdmin) throw new Error("NOT_ADMIN");

  return supabase;
}

async function ensureUniquePollSlug(
  supabase: any,
  baseSlug: string,
  currentId?: string
): Promise<string> {
  const base = baseSlug;
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    let q = supabase.from("polls").select("id").eq("slug", candidate).limit(1);

    if (currentId) q = q.neq("id", currentId);

    const { data, error } = await q;
    if (error) return candidate; // fallback; DB unique constraint still protects

    if (!data || data.length === 0) return candidate;

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

/* =============================
   Admin reads
============================= */

export async function adminGetPolls(): Promise<AdminPollListItem[]> {
  const supabase = await ensureAdmin();

  const { data, error } = await supabase
    .from("polls")
    .select("id, slug, title, status, starts_at, ends_at, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((p: any) => ({
    id: String(p.id),
    slug: String(p.slug),
    title: p.title ?? "",
    status: p.status as PollStatus,
    starts_at: p.starts_at ?? null,
    ends_at: p.ends_at ?? null,
    created_at: p.created_at ?? "",
  }));
}

export async function adminGetPollForEdit(id: string): Promise<AdminPollForEdit | null> {
  const supabase = await ensureAdmin();

  const { data: poll, error: pErr } = await supabase
    .from("polls")
    .select(
      "id, slug, title, description, hero_image_url, card_image_url, status, starts_at, ends_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (pErr || !poll) return null;

  const { data: questions, error: qErr } = await supabase
    .from("poll_questions")
    .select("id, prompt, sort_order")
    .eq("poll_id", poll.id)
    .order("sort_order", { ascending: true });

  if (qErr) return null;

  const { data: options, error: oErr } = await supabase
    .from("poll_options")
    .select("id, question_id, label, style, image_url, sort_order")
    .eq("poll_id", poll.id)
    .order("sort_order", { ascending: true });

  if (oErr) return null;

  return {
    id: String(poll.id),
    slug: String(poll.slug),
    title: poll.title ?? "",
    description: poll.description ?? null,
    hero_image_url: poll.hero_image_url ?? null,
    card_image_url: poll.card_image_url ?? null,
    status: poll.status as PollStatus,
    starts_at: poll.starts_at ?? null,
    ends_at: poll.ends_at ?? null,
    questions: (questions || []).map((x: any) => ({
      id: String(x.id),
      prompt: x.prompt ?? "",
      sort_order: Number(x.sort_order ?? 0),
    })),
    options: (options || []).map((x: any) => ({
      id: String(x.id),
      question_id: String(x.question_id),
      label: x.label ?? "",
      style: (x.style as "text" | "image") ?? "text",
      image_url: x.image_url ?? null,
      sort_order: Number(x.sort_order ?? 0),
    })),
  };
}

/* =============================
   Admin writes
============================= */

export async function adminCreatePoll(input: AdminPollInput) {
  const supabase = await ensureAdmin();

  const title = (input.title || "").trim();
  if (!title) throw new Error("Title is required.");

  const baseSlug = (input.slug && input.slug.trim()) || slugify(title);
  const slug = await ensureUniquePollSlug(supabase, baseSlug);

  // 1) create poll row
  const { data: poll, error: pErr } = await supabase
    .from("polls")
    .insert({
      title,
      slug,
      description: input.description ?? null,
      hero_image_url: input.hero_image_url ?? null,
      card_image_url: input.card_image_url ?? null,
      status: input.status,
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
    })
    .select("id")
    .single();

  if (pErr || !poll) throw new Error(pErr?.message || "Failed to create poll.");

  // 2) create questions + options
  for (const q of input.questions) {
    const { data: qRow, error: qErr } = await supabase
      .from("poll_questions")
      .insert({
        poll_id: poll.id,
        prompt: q.prompt,
        sort_order: q.sort_order,
      })
      .select("id")
      .single();

    if (qErr || !qRow) throw new Error(qErr?.message || "Failed to create question.");

    const rows = q.options.map((o) => ({
      poll_id: poll.id,
      question_id: qRow.id,
      label: o.label,
      style: o.style,
      image_url: o.image_url ?? null,
      sort_order: o.sort_order,
    }));

    const { error: oErr } = await supabase.from("poll_options").insert(rows);
    if (oErr) throw new Error(oErr.message || "Failed to create options.");
  }

  // ✅ refresh pages that read polls
  revalidatePath("/admin/polls");
  revalidatePath("/polls");

  return { id: String(poll.id), slug };
}

export async function adminUpdatePoll(id: string, input: AdminPollInput) {
  const supabase = await ensureAdmin();

  const title = (input.title || "").trim();
  if (!title) throw new Error("Title is required.");

  const baseSlug = (input.slug && input.slug.trim()) || slugify(title);
  const slug = await ensureUniquePollSlug(supabase, baseSlug, id);

  // update poll row
  const { error: upErr } = await supabase
    .from("polls")
    .update({
      title,
      slug,
      description: input.description ?? null,
      hero_image_url: input.hero_image_url ?? null,
      card_image_url: input.card_image_url ?? null,
      status: input.status,
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
    })
    .eq("id", id);

  if (upErr) throw new Error(upErr.message);

  // easiest v1: wipe old questions/options, reinsert
  // (safe because votes reference option_id; so only do this if poll has NO votes)
  const { count } = await supabase
    .from("poll_votes")
    .select("*", { count: "exact", head: true })
    .eq("poll_id", id);

  if ((count ?? 0) > 0) {
    throw new Error(
      "This poll already has votes. For v1, editing questions/options is locked. Create a new poll instead."
    );
  }

  await supabase.from("poll_options").delete().eq("poll_id", id);
  await supabase.from("poll_questions").delete().eq("poll_id", id);

  for (const q of input.questions) {
    const { data: qRow, error: qErr } = await supabase
      .from("poll_questions")
      .insert({
        poll_id: id,
        prompt: q.prompt,
        sort_order: q.sort_order,
      })
      .select("id")
      .single();

    if (qErr || !qRow) throw new Error(qErr?.message || "Failed to create question.");

    const rows = q.options.map((o) => ({
      poll_id: id,
      question_id: qRow.id,
      label: o.label,
      style: o.style,
      image_url: o.image_url ?? null,
      sort_order: o.sort_order,
    }));

    const { error: oErr } = await supabase.from("poll_options").insert(rows);
    if (oErr) throw new Error(oErr.message || "Failed to create options.");
  }

  // ✅ refresh pages that read polls
  revalidatePath("/admin/polls");
  revalidatePath("/polls");

  return { ok: true, slug };
}

export async function adminDeletePoll(id: string) {
  const supabase = await ensureAdmin();

  // delete in safe order
  await supabase.from("poll_votes").delete().eq("poll_id", id);
  await supabase.from("poll_options").delete().eq("poll_id", id);
  await supabase.from("poll_questions").delete().eq("poll_id", id);

  const { error } = await supabase.from("polls").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // ✅ refresh list page + public polls page
  revalidatePath("/admin/polls");
  revalidatePath("/polls");
}

export async function adminSetPollStatus(id: string, status: PollStatus) {
  const supabase = await ensureAdmin();

  const { error } = await supabase.from("polls").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  // ✅ refresh list page + public polls page
  revalidatePath("/admin/polls");
  revalidatePath("/polls");

  return { ok: true };
}
