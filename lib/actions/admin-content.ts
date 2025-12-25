// lib/actions/admin-content.ts
"use server";

import { createClient } from "../supabase/server";
import type { NewsItem } from "@/components/NewsCard";

/* =========================================================================
 * TYPES
 * =======================================================================*/

export type RatingItem = {
  id: string;
  game_title: string;
  img: string;
  score: number;
  subtitle: string | null;
  slug: string | null;
};

export type HeroSlideItem = {
  id: string;
  img: string;
  title: string | null;
  link_url: string | null;
};

export type PlayersGameOfMonthItem = {
  id: string;
  position: number; // 1..5
  title: string | null;
  image_url: string | null;
  link_url: string | null;

  total_votes: number | null;
  votes_link_url: string | null;

  month_label?: string | null;
};

/** ✅ Upcoming Games (calendar image REMOVED) */
export type UpcomingGameItem = {
  id: string;
  year: number; // e.g. 2026
  month: number; // 1..12, 13 = TBA
  day: number | null; // only day number; null allowed
  title: string;
  studio: string | null;
  platforms: string[] | null;
  link_url: string | null;

  details_html: string | null;
  sort_order: number;
  created_at?: string | null;
};

/** Generic "row" shape from Supabase selects */
type Row = Record<string, unknown>;

/* ---------- helpers ---------- */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type SupabaseLike = {
  from: (table: string) => any; // NOTE: Supabase server client type is huge; we avoid importing it here.
};

async function ensureUniqueSlug(
  supabase: SupabaseLike,
  table: "ratings" | "top_stories",
  baseSlug: string | null,
  currentId?: string | number,
): Promise<string | null> {
  if (!baseSlug) return null;

  const base = baseSlug;
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    let query = supabase.from(table).select("id").eq("slug", candidate).limit(1);
    if (currentId != null) query = query.neq("id", currentId);

    const { data, error } = await query;

    if (error) {
      console.error("ensureUniqueSlug error", error);
      return candidate;
    }

    if (!data || data.length === 0) return candidate;

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

/* ---------- mappers ---------- */

function mapStoryRow(row: Row): NewsItem {
  const id = row.id as string | number | null;
  const slug = row.slug as string | null;

  const internalPath =
    slug ? `/news/${slug}` : id ? `/news/${String(id)}` : undefined;

  return {
    id: id as any, // NewsItem likely expects whatever your component uses; keep it stable.
    title: (row.title as string) ?? "",
    img: (row.image_url as string) ?? "",
    href: (row.link_url as string | null) ?? internalPath,
    subtitle:
      (row.subtitle as string | null) ??
      (row.summary as string | null) ??
      undefined,
  };
}

function mapRatingRow(row: Row): RatingItem {
  return {
    id: String(row.id ?? ""),
    game_title: (row.game_title as string) ?? "",
    img: (row.image_url as string) ?? "",
    score: Number(row.score ?? 0),
    subtitle: ((row.summary as string | null) ?? null),
    slug: ((row.slug as string | null) ?? null),
  };
}

function mapHeroRow(row: Row): HeroSlideItem {
  return {
    id: String(row.id ?? ""),
    img: (row.image_url as string) ?? "",
    title: (row.title as string | null) ?? null,
    link_url: (row.link_url as string | null) ?? null,
  };
}

function mapPlayersGameRow(row: Row): PlayersGameOfMonthItem {
  return {
    id: String(row.id ?? ""),
    position: Number(row.position ?? 0),
    title: (row.title as string | null) ?? null,
    image_url: (row.image_url as string | null) ?? null,
    link_url: (row.link_url as string | null) ?? null,
    total_votes:
      row.total_votes === null || row.total_votes === undefined
        ? null
        : Number(row.total_votes),
    votes_link_url: (row.votes_link_url as string | null) ?? null,
    month_label: (row.month_label as string | null) ?? null,
  };
}

function mapUpcomingGameRow(row: Row): UpcomingGameItem {
  return {
    id: String(row.id ?? ""),
    year: Number(row.year ?? 0),
    month: Number(row.month ?? 0),
    day: row.day === null || row.day === undefined ? null : Number(row.day),
    title: String(row.title ?? ""),
    studio: (row.studio as string | null) ?? null,
    platforms: (row.platforms as string[] | null) ?? null,
    link_url: (row.link_url as string | null) ?? null,
    details_html: (row.details_html as string | null) ?? null,
    sort_order:
      row.sort_order === null || row.sort_order === undefined
        ? 0
        : Number(row.sort_order),
    created_at: (row.created_at as string | null) ?? null,
  };
}

/* =========================================================================
 * STORIES
 * =======================================================================*/

export async function adminGetTopStories(): Promise<NewsItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("top_stories")
    .select("id, slug, title, subtitle, summary, image_url, link_url, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("adminGetTopStories error:", error);
    return [];
  }

  return (data as Row[]).map(mapStoryRow);
}

