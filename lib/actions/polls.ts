"use server";

import { createClient } from "@/lib/supabase/server";
import type { PollDetail, PollListItem } from "@/lib/polls/shared";

export type UserVoteRow = {
  poll_id: string;
  question_id: string;
  option_id: string;
  user_id: string;
};

/* =========================================================================
 * Helpers (no `any`, stable runtime)
 * =======================================================================*/

type Row = Record<string, unknown>;

function asRow(v: unknown): Row {
  return typeof v === "object" && v !== null ? (v as Row) : {};
}

function toStringValue(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function toNullableString(v: unknown): string | null {
  return v == null ? null : typeof v === "string" ? v : String(v);
}

function toNumberValue(v: unknown, fallback = 0): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* =============================
   Public reads (guests allowed)
============================= */

export async function getPublishedPolls(): Promise<PollListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("polls")
    .select(
      "id, slug, title, description, hero_image_url, card_image_url, status, starts_at, ends_at, created_at",
    )
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPublishedPolls error", error);
    return [];
  }

  return ((data as unknown[] | null | undefined) ?? []).map((pInput) => {
    const p = asRow(pInput);

    return {
      id: toStringValue(p.id),
      slug: toStringValue(p.slug),
      title: toStringValue(p.title, ""),
      description: toNullableString(p.description),
      hero_image_url: toNullableString(p.hero_image_url),
      card_image_url: toNullableString(p.card_image_url),
      status: p.status as PollListItem["status"],
      starts_at: toNullableString(p.starts_at),
      ends_at: toNullableString(p.ends_at),
      created_at: toStringValue(p.created_at, ""),
    };
  });
}

export async function getPollBySlug(slug: string): Promise<PollDetail | null> {
  const supabase = await createClient();

  const { data: poll, error: pollErr } = await supabase
    .from("polls")
    .select(
      "id, slug, title, description, hero_image_url, card_image_url, status, starts_at, ends_at, created_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (pollErr || !poll) {
    console.error("getPollBySlug error", pollErr);
    return null;
  }

  const pollRow = asRow(poll);

  const { data: questions, error: qErr } = await supabase
    .from("poll_questions")
    .select("id, poll_id, prompt, sort_order")
    .eq("poll_id", toStringValue(pollRow.id))
    .order("sort_order", { ascending: true });

  if (qErr) {
    console.error("getPollBySlug questions error", qErr);
    return null;
  }

  const { data: options, error: oErr } = await supabase
    .from("poll_options")
    .select("id, poll_id, question_id, label, image_url, style, sort_order")
    .eq("poll_id", toStringValue(pollRow.id))
    .order("sort_order", { ascending: true });

  if (oErr) {
    console.error("getPollBySlug options error", oErr);
    return null;
  }

  return {
    id: toStringValue(pollRow.id),
    slug: toStringValue(pollRow.slug),
    title: toStringValue(pollRow.title, ""),
    description: toNullableString(pollRow.description),
    hero_image_url: toNullableString(pollRow.hero_image_url),
    card_image_url: toNullableString(pollRow.card_image_url),
    status: pollRow.status as PollDetail["status"],
    starts_at: toNullableString(pollRow.starts_at),
    ends_at: toNullableString(pollRow.ends_at),
    created_at: toStringValue(pollRow.created_at, ""),
    questions: ((questions as unknown[] | null | undefined) ?? []).map((xInput) => {
      const x = asRow(xInput);
      return {
        id: toStringValue(x.id),
        poll_id: toStringValue(x.poll_id),
        prompt: toStringValue(x.prompt, ""),
        sort_order: toNumberValue(x.sort_order ?? 0),
      };
    }),
    options: ((options as unknown[] | null | undefined) ?? []).map((xInput) => {
      const x = asRow(xInput);
      return {
        id: toStringValue(x.id),
        poll_id: toStringValue(x.poll_id),
        question_id: toStringValue(x.question_id),
        label: toStringValue(x.label, ""),
        image_url: toNullableString(x.image_url),
        style: ((x.style as "text" | "image" | null | undefined) ?? "text"),
        sort_order: toNumberValue(x.sort_order ?? 0),
      };
    }),
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

  return ((data as unknown[] | null | undefined) ?? []).map((vInput) => {
    const v = asRow(vInput);
    return {
      poll_id: toStringValue(v.poll_id),
      question_id: toStringValue(v.question_id),
      option_id: toStringValue(v.option_id),
      user_id: toStringValue(v.user_id),
    };
  });
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
    user_id: userRes.user.id,
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
