// lib/actions/home-content.ts
"use server";

import { createClient } from "../supabase/server";
import type { NewsItem } from "@/components/NewsCard";
import { adminGetRatings } from "./admin-content";

export type CarouselSlide = { src: string; alt: string };

/**
 * HERO SLIDES for the HOME page
 */
export async function getHeroSlidesForHome(): Promise<CarouselSlide[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hero_slides")
    .select("image_url, title, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("getHeroSlidesForHome error:", error);
    return [];
  }

  return data.map((row: any) => ({
    src: row.image_url as string,
    alt: (row.title as string) || "Featured game",
  }));
}

/**
 * TOP STORIES for the HOME page
 */
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
    // if link_url is set, use it; otherwise /news/<slug> or /news/<id>
    href: row.link_url || `/news/${row.slug ?? row.id}`,
    subtitle: row.subtitle ?? row.summary ?? undefined,
    isSpoiler: row.is_spoiler ?? false,
  }));
}

/**
 * LATEST RATINGS for the HOME page
 */
export async function getLatestRatingsForHome(): Promise<NewsItem[]> {
  const ratings = await adminGetRatings();

  return ratings.map((r) => ({
    id: r.id,
    title: r.game_title,
    img: r.img,
    badge: r.score.toFixed(1),
    subtitle: r.subtitle ?? undefined,
    href: `/ratings/${r.id}`, // 👈 NEW: click opens rating detail page
  }));
}