export type AdminStoryInput = {
  title: string;
  img: string;
  href?: string;
  subtitle?: string;
  body?: string;
  extraImages?: string[];
  contentBlocks?: unknown[];

  slug?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;

  authorName?: string | null;
  authorRole?: string | null;
  authorAvatarUrl?: string | null;
  reviewedBy?: string | null;

  isSpoiler?: boolean;
};

export async function adminCreateStory(input: AdminStoryInput) {
  const supabase = await createClient();
  const baseTitle = (input.title || "").trim();

  const baseSlug =
    (input.slug && input.slug.trim()) || (baseTitle ? slugify(baseTitle) : null);

  const effectiveSlug = await ensureUniqueSlug(
    supabase as unknown as SupabaseLike,
    "top_stories",
    baseSlug,
  );

  const effectiveMetaTitle =
    (input.metaTitle && input.metaTitle.trim()) || baseTitle || null;

  const effectiveMetaDescription =
    input.metaDescription && input.metaDescription.trim()
      ? input.metaDescription.trim()
      : null;

  const { data, error } = await supabase
    .from("top_stories")
    .insert({
      title: baseTitle,
      image_url: input.img,
      link_url: input.href ?? null,
      subtitle: input.subtitle ?? null,
      body: input.body ?? null,
      extra_images:
        input.extraImages && input.extraImages.length ? input.extraImages : null,
      content_blocks:
        input.contentBlocks && input.contentBlocks.length
          ? input.contentBlocks
          : null,
      slug: effectiveSlug,
      meta_title: effectiveMetaTitle,
      meta_description: effectiveMetaDescription,

      author_name: input.authorName ?? null,
      author_role: input.authorRole ?? null,
      author_avatar_url: input.authorAvatarUrl ?? null,
      reviewed_by: input.reviewedBy ?? null,

      is_spoiler: input.isSpoiler ?? false,
    })
    .select("id, slug, title, subtitle, summary, image_url, link_url, created_at")
    .single();

  if (error || !data) {
    console.error("adminCreateStory error:", error);
    throw new Error(error?.message || "Failed to create story");
  }

  return mapStoryRow(data as Row);
}

export async function adminUpdateStory(id: string, input: AdminStoryInput) {
  const supabase = await createClient();
  const baseTitle = (input.title || "").trim();

  const baseSlug =
    (input.slug && input.slug.trim()) || (baseTitle ? slugify(baseTitle) : null);

  const effectiveSlug = await ensureUniqueSlug(
    supabase as unknown as SupabaseLike,
    "top_stories",
    baseSlug,
    id,
  );

  const effectiveMetaTitle =
    (input.metaTitle && input.metaTitle.trim()) || baseTitle || null;

  const effectiveMetaDescription =
    input.metaDescription && input.metaDescription.trim()
      ? input.metaDescription.trim()
      : null;

  const { data, error } = await supabase
    .from("top_stories")
    .update({
      title: baseTitle,
      image_url: input.img,
      link_url: input.href ?? null,
      subtitle: input.subtitle ?? null,
      body: input.body ?? null,
      extra_images:
        input.extraImages && input.extraImages.length ? input.extraImages : null,
      content_blocks:
        input.contentBlocks && input.contentBlocks.length
          ? input.contentBlocks
          : null,
      slug: effectiveSlug,
      meta_title: effectiveMetaTitle,
      meta_description: effectiveMetaDescription,

      author_name: input.authorName ?? null,
      author_role: input.authorRole ?? null,
      author_avatar_url: input.authorAvatarUrl ?? null,
      reviewed_by: input.reviewedBy ?? null,

      is_spoiler: input.isSpoiler ?? false,
    })
    .eq("id", id)
    .select("id, slug, title, subtitle, summary, image_url, link_url, created_at")
    .single();

  if (error || !data) {
    console.error("adminUpdateStory error:", error);
    throw new Error(error?.message || "Failed to update story");
  }

  return mapStoryRow(data as Row);
}

