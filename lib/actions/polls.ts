"use server";

import { createClient } from "@/lib/supabase/server";
import type { PollDetail, PollListItem } from "@/lib/polls/shared";

export type UserVoteRow = {
  poll_id: string;
  question_id: string;
  option_id: string;
  user_id: string;
};

/* =============================
   Public reads (guests allowed)
============================= */

export async function getPublishedPolls(): Promise<PollListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("polls")
    .select(
      "id, slug, title, description, hero_image_url, card_image_url, status, starts_at, ends_at, created_at"
    )
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPublishedPolls error", error);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: String(p.id),
    slug: String(p.slug),
    title: p.title ?? "",
    description: p.description ?? null,
    hero_image_url: p.hero_image_url ?? null,
    card_image_url: p.card_image_url ?? null,
    status: p.status,
    starts_at: p.starts_at ?? null,
    ends_at: p.ends_at ?? null,
    created_at: p.created_at ?? "",
  }));
}

export async function getPollBySlug(slug: string): Promise<PollDetail | null> {
  const supabase = await createClient();

  const { data: poll, error: pollErr } = await supabase
    .from("polls")
    .select(
      "id, slug, title, description, hero_image_url, card_image_url, status, starts_at, ends_at, created_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (pollErr || !poll) {
    console.error("getPollBySlug error", pollErr);
    return null;
  }

  const { data: questions, error: qErr } = await supabase
    .from("poll_questions")
    .select("id, poll_id, prompt, sort_order")
    .eq("poll_id", poll.id)
    .order("sort_order", { ascending: true });

  if (qErr) {
    console.error("getPollBySlug questions error", qErr);
    return null;
  }

  const { data: options, error: oErr } = await supabase
    .from("poll_options")
    .select("id, poll_id, question_id, label, image_url, style, sort_order")
    .eq("poll_id", poll.id)
    .order("sort_order", { ascending: true });

  if (oErr) {
    console.error("getPollBySlug options error", oErr);
    return null;
  }

  return {
    id: String(poll.id),
    slug: String(poll.slug),
    title: poll.title ?? "",
    description: poll.description ?? null,
    hero_image_url: poll.hero_image_url ?? null,
    card_image_url: poll.card_image_url ?? null,
    status: poll.status,
    starts_at: poll.starts_at ?? null,
    ends_at: poll.ends_at ?? null,
    created_at: poll.created_at ?? "",
    questions: (questions || []).map((x: any) => ({
      id: String(x.id),
      poll_id: String(x.poll_id),
      prompt: x.prompt ?? "",
      sort_order: Number(x.sort_order ?? 0),
    })),
    options: (options || []).map((x: any) => ({
      id: String(x.id),
      poll_id: String(x.poll_id),
      question_id: String(x.question_id),
      label: x.label ?? "",
      image_url: x.image_url ?? null,
      style: (x.style as "text" | "image") ?? "text",
      sort_order: Number(x.sort_order ?? 0),
    })),
  };
}

/* =============================
   Votes
   - guests can’t vote
============================= */

export async function getMyVotes(pollId: string): Promise<UserVoteRow[]> {
  const supabase = await createClient();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return [];

  const { data, error } = await supabase
    .from("poll_votes")
    .select("poll_id, question_id, option_id, user_id")
    .eq("poll_id", pollId)
    .eq("user_id", userRes.user.id);

  if (error) {
    console.error("getMyVotes error", error);
    return [];
  }

  return (data || []).map((v: any) => ({
    poll_id: String(v.poll_id),
    question_id: String(v.question_id),
    option_id: String(v.option_id),
    user_id: String(v.user_id),
  }));
}

export async function submitPollVotes(input: {
  pollId: string;
  answers: { questionId: string; optionId: string }[];
}) {
  const supabase = await createClient();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) throw new Error("NOT_LOGGED_IN");

  if (!input.pollId || !input.answers?.length) {
    throw new Error("Missing poll answers.");
  }

  const rows = input.answers.map((a) => ({
    poll_id: input.pollId,
    question_id: a.questionId,
    option_id: a.optionId,
    user_id: userRes.user!.id,
  }));

  const { error } = await supabase.from("poll_votes").insert(rows);

  if (error) {
    console.error("submitPollVotes error", error);
    throw new Error(error.message || "Failed to submit votes.");
  }

  return { ok: true };
}

/* =============================
   Results
============================= */

export async function getPollResultsLocked(pollId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_poll_results", {
    p_poll_id: pollId,
  });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function getPollResultsPublic(pollId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_poll_results_public", {
    p_poll_id: pollId,
  });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}
