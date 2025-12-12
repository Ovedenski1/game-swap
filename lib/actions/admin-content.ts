// lib/actions/admin-content.ts
"use server";

import { createClient } from "../supabase/server";
import type { NewsItem } from "@/components/NewsCard";

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
};

/* ---------- helpers ---------- */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Make sure a slug is unique inside a given table.
 * If the slug already exists, it will append -2, -3, ... etc.
 *
 * Example: "fallout-4", "fallout-4-2", "fallout-4-3"
 */
async function ensureUniqueSlug(
  supabase: any,
  table: "ratings" | "top_stories",
  baseSlug: string | null,
  currentId?: string | number,
): Promise<string | null> {
  if (!baseSlug) return null;

  const base = baseSlug;
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    let query = supabase
      .from(table)
      .select("id")
      .eq("slug", candidate)
      .limit(1);

    if (currentId != null) {
      query = query.neq("id", currentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("ensureUniqueSlug error", error);
      // fall back to candidate; DB unique constraint will still protect us
      return candidate;
    }

    if (!data || data.length === 0) {
      // no conflict → safe to use
      return candidate;
    }

    // conflict → try with suffix
    suffix += 1; // first conflict becomes -2
    candidate = `${base}-${suffix}`;
  }
}

/* ---------- mappers ---------- */

function mapStoryRow(row: any): NewsItem {
  const internalPath =
    row.slug ? `/news/${row.slug}` : row.id ? `/news/${row.id}` : undefined;

  return {
    id: row.id,
    title: row.title as string,
    img: row.image_url as string,
    href: row.link_url ?? internalPath,
    subtitle:
      (row.subtitle as string | null) ??
      (row.summary as string | null) ??
      undefined,
  };
}

function mapRatingRow(row: any): RatingItem {
  return {
    id: String(row.id),
    game_title: row.game_title as string,
    img: row.image_url as string,
    score: row.score as number,
    subtitle: (row.summary as string | null) ?? null,
    slug: (row.slug as string | null) ?? null,
  };
}

function mapHeroRow(row: any): HeroSlideItem {
  return {
    id: String(row.id),
    img: row.image_url as string,
    title: (row.title as string | null) ?? null,
  };
}

/* =========================================================================
 * STORIES
 * =======================================================================*/

export async function adminGetTopStories(): Promise<NewsItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("top_stories")
    .select(
      "id, slug, title, subtitle, summary, image_url, link_url, created_at",
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("adminGetTopStories error:", error);
    return [];
  }

  return data.map(mapStoryRow);
}

/* --------- TYPES for create/update story (with SEO + author) --------- */

export type AdminStoryInput = {
  title: string;
  img: string;
  href?: string;
  subtitle?: string;
  body?: string;
  extraImages?: string[];
  contentBlocks?: any[];

  slug?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;

  // author stuff
  authorName?: string | null;
  authorRole?: string | null;
  authorAvatarUrl?: string | null;
  reviewedBy?: string | null;

  // spoiler flag
  isSpoiler?: boolean;
};

/**
 * contentBlocks is OPTIONAL so the old simple admin form still works.
 */