export async function adminDeleteStory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("top_stories").delete().eq("id", id);
  if (error) {
    console.error("adminDeleteStory error:", error);
    throw new Error(error?.message || "Failed to delete story");
  }
}

/* =========================================================================
 * RATINGS
 * =======================================================================*/

export type AdminRatingInput = {
  game_title: string;
  img: string;
  score: number;
  subtitle?: string;

  slug?: string | null;
  summary?: string | null;

  developer?: string | null;
  publisher?: string | null;
  release_date?: string | null;
  platforms?: string[] | null;
  genres?: string[] | null;

  hours_main?: number | null;
  hours_main_plus?: number | null;
  hours_completionist?: number | null;
  hours_all_styles?: number | null;

  trailer_url?: string | null;
  gallery_images?: unknown[] | null;

  review_body?: string | null;
  reviewer_name?: string | null;
  reviewer_avatar_url?: string | null;
  verdict_label?: string | null;
};

export async function adminGetRatings(): Promise<RatingItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ratings")
    .select("id, slug, game_title, image_url, score, summary, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("adminGetRatings error:", error);
    return [];
  }

  return (data as Row[]).map(mapRatingRow);
}

export async function adminCreateRating(input: AdminRatingInput) {
  const supabase = await createClient();
  const baseTitle = (input.game_title || "").trim();

  const baseSlug =
    (input.slug && input.slug.trim()) || (baseTitle ? slugify(baseTitle) : null);

  const effectiveSlug = await ensureUniqueSlug(
    supabase as unknown as SupabaseLike,
    "ratings",
    baseSlug,
  );

  const { data, error } = await supabase
    .from("ratings")
    .insert({
      game_title: baseTitle,
      image_url: input.img,
      score: input.score,
      summary: input.subtitle ?? input.summary ?? null,
      slug: effectiveSlug,

      developer: input.developer ?? null,
      publisher: input.publisher ?? null,
      release_date: input.release_date ?? null,
      platforms: input.platforms ?? null,
      genres: input.genres ?? null,

      hours_main: input.hours_main ?? null,
      hours_main_plus: input.hours_main_plus ?? null,
      hours_completionist: input.hours_completionist ?? null,
      hours_all_styles: input.hours_all_styles ?? null,

      trailer_url: input.trailer_url ?? null,
      gallery_images: input.gallery_images ?? null,

      review_body: input.review_body ?? null,
      reviewer_name: input.reviewer_name ?? null,
      reviewer_avatar_url: input.reviewer_avatar_url ?? null,
      verdict_label: input.verdict_label ?? null,
    })
    .select("id, slug, game_title, image_url, score, summary, created_at")
    .single();

  if (error || !data) {
    console.error("adminCreateRating error:", error);
    throw new Error(error?.message || "Failed to create rating");
  }

  return mapRatingRow(data as Row);
}

