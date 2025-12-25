"use server";

import { createClient } from "../supabase/server";
import type { NewsItem } from "@/components/NewsCard";

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

function mapUpcoming(row: any): UpcomingGameRow {
  return {
    id: String(row.id),
    year: Number(row.year),
    month: Number(row.month),
    day: row.day === null || row.day === undefined ? null : Number(row.day),
    title: String(row.title ?? ""),
    studio: row.studio ?? null,
    platforms: Array.isArray(row.platforms) ? (row.platforms as string[]) : null,
    details_html: row.details_html ?? null,
    sort_order: Number(row.sort_order ?? 0),
    link_url: (row.link_url as string | null) ?? null,
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

  return data.map(mapUpcoming);
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

  return data.map(mapUpcoming);
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

  return data.map((row: any) => ({
    src: row.image_url as string,
    alt: (row.title as string) || "Featured",
    href: (row.link_url as string) || undefined,
  }));
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

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    img: row.image_url,
    href: row.link_url || `/news/${row.slug ?? row.id}`,
    subtitle: row.subtitle ?? row.summary ?? undefined,
    isSpoiler: row.is_spoiler ?? false,
  }));
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

  return data.map((r: any) => ({
    id: String(r.id),
    slug: (r.slug as string | null) ?? null,
    title: String(r.game_title ?? ""),
    img: String(r.image_url ?? ""),
    badge: Number(r.score ?? 0).toFixed(1),
    subtitle: (r.summary as string | null) ?? undefined,
  }));
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

  const items: PlayersGameOfMonthHomeItem[] = data.map((row: any) => ({
    id: String(row.id),
    position: Number(row.position),
    title: row.title ?? null,
    image_url: row.image_url ?? null,
    link_url: row.link_url ?? null,
  }));

  const totalVotes =
    data.find((r: any) => r.total_votes != null)?.total_votes ?? 110;
  const votesHref =
    data.find((r: any) => r.votes_link_url)?.votes_link_url ?? "/polls";
  const monthLabel =
    data.find((r: any) => r.month_label)?.month_label ?? "THIS MONTH";

  return {
    items,
    totalVotesText: `${Number(totalVotes)} VOTES`,
    votesHref,
    monthLabel,
  };
}
