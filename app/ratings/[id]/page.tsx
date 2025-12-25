// app/ratings/[id]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";
import { adminGetRatings } from "@/lib/actions/admin-content";
import StoryGallery from "@/components/StoryGallery";
import SocialEmbed, { type EmbedSize } from "@/components/SocialEmbed";
import { PlatformIcons } from "@/components/PlatformIcons";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type PageParams = { id: string };
type PageProps = { params: PageParams | Promise<PageParams> };

type CardVariant = "default" | "compact" | "featured";
type CardMediaType = "none" | "video" | "imageGrid";
type CardLayout = "mediaTop" | "mediaBottom" | "mediaLeft" | "mediaRight";
type CardMediaSizeMode = "fixed" | "flex";
type CardWidth = "narrow" | "full";

type ReviewBlock =
  | { id?: string; type: "media" }
  | { id?: string; type: "paragraph"; text: string }
  | { id?: string; type: "heading"; level: 2 | 3; text: string }
  | { id?: string; type: "image"; url: string; caption?: string }
  | { id?: string; type: "quote"; text: string }
  | { id?: string; type: "embed"; url: string; title?: string; size?: EmbedSize }
  | {
      id?: string;
      type: "card";
      title: string;
      body?: string;
      text?: string;
      linkUrl?: string;
      linkLabel?: string;
      variant?: CardVariant;
      mediaType?: CardMediaType;
      layout?: CardLayout;
      mediaSizeMode?: CardMediaSizeMode;
      videoUrl?: string;
      imageUrls?: string[];
      imageLayout?: "row" | "grid";
      cardWidth?: CardWidth;
    }
  | {
      id?: string;
      type: "gallery";
      title?: string;
      images: { id?: string; url: string; caption?: string }[];
      withBackground?: boolean;
    }
  | { id?: string; type: "divider" }
  | { id?: string; type?: string; [key: string]: unknown };

type RatingRow = {
  id: string;
  slug: string | null;
  game_title: string | null;
  score: number | null;
  summary: string | null;
  image_url: string | null;
  developer: string | null;
  publisher: string | null;
  release_date: string | null;
  platforms: unknown;
  genres: unknown;
  hours_main: number | null;
  hours_main_plus: number | null;
  hours_completionist: number | null;
  hours_all_styles: number | null;
  trailer_url: string | null;
  gallery_images: unknown;
  review_body: string | null;
  reviewer_name: string | null;
  reviewer_avatar_url: string | null;
  verdict_label: string | null;
  created_at: string;
};

type RatingSummary = {
  id: string;
  slug?: string | null;
  img: string;
  game_title: string;
  subtitle?: string | null;
  score: number;
};

type MoreStoryRow = {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  created_at: string;
};

/* ------------------------------------------------------------------ */
/* Safe helpers                                                       */
/* ------------------------------------------------------------------ */

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function getOptionalString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function isEmbedSize(v: unknown): v is EmbedSize {
  return v === "default" || v === "wide" || v === "compact";
}

/* ------------------------------------------------------------------ */
/* Fetch helper – id OR slug                                          */
/* ------------------------------------------------------------------ */

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function fetchRatingByIdOrSlug(idOrSlug: string) {
  const supabase = await createClient();

  const baseSelect = supabase.from("ratings").select(`
      id,
      slug,
      game_title,
      score,
      summary,
      image_url,
      developer,
      publisher,
      release_date,
      platforms,
      genres,
      hours_main,
      hours_main_plus,
      hours_completionist,
      hours_all_styles,
      trailer_url,
      gallery_images,
      review_body,
      reviewer_name,
      reviewer_avatar_url,
      verdict_label,
      created_at
    `);

  const isUuid = looksLikeUuid(idOrSlug);
  const query = isUuid ? baseSelect.eq("id", idOrSlug) : baseSelect.eq("slug", idOrSlug);

  const { data, error } = await query.maybeSingle();
  return { data: data as RatingRow | null, error };
}