export async function adminUpdateRating(id: string, input: AdminRatingInput) {
  const supabase = await createClient();
  const baseTitle = (input.game_title || "").trim();

  const baseSlug =
    (input.slug && input.slug.trim()) || (baseTitle ? slugify(baseTitle) : null);

  const effectiveSlug = await ensureUniqueSlug(
    supabase as unknown as SupabaseLike,
    "ratings",
    baseSlug,
    id,
  );

  const { data, error } = await supabase
    .from("ratings")
    .update({
      game_title: baseTitle,
      image_url: input.img,
      score: input.score,
      summary: input.subtitle ?? input.summary ?? null,
      slug: effectiveSlug,

      developer: input.developer ?? null,
      publisher: input.publisher ?? null,
      release_date: input.release_date ?? null,
      platforms: input.platforms ?? null,
      genres: input.genres ?? null,

      hours_main: input.hours_main ?? null,
      hours_main_plus: input.hours_main_plus ?? null,
      hours_completionist: input.hours_completionist ?? null,
      hours_all_styles: input.hours_all_styles ?? null,

      trailer_url: input.trailer_url ?? null,
      gallery_images: input.gallery_images ?? null,

      review_body: input.review_body ?? null,
      reviewer_name: input.reviewer_name ?? null,
      reviewer_avatar_url: input.reviewer_avatar_url ?? null,
      verdict_label: input.verdict_label ?? null,
    })
    .eq("id", id)
    .select("id, slug, game_title, image_url, score, summary, created_at")
    .single();

  if (error || !data) {
    console.error("adminUpdateRating error:", error);
    throw new Error(error?.message || "Failed to update rating");
  }

  return mapRatingRow(data as Row);
}

export async function adminDeleteRating(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ratings").delete().eq("id", id);
  if (error) {
    console.error("adminDeleteRating error:", error);
    throw new Error(error?.message || "Failed to delete rating");
  }
}

/* =========================================================================
 * HERO SLIDES
 * =======================================================================*/

export async function adminGetHeroSlides(): Promise<HeroSlideItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hero_slides")
    .select("id, image_url, title, link_url, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("adminGetHeroSlides error:", error);
    return [];
  }

  return (data as Row[]).map(mapHeroRow);
}

export async function adminCreateHeroSlide(input: {
  img: string;
  title?: string;
  link_url?: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hero_slides")
    .insert({
      image_url: input.img,
      title: input.title ?? null,
      link_url: input.link_url ?? null,
    })
    .select("id, image_url, title, link_url, created_at")
    .single();

  if (error || !data) {
    console.error("adminCreateHeroSlide error:", error);
    throw new Error(error?.message || "Failed to create hero slide");
  }

  return mapHeroRow(data as Row);
}

export async function adminUpdateHeroSlide(
  id: string,
  input: { img: string; title?: string; link_url?: string },
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hero_slides")
    .update({
      image_url: input.img,
      title: input.title ?? null,
      link_url: input.link_url ?? null,
    })
    .eq("id", id)
    .select("id, image_url, title, link_url, created_at")
    .single();

  if (error || !data) {
    console.error("adminUpdateHeroSlide error:", error);
    throw new Error(error?.message || "Failed to update hero slide");
  }

  return mapHeroRow(data as Row);
}

export async function adminDeleteHeroSlide(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("hero_slides").delete().eq("id", id);
  if (error) {
    console.error("adminDeleteHeroSlide error:", error);
    throw new Error(error?.message || "Failed to delete hero slide");
  }
}

/* =========================================================================
 * PLAYERS GAME OF THE MONTH
 * =======================================================================*/

export async function adminGetPlayersGameOfMonth(): Promise<
  PlayersGameOfMonthItem[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("players_game_of_month")
    .select(
      "id, position, title, image_url, link_url, total_votes, votes_link_url, month_label, created_at",
    )
    .order("position", { ascending: true });

  if (error || !data) {
    console.error("adminGetPlayersGameOfMonth error:", error);
    return [];
  }

  return (data as Row[]).map(mapPlayersGameRow);
}

export type AdminPlayersGameOfMonthInput = {
  position: number; // 1..5
  title?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  total_votes?: number | null;
  votes_link_url?: string | null;
  month_label?: string | null;
};

export async function adminUpsertPlayersGameOfMonth(
  input: AdminPlayersGameOfMonthInput,
): Promise<PlayersGameOfMonthItem> {
  const supabase = await createClient();

  const payload = {
    position: input.position,
    title: input.title ?? null,
    image_url: input.image_url ?? null,
    link_url: input.link_url ?? null,
    total_votes: input.total_votes ?? null,
    votes_link_url: input.votes_link_url ?? null,
    month_label: input.month_label ?? null,
  };

  const { data, error } = await supabase
    .from("players_game_of_month")
    .upsert(payload, { onConflict: "position" })
    .select(
      "id, position, title, image_url, link_url, total_votes, votes_link_url, month_label, created_at",
    )
    .single();

  if (error || !data) {
    console.error("adminUpsertPlayersGameOfMonth error:", error);
    throw new Error(error?.message || "Failed to save Players game of the month");
  }

  return mapPlayersGameRow(data as Row);
}

export async function adminDeletePlayersGameOfMonth(
  input: string | { id?: string | null; position?: number | null },
) {
  const supabase = await createClient();

  if (typeof input === "string") {
    const { error } = await supabase
      .from("players_game_of_month")
      .delete()
      .eq("id", input);
    if (error)
      throw new Error(
        error?.message || "Failed to delete Players game of the month item",
      );
    return;
  }

  const id = input?.id ?? null;
  const position = input?.position ?? null;

  if (id) {
    const { error } = await supabase
      .from("players_game_of_month")
      .delete()
      .eq("id", id);
    if (error)
      throw new Error(
        error?.message || "Failed to delete Players game of the month item",
      );
    return;
  }

  if (typeof position === "number") {
    const { error } = await supabase
      .from("players_game_of_month")
      .delete()
      .eq("position", position);
    if (error)
      throw new Error(
        error?.message || "Failed to delete Players game of the month item",
      );
    return;
  }

  throw new Error("Delete requires an id or position.");
}

/* =========================================================================
 * ✅ UPCOMING GAMES (calendar image REMOVED)
 * =======================================================================*/

export async function adminGetUpcomingGames(
  year: number,
): Promise<UpcomingGameItem[]> {
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
    console.error("adminGetUpcomingGames error:", error);
    return [];
  }

  return (data as Row[]).map(mapUpcomingGameRow);
}