export async function adminCreateStory(input: AdminStoryInput) {
  const supabase = await createClient();

  const baseTitle = (input.title || "").trim();

  // 1) create base slug (either from input.slug or from title)
  const baseSlug =
    (input.slug && input.slug.trim()) || (baseTitle ? slugify(baseTitle) : null);

  // 2) make sure it is unique in "top_stories"
  const effectiveSlug = await ensureUniqueSlug(
    supabase,
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
        input.extraImages && input.extraImages.length
          ? input.extraImages
          : null,
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
    .select(
      "id, slug, title, subtitle, summary, image_url, link_url, created_at",
    )
    .single();

  if (error || !data) {
    console.error("adminCreateStory error:", error);
    throw new Error(error?.message || "Failed to create story");
  }

  return mapStoryRow(data);
}

export async function adminUpdateStory(id: string, input: AdminStoryInput) {
  const supabase = await createClient();

  const baseTitle = (input.title || "").trim();

  // 1) create base slug
  const baseSlug =
    (input.slug && input.slug.trim()) || (baseTitle ? slugify(baseTitle) : null);

  // 2) ensure unique, but ignore this current row's id
  const effectiveSlug = await ensureUniqueSlug(
    supabase,
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
        input.extraImages && input.extraImages.length
          ? input.extraImages
          : null,
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
    .select(
      "id, slug, title, subtitle, summary, image_url, link_url, created_at",
    )
    .single();

  if (error || !data) {
    console.error("adminUpdateStory error:", error);
    throw new Error(error?.message || "Failed to update story");
  }

  return mapStoryRow(data);
}

export async function adminDeleteStory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("top_stories").delete().eq("id", id);

  if (error) {
    console.error("adminDeleteStory error:", error);
    throw new Error(error?.message || "Failed to delete story");
  }
}

// Type for the full story returned for editing
export type AdminStoryForEdit = {
  id: string | number;
  title: string;
  subtitle: string | null;
  img: string;
  href: string | null;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  body: string | null;
  extra_images: string[] | null;
  content_blocks: unknown; // stored JSON (our blocks)
};

/**
 * Load a single story for the visual editor.
 */
export async function adminGetStoryForEdit(
  id: string,
): Promise<AdminStoryForEdit | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("top_stories")
    .select(
      "id, title, subtitle, image_url, link_url, slug, meta_title, meta_description, body, extra_images, content_blocks",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("adminGetStoryForEdit error", error);
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    subtitle: data.subtitle,
    img: data.image_url,
    href: data.link_url,
    slug: data.slug,
    meta_title: data.meta_title,
    meta_description: data.meta_description,
    body: data.body,
    extra_images: data.extra_images,
    content_blocks: data.content_blocks,
  };
}

/* =========================================================================
 * RATINGS
 * =======================================================================*/

// IGN-style full rating input
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
  gallery_images?: any[] | null;

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

  return data.map(mapRatingRow);
}

export async function adminCreateRating(input: AdminRatingInput) {
  const supabase = await createClient();

  const baseTitle = (input.game_title || "").trim();

  // 1) base slug from input or title
  const baseSlug =
    (input.slug && input.slug.trim()) ||
    (baseTitle ? slugify(baseTitle) : null);

  // 2) ensure unique in "ratings"
  const effectiveSlug = await ensureUniqueSlug(
    supabase,
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

  return mapRatingRow(data);
}

export async function adminUpdateRating(
  id: string,
  input: AdminRatingInput,
) {
  const supabase = await createClient();

  const baseTitle = (input.game_title || "").trim();

  // 1) base slug from input or title
  const baseSlug =
    (input.slug && input.slug.trim()) ||
    (baseTitle ? slugify(baseTitle) : null);

  // 2) ensure unique, ignoring this rating's own id
  const effectiveSlug = await ensureUniqueSlug(
    supabase,
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

  return mapRatingRow(data);
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
 * HERO SLIDES (carousel)
 * =======================================================================*/

export async function adminGetHeroSlides(): Promise<HeroSlideItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hero_slides")
    .select("id, image_url, title, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("adminGetHeroSlides error:", error);
    return [];
  }

  return data.map(mapHeroRow);
}

export async function adminCreateHeroSlide(input: {
  img: string;
  title?: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hero_slides")
    .insert({
      image_url: input.img,
      title: input.title ?? null,
    })
    .select("id, image_url, title, created_at")
    .single();

  if (error || !data) {
    console.error("adminCreateHeroSlide error:", error);
    throw new Error(error?.message || "Failed to create hero slide");
  }

  return mapHeroRow(data);
}

export async function adminUpdateHeroSlide(
  id: string,
  input: { img: string; title?: string },
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hero_slides")
    .update({
      image_url: input.img,
      title: input.title ?? null,
    })
    .eq("id", id)
    .select("id, image_url, title, created_at")
    .single();

  if (error || !data) {
    console.error("adminUpdateHeroSlide error:", error);
    throw new Error(error?.message || "Failed to update hero slide");
  }

  return mapHeroRow(data);
}

export async function adminDeleteHeroSlide(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("hero_slides").delete().eq("id", id);

  if (error) {
    console.error("adminDeleteHeroSlide error:", error);
    throw new Error(error?.message || "Failed to delete hero slide");
  }
}
