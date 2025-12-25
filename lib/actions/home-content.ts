"use server";

import { createClient } from "../supabase/server";
import type { NewsItem } from "@/components/NewsCard";

/* =========================================================================
 * Small, safe helpers (avoid `any`, keep runtime behavior stable)
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
  return fallback;
}

function toNullableNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStringArrayOrNull(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  // Keep original behavior: if it's an array, return it as string[]
  // (Supabase usually returns string[] already; this avoids breaking anything.)
  return v as string[];
}

/* =========================================================================
 * UPCOMING GAMES (Home + Public)
 * =======================================================================*/

export type UpcomingGameRow = {
  id: string;
  year: number;
  month: number; // 1..12, 13=TBA
  day: number | null;
  title: string;
  studio: string | null;
  platforms: string[] | null;
  details_html: string | null;
  sort_order: number;
  link_url: string | null;
};

function mapUpcoming(rowInput: unknown): UpcomingGameRow {
  const row = asRow(rowInput);

  return {
    id: toStringValue(row.id),
    year: toNumberValue(row.year),
    month: toNumberValue(row.month),
    day: toNullableNumber(row.day),
    title: toStringValue(row.title ?? ""),
    studio: toNullableString(row.studio),
    platforms: toStringArrayOrNull(row.platforms),
    details_html: toNullableString(row.details_html),
    sort_order: toNumberValue(row.sort_order ?? 0),
    link_url: toNullableString(row.link_url),
  };
}

export async function getUpcomingGamesForHome(args: {
  year: number;
  month: number;
}): Promise<UpcomingGameRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("upcoming_games")
    .select(
      "id, year, month, day, title, studio, platforms, link_url, details_html, sort_order, created_at",
    )
    .eq("year", args.year)
    .eq("month", args.month)
    .order("sort_order", { ascending: true })
    .order("day", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("getUpcomingGamesForHome error:", error);
    return [];
  }

  return (data as unknown[]).map(mapUpcoming);
}

export async function getUpcomingGamesForYear(
  year: number,
): Promise<UpcomingGameRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("upcoming_games")
    .select(
      "id, year, month, day, title, studio, platforms, link_url, details_html, sort_order, created_at",
    )
    .eq("year", year)
    .order("month", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("day", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("getUpcomingGamesForYear error:", error);
    return [];
  }

  return (data as unknown[]).map(mapUpcoming);
}

/* =========================================================================
 * HERO SLIDES
 * =======================================================================*/

export type CarouselSlide = { src: string; alt: string; href?: string };

export async function getHeroSlidesForHome(): Promise<CarouselSlide[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hero_slides")
    .select("image_url, title, link_url, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("getHeroSlidesForHome error:", error);
    return [];
  }

  return (data as unknown[]).map((rowInput) => {
    const row = asRow(rowInput);
    const href = toNullableString(row.link_url);

    return {
      src: toStringValue(row.image_url),
      alt: toStringValue(row.title, "Featured") || "Featured",
      href: href || undefined,
    };
  });
}

/* =========================================================================
 * TOP STORIES
 * =======================================================================*/

export async function getTopStoriesForHome(): Promise<NewsItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("top_stories")
    .select(
      "id, slug, title, subtitle, summary, image_url, link_url, is_spoiler, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) {
    console.error("getTopStoriesForHome error:", error);
    return [];
  }

  return (data as unknown[]).map((rowInput) => {
    const row = asRow(rowInput);

    const idStr = toStringValue(row.id);
    const slugStr = row.slug == null ? null : toStringValue(row.slug);
    const linkUrl = toNullableString(row.link_url);

    const subtitle =
      row.subtitle != null
        ? toStringValue(row.subtitle)
        : row.summary != null
          ? toStringValue(row.summary)
          : undefined;

    return {
      id: row.id as NewsItem["id"], // keep id type consistent with your NewsItem definition
      title: toStringValue(row.title),
      img: toStringValue(row.image_url),
      href: linkUrl || `/news/${slugStr ?? idStr}`,
      subtitle,
      isSpoiler: Boolean(row.is_spoiler ?? false),
    };
  });
}

/* =========================================================================
 * RATINGS (lightweight for home cards)
 * =======================================================================*/

export type HomeRatingItem = {
  id: string;
  slug: string | null;
  title: string;
  img: string;
  badge: string;
  subtitle?: string;
};

export async function getLatestRatingsForHome(): Promise<HomeRatingItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ratings")
    .select("id, slug, game_title, image_url, score, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error || !data) {
    console.error("getLatestRatingsForHome error:", error);
    return [];
  }

  return (data as unknown[]).map((rowInput) => {
    const r = asRow(rowInput);

    const score = toNumberValue(r.score ?? 0);

    return {
      id: toStringValue(r.id),
      slug: r.slug == null ? null : toStringValue(r.slug),
      title: toStringValue(r.game_title ?? ""),
      img: toStringValue(r.image_url ?? ""),
      badge: score.toFixed(1),
      subtitle: r.summary == null ? undefined : toStringValue(r.summary),
    };
  });
}

/* =========================================================================
 * PLAYERS GAME OF THE MONTH
 * =======================================================================*/

export type PlayersGameOfMonthHomeItem = {
  id: string;
  position: number;
  title: string | null;
  image_url: string | null;
  link_url: string | null;
};

export type PlayersGameOfMonthHomePayload = {
  items: PlayersGameOfMonthHomeItem[];
  totalVotesText: string;
  votesHref: string;
  monthLabel: string;
};

export async function getPlayersGameOfMonthForHome(): Promise<PlayersGameOfMonthHomePayload> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("players_game_of_month")
    .select(
      "id, position, title, image_url, link_url, total_votes, votes_link_url, month_label",
    )
    .order("position", { ascending: true });

  if (error || !data) {
    console.error("getPlayersGameOfMonthForHome error:", error);
    return {
      items: [],
      totalVotesText: "110 VOTES",
      votesHref: "/polls",
      monthLabel: "THIS MONTH",
    };
  }

  const rows = data as unknown[];

  const items: PlayersGameOfMonthHomeItem[] = rows.map((rowInput) => {
    const row = asRow(rowInput);
    return {
      id: toStringValue(row.id),
      position: toNumberValue(row.position),
      title: toNullableString(row.title),
      image_url: toNullableString(row.image_url),
      link_url: toNullableString(row.link_url),
    };
  });

  // Preserve your original "find-first-row-that-has-value" logic.
  const totalVotesRow = rows.find((r) => toNullableNumber(asRow(r).total_votes) != null);
  const votesHrefRow = rows.find((r) => {
    const v = toNullableString(asRow(r).votes_link_url);
    return Boolean(v);
  });
  const monthLabelRow = rows.find((r) => {
    const v = toNullableString(asRow(r).month_label);
    return Boolean(v);
  });

  const totalVotes =
    totalVotesRow != null ? toNullableNumber(asRow(totalVotesRow).total_votes) : null;
  const votesHref =
    votesHrefRow != null ? toNullableString(asRow(votesHrefRow).votes_link_url) : null;
  const monthLabel =
    monthLabelRow != null ? toNullableString(asRow(monthLabelRow).month_label) : null;

  return {
    items,
    totalVotesText: `${Number(totalVotes ?? 110)} VOTES`,
    votesHref: votesHref ?? "/polls",
    monthLabel: monthLabel ?? "THIS MONTH",
  };
}