export type AdminUpcomingGameInput = {
  id?: string | null;
  year: number;
  month: number; // 1..12, 13=TBA
  day?: number | null;
  title: string;
  studio?: string | null;
  platforms?: string[] | null;
  link_url?: string | null;

  details_html?: string | null;
  sort_order?: number | null;
};

export async function adminUpsertUpcomingGame(
  input: AdminUpcomingGameInput,
): Promise<UpcomingGameItem> {
  const supabase = await createClient();

  const payload = {
    year: Number(input.year),
    month: Number(input.month),
    day: input.day === undefined ? null : input.day,
    title: (input.title || "").trim(),
    studio: input.studio?.trim() || null,
    platforms: input.platforms ?? null,
    link_url: input.link_url?.trim() || null,

    details_html: input.details_html ?? null,
    sort_order: input.sort_order == null ? 0 : Number(input.sort_order),
  };

  if (!payload.title) throw new Error("Title is required.");

  if (input.id) {
    const { data, error } = await supabase
      .from("upcoming_games")
      .update(payload)
      .eq("id", input.id)
      .select(
        "id, year, month, day, title, studio, platforms, link_url, details_html, sort_order, created_at",
      )
      .single();

    if (error || !data) {
      console.error("adminUpsertUpcomingGame(update) error:", error);
      throw new Error(error?.message || "Failed to update upcoming game");
    }
    return mapUpcomingGameRow(data as Row);
  }

  const { data, error } = await supabase
    .from("upcoming_games")
    .insert(payload)
    .select(
      "id, year, month, day, title, studio, platforms, link_url, details_html, sort_order, created_at",
    )
    .single();

  if (error || !data) {
    console.error("adminUpsertUpcomingGame(insert) error:", error);
    throw new Error(error?.message || "Failed to create upcoming game");
  }

  return mapUpcomingGameRow(data as Row);
}

export async function adminDeleteUpcomingGame(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("upcoming_games").delete().eq("id", id);
  if (error) {
    console.error("adminDeleteUpcomingGame error:", error);
    throw new Error(error?.message || "Failed to delete upcoming game");
  }
}