/* ------------------------------------------------------------------ */
/* Metadata                                                           */
/* ------------------------------------------------------------------ */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { id } = resolvedParams;

  const { data } = await fetchRatingByIdOrSlug(id);

  if (!data) {
    return {
      title: "Game rating | GameLink",
      description: "Game reviews and ratings on GameLink.",
    };
  }

  const siteName = "GameLink";
  const rawTitle = `${String(data.game_title ?? "Game")} review`;
  const fullTitle = `${rawTitle} | ${siteName}`;

  const rawDescription =
    data.summary ??
    data.verdict_label ??
    "Game reviews and ratings on GameLink.";

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pathSegment = data.slug ?? String(data.id);
  const canonicalUrl = `${baseUrl}/ratings/${pathSegment}`;

  const coverImage = data.image_url ?? null;

  return {
    title: fullTitle,
    description: rawDescription,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: fullTitle,
      description: rawDescription,
      url: canonicalUrl,
      type: "article",
      siteName,
      images: coverImage ? [{ url: coverImage, alt: rawTitle }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: rawDescription,
      images: coverImage ? [coverImage] : undefined,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                      */
/* ------------------------------------------------------------------ */

function getYouTubeEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;

    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeUrl(raw: string): string {
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function cardVariantClasses(variant: string | undefined) {
  const base =
    "mt-4 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm transition-all shadow-[0_14px_40px_rgba(0,0,0,0.45)]";
  switch (variant) {
    case "compact":
      return `${base} text-xs sm:text-sm py-3 px-3`;
    case "featured":
      return `${base} border-lime-400/70 shadow-[0_0_40px_rgba(190,242,100,0.4)]`;
    case "default":
    default:
      return base;
  }
}

function splitByMedia(blocks: ReviewBlock[]) {
  const idx = blocks.findIndex((b) => b?.type === "media");
  const before = idx >= 0 ? blocks.slice(0, idx).filter((b) => b?.type !== "media") : [];
  const after =
    idx >= 0
      ? blocks.slice(idx + 1).filter((b) => b?.type !== "media")
      : blocks.filter((b) => b?.type !== "media");
  const hasMarker = idx >= 0;
  return { before, after, hasMarker };
}

function stripHtml(html: string) {
  return (html || "").replace(/<[^>]*>/g, " ");
}
function normalizeText(s: string) {
  return (s || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function trimTrailingEllipsis(s: string) {
  return (s || "").replace(/[.…]+$/g, "").trim();
}

/* ------------------------------------------------------------------ */
/* Score style helper                                                 */
/* ------------------------------------------------------------------ */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toTierScore(score: number) {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  return clamp(Math.round(score), 1, 10);
}

function getScoreBoxStyle(scoreValue: number | null) {
  if (!scoreValue) return { background: "#444", color: "#fff" } as const;

  if (scoreValue <= 3) return { background: "#b87333", color: "#111" } as const;
  if (scoreValue <= 6) return { background: "#cfd2d6", color: "#111" } as const;
  if (scoreValue <= 9) return { background: "#f3d05e", color: "#111" } as const;

  return {
    background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 35%, #22d3ee 100%)",
    color: "#fff",
  } as const;
}

/* ------------------------------------------------------------------ */
/* Platforms filter                                                   */
/* ------------------------------------------------------------------ */

const ALLOWED_PLATFORMS = new Set<string>([
  "PC",
  "PS5",
  "PS4",
  "Xbox Series X|S",
  "Xbox One",
  "Nintendo Switch",
  "Nintendo Switch 2",
]);

function filterPlatforms(input: string[]): string[] {
  const cleaned = (input ?? []).map((p) => String(p || "").trim()).filter(Boolean);

  const out: string[] = [];
  for (const p of cleaned) {
    if (!ALLOWED_PLATFORMS.has(p)) continue;
    if (out.includes(p)) continue;
    out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Genres inline                                                      */
/* ------------------------------------------------------------------ */

function GenresInline({ genres }: { genres: string[] }) {
  const clean = (genres ?? []).map((g) => String(g || "").trim()).filter(Boolean);
  if (!clean.length) return null;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-white/75">
      {clean.map((g) => (
        <span key={`genre-inline-${g}`} className="font-semibold tracking-wide whitespace-nowrap">
          {g}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Block renderer (non-media)                                         */
/* ------------------------------------------------------------------ */

function renderBlock(block: ReviewBlock, index: number) {
  const key = typeof block.id === "string" && block.id ? block.id : index;

  switch (block.type) {
    case "media":
      return null;

    case "heading": {
      const level = block.level ?? 2;
      const text = getString(block.text);
      if (!text) return null;

      const baseClasses = "mt-6 mb-2 font-extrabold tracking-tight text-white break-words";
      const h2Classes = "text-2xl sm:text-[26px]";
      const h3Classes = "text-xl sm:text-[20px]";

      return level === 3 ? (
        <h3 key={key} className={`${baseClasses} ${h3Classes}`}>
          {text}
        </h3>
      ) : (
        <h2 key={key} className={`${baseClasses} ${h2Classes}`}>
          {text}
        </h2>
      );
    }

    case "paragraph": {
      const text = getString(block.text);
      if (!text) return null;
      return (
        <div
          key={key}
          className="text-sm sm:text-base leading-relaxed text-white/85 whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: text }}
        />
      );
    }

    case "image": {
      const url = getString(block.url);
      const caption = getString(block.caption);
      if (!url) return null;

      return (
        <figure
          key={key}
          className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40"
        >
          <div className="relative w-full aspect-[16/9]">
            <Image
              src={url}
              alt={caption || "Screenshot"}
              fill
              sizes="(min-width: 1200px) 900px, 100vw"
              className="object-cover"
            />
          </div>
          {caption && (
            <figcaption className="px-3 pb-3 pt-2 text-xs text-white/60 whitespace-pre-wrap break-words">
              <span dangerouslySetInnerHTML={{ __html: caption }} />
            </figcaption>
          )}
        </figure>
      );
    }

    case "quote": {
      const text = getString(block.text);
      if (!text) return null;
      return (
        <blockquote
          key={key}
          className="mt-4 border-l-4 border-lime-400/80 bg-black/40 px-4 py-3 text-sm italic text-white/90 rounded-r-xl whitespace-pre-wrap break-words"
        >
          <div dangerouslySetInnerHTML={{ __html: text }} />
        </blockquote>
      );
    }

    case "embed": {
      const url = getString(block.url);
      if (!url) return null;

      const title = getOptionalString(block.title);
      const size = isEmbedSize(block.size) ? block.size : undefined;

      return <SocialEmbed key={key} url={url} title={title} size={size} />;
    }

    case "gallery": {
      const title = getString(block.title);
      const images = Array.isArray(block.images)
        ? block.images.filter((img) => img && typeof img.url === "string" && Boolean(img.url))
        : [];

      if (!images.length) return null;

      const galleryImages = images.map((img, imgIndex) => ({
        id: typeof img.id === "string" && img.id ? img.id : `${key}-${imgIndex}`,
        url: img.url,
        caption: typeof img.caption === "string" ? img.caption : undefined,
      }));

      return (
        <div key={key} className="mt-6 space-y-2">
          {title && (
            <h3 className="text-xl sm:text-[20px] font-semibold text-white break-words">
              {title}
            </h3>
          )}
          <StoryGallery images={galleryImages} withBackground={Boolean(block.withBackground)} />
        </div>
      );
    }

    case "card": {
      const title = getString(block.title);
      const body = getString(block.body ?? block.text ?? "");
      const rawLinkUrl = getString(block.linkUrl);
      const linkUrl = rawLinkUrl ? normalizeUrl(rawLinkUrl) : "";
      const linkLabel = getString(block.linkLabel, "Learn more");

      const variant: CardVariant =
        block.variant === "compact" || block.variant === "featured" ? block.variant : "default";

      const mediaType: CardMediaType =
        block.mediaType === "video" || block.mediaType === "imageGrid" ? block.mediaType : "none";

      const cardWidth: CardWidth = block.cardWidth === "full" ? "full" : "narrow";

      const layout: CardLayout =
        block.layout === "mediaBottom" ||
        block.layout === "mediaLeft" ||
        block.layout === "mediaRight"
          ? block.layout
          : "mediaTop";

      const videoUrl = getOptionalString(block.videoUrl);
      const embedUrl = mediaType === "video" ? getYouTubeEmbedUrl(videoUrl) : null;

      const imageUrls: string[] = Array.isArray(block.imageUrls)
        ? block.imageUrls.filter((u): u is string => typeof u === "string" && Boolean(u))
        : [];

      const imageLayout: "row" | "grid" = block.imageLayout === "grid" ? "grid" : "row";

      if (!title && !body && imageUrls.length === 0 && !embedUrl) return null;

      const media = embedUrl ? (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60 aspect-video">
          <iframe
            src={embedUrl}
            title={title || "YouTube video"}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : mediaType === "imageGrid" && imageUrls.length > 0 ? (
        <div className={imageLayout === "grid" ? "grid grid-cols-3 gap-3" : "flex gap-3"}>
          {imageUrls.map((url, imgIndex) => {
            const modalId = `card-modal-${index}-${imgIndex}`;

            return (
              <div key={modalId} className="relative aspect-square w-full">
                <input type="checkbox" id={modalId} className="peer hidden" />

                <label
                  htmlFor={modalId}
                  className="block h-full w-full cursor-zoom-in overflow-hidden rounded-xl border border-white/15 bg-black/40"
                >
                  <Image
                    src={url}
                    alt={title || `Gallery image ${imgIndex + 1}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, 33vw"
                    className="object-cover"
                  />
                </label>

                <div className="fixed inset-0 z-40 hidden items-center justify-center bg-black/80 p-4 peer-checked:flex">
                  <label htmlFor={modalId} className="absolute inset-0 cursor-zoom-out" />
                  <div className="relative z-50 max-w-4xl w-full">
                    <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-black">
                      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9]">
                        <Image
                          src={url}
                          alt={title || `Gallery image ${imgIndex + 1}`}
                          fill
                          sizes="(min-width: 1024px) 900px, 100vw"
                          className="object-contain bg-black"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null;

      const textSection = (
        <>
          {title && <h3 className="text-sm font-semibold text-white mb-1 break-words">{title}</h3>}
          {body && (
            <div className="text-xs sm:text-sm text-white/80 mb-1 whitespace-pre-wrap break-all">
              <div dangerouslySetInnerHTML={{ __html: body }} />
            </div>
          )}
          {linkUrl && (
            <Link
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-medium text-lime-300 break-words"
            >
              <span dangerouslySetInnerHTML={{ __html: linkLabel }} />
              <span className="ml-1 text-[10px]">↗</span>
            </Link>
          )}
        </>
      );

      let inner: ReactNode;

      if (layout === "mediaLeft" || layout === "mediaRight") {
        const floatClass =
          layout === "mediaRight" ? "float-right ml-4 mb-2 w-24 sm:w-32" : "float-left mr-4 mb-2 w-24 sm:w-32";

        inner = (
          <div className='after:content-[""] after:block after:clear-both'>
            {media && <div className={floatClass}>{media}</div>}
            {textSection}
          </div>
        );
      } else {
        inner = (
          <div className={`flex flex-col gap-3 ${layout === "mediaBottom" ? "flex-col-reverse" : ""}`}>
            {media && <div>{media}</div>}
            <div className="space-y-1">{textSection}</div>
          </div>
        );
      }

      const widthClass = cardWidth === "full" ? "w-full" : "w-full sm:max-w-md";

      return (
        <div key={key} className={widthClass}>
          <div className={cardVariantClasses(variant)}>{inner}</div>
        </div>
      );
    }

    case "divider":
      return <hr key={key} className="my-6 border-t border-white/10 rounded-full" />;

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Page component                                                     */
/* ------------------------------------------------------------------ */

export default async function RatingDetailPage({ params }: PageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { id } = resolvedParams;

  const { data, error } = await fetchRatingByIdOrSlug(id);

  if (error || !data) {
    console.error("RatingDetailPage error", error);
    notFound();
  }

  if (looksLikeUuid(id) && data.slug && data.slug !== id) {
    redirect(`/ratings/${data.slug}`);
  }

  const supabase = await createClient();

  const { data: moreStoriesRaw } = await supabase
    .from("top_stories")
    .select("id, slug, title, subtitle, image_url, created_at")
    .order("created_at", { ascending: false })
    .limit(6);

  const moreStories =
    (moreStoriesRaw as MoreStoryRow[] | null)?.map((row) => ({
      id: row.id,
      slug: row.slug ?? null,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      img: row.image_url && row.image_url.trim() !== "" ? row.image_url : null,
    })) ?? [];

  const allRatings = (await adminGetRatings()) as RatingSummary[];
  const sidebarRatings = allRatings.slice(1, 8);

  const gameTitle = String(data.game_title ?? "");

  const createdDate = data.created_at ? new Date(data.created_at).toLocaleDateString("bg-BG") : "";

  const coverImage = data.image_url && data.image_url.trim() !== "" ? data.image_url : null;

  const score = typeof data.score === "number" ? data.score : 0;
  const verdictLabel = data.verdict_label ?? "Ревю";
  const summary = data.summary ?? null;

  const developer = data.developer ?? null;
  const publisher = data.publisher ?? null;

  const releaseDateRaw = data.release_date ?? null;
  const releaseDate = releaseDateRaw
    ? (() => {
        const d = new Date(releaseDateRaw);
        return Number.isNaN(d.getTime()) ? releaseDateRaw : d.toLocaleDateString("bg-BG");
      })()
    : null;

  const platformsRaw: string[] = Array.isArray(data.platforms)
    ? data.platforms.filter((p): p is string => typeof p === "string")
    : [];
  const platforms = filterPlatforms(platformsRaw);

  const genres: string[] = Array.isArray(data.genres)
    ? data.genres.filter((g): g is string => typeof g === "string")
    : [];

  const trailerEmbed = getYouTubeEmbedUrl(data.trailer_url ?? undefined);

  // gallery_images can be unknown (json)
  type GalleryImage = { id?: string; url: string; caption?: string };

  const galleryUnknown = data.gallery_images as unknown;
  const rawGallery: GalleryImage[] = Array.isArray(galleryUnknown)
    ? galleryUnknown
        .filter((g): g is GalleryImage => isRecord(g) && typeof g.url === "string" && Boolean(g.url))
        .map((g) => ({
          id: typeof g.id === "string" ? g.id : undefined,
          url: g.url,
          caption: typeof g.caption === "string" ? g.caption : undefined,
        }))
    : [];

  const galleryImages = rawGallery.map((g, idx) => ({
    id: g.id ?? `g-${idx}`,
    url: g.url,
    caption: g.caption,
  }));

  const reviewerName = data.reviewer_name ?? null;
  const reviewerAvatar = data.reviewer_avatar_url || "/default.jpg";

  let blocks: ReviewBlock[] = [];
  const rawBody = data.review_body;

  if (rawBody && rawBody.trim()) {
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (Array.isArray(parsed)) blocks = parsed as ReviewBlock[];
    } catch {
      // ignore
    }
  }

  const { before: blocksBeforeMediaRaw, after: blocksAfterMedia, hasMarker } = splitByMedia(blocks);

  const shouldShowMedia = Boolean(trailerEmbed || galleryImages.length > 0);

  let blocksBeforeMedia = blocksBeforeMediaRaw;

  if (summary && summary.trim() && blocksBeforeMediaRaw.length > 0) {
    const summaryCompare = normalizeText(trimTrailingEllipsis(summary));
    const first = blocksBeforeMediaRaw[0];
    if (first?.type === "paragraph") {
      const firstText = normalizeText(stripHtml(getString(first.text)));
      if (firstText && summaryCompare && firstText.startsWith(summaryCompare)) {
        blocksBeforeMedia = blocksBeforeMediaRaw.slice(1);
      }
    }
  }

  const tierScore = toTierScore(score);
  const scoreBoxStyle = getScoreBoxStyle(tierScore);

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link
          href="/ratings"
          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/5"
        >
          ← Обратно към ревютата
        </Link>

        {createdDate && (
          <div className="hidden sm:block text-xs text-white/50">Публикувано: {createdDate}</div>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] gap-8 xl:gap-12">
        {/* MAIN COLUMN */}
        <section className="space-y-8">
          {/* HERO CARD */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="relative w-full md:w-[155px] aspect-[2/3] max-h-[230px] rounded-xl overflow-hidden border border-white/15 bg-transparent">
                {coverImage ? (
                  <Image
                    src={coverImage}
                    alt={gameTitle}
                    fill
                    sizes="(min-width: 1024px) 155px, 60vw"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                    Няма корица
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col justify-start gap-4 min-w-0 pt-1">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-white/60">{createdDate}</p>

                  <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight break-words">
                    {gameTitle}
                  </h1>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-white/70">
                    {developer && (
                      <span className="break-all">
                        <span className="text-white/50">Разработчик:</span> {developer}
                      </span>
                    )}
                    {releaseDate && (
                      <span className="break-all">
                        <span className="text-white/50">Премиера:</span> {releaseDate}
                      </span>
                    )}
                    {publisher && (
                      <span className="break-all">
                        <span className="text-white/50">Издател:</span> {publisher}
                      </span>
                    )}
                  </div>

                  {platforms.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <PlatformIcons platforms={platforms} />
                    </div>
                  )}
                </div>

                {/* SCORE + GENRES */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-base sm:text-[15px] font-extrabold leading-none shadow-[0_0_30px_rgba(0,0,0,0.35)]"
                      style={{ background: scoreBoxStyle.background, color: scoreBoxStyle.color }}
                      title="Pokko Score"
                    >
                      {tierScore != null ? `${tierScore}/10` : "--/10"}
                    </div>

                    <div className="text-[12px] text-white/70">
                      <p className="text-[10px] uppercase tracking-wide">Pokko Score</p>
                    </div>
                  </div>

                  <GenresInline genres={genres} />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <h2 className="text-sm font-semibold mb-2">Колко време се играе</h2>

              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 text-center text-[11px]">
                <div className="rounded-xl border border-white/10 bg-black/30 px-2 py-2">
                  <p className="text-[10px] uppercase text-white/50">Основна история</p>
                  <p className="mt-1 text-sm font-semibold">
                    {data.hours_main != null ? `${data.hours_main} ч.` : "--"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 px-2 py-2">
                  <p className="text-[10px] uppercase text-white/50">История + странични</p>
                  <p className="mt-1 text-sm font-semibold">
                    {data.hours_main_plus != null ? `${data.hours_main_plus} ч.` : "--"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 px-2 py-2">
                  <p className="text-[10px] uppercase text-white/50">Завършване на 100%</p>
                  <p className="mt-1 text-sm font-semibold">
                    {data.hours_completionist != null ? `${data.hours_completionist} ч.` : "--"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 px-2 py-2">
                  <p className="text-[10px] uppercase text-white/50">Всички стилове</p>
                  <p className="mt-1 text-sm font-semibold">
                    {data.hours_all_styles != null ? `${data.hours_all_styles} ч.` : "--"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {summary && summary.trim() && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Обобщение</h2>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed whitespace-pre-wrap break-words">
                {summary}
              </p>
            </div>
          )}

          {hasMarker && blocksBeforeMedia.length > 0 && (
            <section className="space-y-3">{blocksBeforeMedia.map((b, idx) => renderBlock(b, idx))}</section>
          )}

          {shouldShowMedia && (
            <div className="space-y-3">
              {trailerEmbed && (
                <div className="w-full max-w-2xl mx-auto aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                  <iframe
                    src={trailerEmbed}
                    title="Трейлър"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}

              {galleryImages.length > 0 && <StoryGallery images={galleryImages} withBackground={false} />}
            </div>
          )}

          {blocksAfterMedia.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">{verdictLabel || "Ревю"}</h2>
              <section className="space-y-3">{blocksAfterMedia.map((b, idx) => renderBlock(b, idx))}</section>
            </div>
          )}

          {(reviewerName || reviewerAvatar) && (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/40 bg-black flex-shrink-0">
                  <Image src={reviewerAvatar} alt={reviewerName || "Автор"} fill sizes="40px" className="object-cover" />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-white/60">Редактирано от</p>
                  {reviewerName && <p className="text-sm font-semibold break-words">{reviewerName}</p>}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* SIDEBAR (desktop) */}
        <aside className="hidden space-y-6 lg:block">
          {sidebarRatings.length > 0 && (
            <div className="bg-black/25 rounded-2xl border border-white/10 p-4">
              <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-white/80">
                Последни ревюта
              </h2>
              <div className="space-y-3">
                {sidebarRatings.map((r) => (
                  <Link
                    key={r.id}
                    href={`/ratings/${r.slug || r.id}`}
                    className="flex gap-3 items-center bg-black/40 rounded-xl overflow-hidden border border-white/10"
                  >
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image src={r.img} alt={r.game_title} fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 py-2 pr-3">
                      <p className="text-xs font-semibold line-clamp-2">{r.game_title}</p>
                      {r.subtitle && (
                        <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">{r.subtitle}</p>
                      )}
                    </div>
                    <div className="px-2 pr-3">
                      <span className="inline-flex items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold px-2 py-1">
                        {Number.isFinite(r.score) ? r.score.toFixed(1) : "0.0"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {moreStories.length > 0 && (
            <div className="bg-black/25 rounded-2xl border border-white/10 p-4">
              <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-white/80">Още истории</h2>
              <div className="space-y-3">
                {moreStories.map((s) => (
                  <Link key={s.id} href={`/news/${s.slug || s.id}`} className="flex gap-3 group">
                    <div className="relative w-20 h-14 rounded-md overflow-hidden bg-black/40 flex-shrink-0">
                      {s.img ? (
                        <Image
                          src={s.img}
                          alt={s.title}
                          fill
                          sizes="80px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white/40 border border-dashed border-white/20">
                          Няма снимка
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold line-clamp-2 group-hover:text-white">{s.title}</p>
                      {s.subtitle && (
                        <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">{s.subtitle}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* MOBILE sidebar */}
      <div className="mt-8 space-y-6 lg:hidden">
        {sidebarRatings.length > 0 && (
          <div className="bg-black/25 rounded-2xl border border-white/10 p-4">
            <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-white/80">Последни ревюта</h2>
            <div className="space-y-3">
              {sidebarRatings.map((r) => (
                <Link
                  key={r.id}
                  href={`/ratings/${r.slug || r.id}`}
                  className="flex gap-3 items-center bg-black/40 rounded-xl overflow-hidden border border-white/10"
                >
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image src={r.img} alt={r.game_title} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 py-2 pr-3">
                    <p className="text-xs font-semibold line-clamp-2">{r.game_title}</p>
                    {r.subtitle && <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">{r.subtitle}</p>}
                  </div>
                  <div className="px-2 pr-3">
                    <span className="inline-flex items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold px-2 py-1">
                      {Number.isFinite(r.score) ? r.score.toFixed(1) : "0.0"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {moreStories.length > 0 && (
          <div className="bg-black/25 rounded-2xl border border-white/10 p-4">
            <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-white/80">Още истории</h2>
            <div className="space-y-3">
              {moreStories.map((s) => (
                <Link key={s.id} href={`/news/${s.slug || s.id}`} className="flex gap-3 group">
                  <div className="relative w-20 h-14 rounded-md overflow-hidden bg-black/40 flex-shrink-0">
                    {s.img ? (
                      <Image
                        src={s.img}
                        alt={s.title}
                        fill
                        sizes="80px"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white/40 border border-dashed border-white/20">
                        Няма снимка
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold line-clamp-2 group-hover:text-white">{s.title}</p>
                    {s.subtitle && <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">{s.subtitle}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
