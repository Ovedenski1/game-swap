// app/ratings/[id]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { adminGetRatings } from "@/lib/actions/admin-content";
import StoryGallery from "@/components/StoryGallery";
import { SocialEmbed } from "@/components/SocialEmbed";

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
type EmbedSize = "default" | "wide" | "compact";

type ReviewBlock =
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
  | { [key: string]: any };

/* ------------------------------------------------------------------ */
/* Fetch helper – try slug first, then id                             */
/* ------------------------------------------------------------------ */

const ratingSelectColumns = `
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
`;

async function fetchRatingByIdOrSlug(idOrSlug: string) {
  const supabase = await createClient();
  const value = decodeURIComponent(idOrSlug);

  // 1) Try by slug
  let { data, error } = await supabase
    .from("ratings")
    .select(ratingSelectColumns)
    .eq("slug", value)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (data) {
    return { data, error: null };
  }

  // 2) Fallback: try by id
  const { data: byId, error: errorById } = await supabase
    .from("ratings")
    .select(ratingSelectColumns)
    .eq("id", value)
    .maybeSingle();

  return { data: byId ?? null, error: errorById ?? null };
}

/* ------------------------------------------------------------------ */
/* Metadata                                                           */
/* ------------------------------------------------------------------ */

export async function generateMetadata(
  { params }: PageProps,
): Promise<Metadata> {
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
  const rawTitle = `${data.game_title as string} review`;
  const fullTitle = `${rawTitle} | ${siteName}`;

  const rawDescription =
    (data.summary as string | null) ??
    (data.verdict_label as string | null) ??
    "Game reviews and ratings on GameLink.";

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pathSegment = (data.slug as string | null) ?? String(data.id);
  const canonicalUrl = `${baseUrl}/ratings/${pathSegment}`;

  const coverImage = (data.image_url as string | null) ?? null;

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
      images: coverImage
        ? [
            {
              url: coverImage,
              alt: rawTitle,
            },
          ]
        : undefined,
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
    if (u.hostname === "youtu.be" || u.hostname.endsWith("youtube.com")) {
      if (u.hostname === "youtu.be") {
        return `https://www.youtube.com/embed${u.pathname}`;
      }
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

/* ------------------------------------------------------------------ */
/* Block renderer                                                     */
/* ------------------------------------------------------------------ */

function renderBlock(block: ReviewBlock, index: number) {
  const key = (block as any).id ?? index;

  switch (block.type) {
    case "heading": {
      const level = (block as any).level ?? 2;
      const text = (block as any).text ?? "";
      if (!text) return null;

      const baseClasses =
        "mt-6 mb-2 font-extrabold tracking-tight text-white break-words";
      const h2Classes = "text-2xl sm:text-[26px]";
      const h3Classes = "text-xl sm:text-[20px]";

      if (level === 3) {
        return (
          <h3 key={key} className={`${baseClasses} ${h3Classes}`}>
            {text}
          </h3>
        );
      }
      return (
        <h2 key={key} className={`${baseClasses} ${h2Classes}`}>
          {text}
        </h2>
      );
    }

    case "paragraph": {
      const text = (block as any).text ?? "";
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
      const url = (block as any).url ?? "";
      const caption = (block as any).caption ?? "";
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
      const text = (block as any).text ?? "";
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
      const url = (block as any).url ?? "";
      const embedTitle = (block as any).title ?? "";
      const size = (block as any).size as EmbedSize | undefined;

      if (!url) return null;

      return (
        <SocialEmbed key={key} url={url} title={embedTitle} size={size} />
      );
    }

    case "gallery": {
      const b: any = block;
      const title = b.title ?? "";
      const images = Array.isArray(b.images)
        ? b.images.filter((img: any) => img && img.url)
        : [];
      const withBackground = b.withBackground ?? false;

      if (!images.length) return null;

      const galleryImages = images.map((img: any, imgIndex: number) => ({
        id: img.id ?? `${key}-${imgIndex}`,
        url: img.url,
        caption: img.caption,
      }));

      return (
        <div key={key} className="mt-6 space-y-2">
          {title && (
            <h3 className="text-xl sm:text-[20px] font-semibold text-white break-words">
              {title}
            </h3>
          )}
          <StoryGallery images={galleryImages} withBackground={withBackground} />
        </div>
      );
    }

    case "card": {
      const b: any = block;
      const title = b.title ?? "";
      const body = b.body ?? b.text ?? "";
      const rawLinkUrl = b.linkUrl ?? "";
      const linkUrl = rawLinkUrl ? normalizeUrl(rawLinkUrl) : "";
      const linkLabel = b.linkLabel || "Learn more";
      const variant: CardVariant = b.variant ?? "default";
      const mediaType: CardMediaType = b.mediaType ?? "none";
      const cardWidth: CardWidth = b.cardWidth === "full" ? "full" : "narrow";

      const layout: CardLayout =
        b.layout === "mediaBottom" ||
        b.layout === "mediaLeft" ||
        b.layout === "mediaRight"
          ? b.layout
          : "mediaTop";

      const videoUrl = b.videoUrl as string | undefined;
      const embedUrl =
        mediaType === "video" ? getYouTubeEmbedUrl(videoUrl) : null;

      const imageUrls: string[] = Array.isArray(b.imageUrls)
        ? b.imageUrls.filter(Boolean)
        : [];
      const imageLayout: "row" | "grid" =
        b.imageLayout === "grid" ? "grid" : "row";

      if (!title && !body && !imageUrls.length && !embedUrl) return null;

      const media =
        embedUrl ? (
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
          <div
            className={
              imageLayout === "grid"
                ? "grid grid-cols-3 gap-3"
                : "flex gap-3"
            }
          >
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
                    <label
                      htmlFor={modalId}
                      className="absolute inset-0 cursor-zoom-out"
                    />
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
          {title && (
            <h3 className="text-sm font-semibold text-white mb-1 break-words">
              {title}
            </h3>
          )}
          {body && (
            <div className="text-xs sm:text-sm text.white/80 mb-1 whitespace-pre-wrap break-all">
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

      let inner;

      if (layout === "mediaLeft" || layout === "mediaRight") {
        const floatClass =
          layout === "mediaRight"
            ? "float-right ml-4 mb-2 w-24 sm:w-32"
            : "float-left mr-4 mb-2 w-24 sm:w-32";

        inner = (
          <div className='after:content-[""] after:block after:clear-both'>
            {media && <div className={floatClass}>{media}</div>}
            {textSection}
          </div>
        );
      } else {
        inner = (
          <div
            className={`flex flex-col gap-3 ${
              layout === "mediaBottom" ? "flex-col-reverse" : "flex-col"
            }`}
          >
            {media && <div>{media}</div>}
            <div className="space-y-1">{textSection}</div>
          </div>
        );
      }

      const widthClass =
        cardWidth === "full" ? "w-full" : "w-full sm:max-w-md";

      return (
        <div key={key} className={widthClass}>
          <div className={cardVariantClasses(variant)}>{inner}</div>
        </div>
      );
    }

    case "divider":
      return (
        <hr
          key={key}
          className="my-6 border-t border-white/10 rounded-full"
        />
      );

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

  const supabase = await createClient();

  const { data: moreStoriesRaw } = await supabase
    .from("top_stories")
    .select("id, slug, title, subtitle, image_url, created_at")
    .order("created_at", { ascending: false })
    .limit(4);

  const moreStories =
    moreStoriesRaw?.map((row: any) => ({
      id: row.id as string,
      slug: (row.slug as string | null) ?? null,
      title: row.title as string,
      subtitle: (row.subtitle as string | null) ?? undefined,
      img:
        (row.image_url as string | null) &&
        (row.image_url as string).trim() !== ""
          ? (row.image_url as string)
          : null,
    })) ?? [];

  const allRatings = await adminGetRatings();
  const sidebarRatings = allRatings.slice(0, 3);

  const gameTitle = data.game_title as string;
  const createdDate = data.created_at
    ? new Date(data.created_at as string).toLocaleDateString()
    : "";

  const coverImage =
    (data.image_url as string | null) &&
    (data.image_url as string).trim() !== ""
      ? (data.image_url as string)
      : null;

  const score = data.score as number;
  const verdictLabel =
    (data.verdict_label as string | null) ?? "Review";

  const developer = (data.developer as string | null) ?? null;
  const publisher = (data.publisher as string | null) ?? null;
  const releaseDate = (data.release_date as string | null) ?? null;

  const platforms = Array.isArray(data.platforms)
    ? (data.platforms as string[])
    : [];
  const genres = Array.isArray(data.genres)
    ? (data.genres as string[])
    : [];

  const trailerEmbed = getYouTubeEmbedUrl(
    (data.trailer_url as string | null) ?? undefined,
  );

  const rawGallery = (data.gallery_images as any[] | null) ?? [];
  const galleryImages = rawGallery
    .filter((g) => g && g.url)
    .map((g, idx) => ({
      id: g.id ?? `g-${idx}`,
      url: g.url as string,
      caption: (g.caption as string | null) ?? undefined,
    }));

  const reviewerName = (data.reviewer_name as string | null) ?? null;
  const reviewerAvatar =
    (data.reviewer_avatar_url as string | null) || "/default.jpg";

  /* ---------- parse review_body: JSON blocks OR plain text ---------- */

  let blocks: ReviewBlock[] = [];
  const rawBody = data.review_body as string | null;

  if (rawBody && rawBody.trim()) {
    // Try JSON (new editor format)
    try {
      const parsed = JSON.parse(rawBody);
      if (Array.isArray(parsed)) {
        blocks = parsed as ReviewBlock[];
      } else {
        throw new Error("not array");
      }
    } catch {
      // Fallback: treat as plain text paragraphs (old format)
      const paragraphs = rawBody
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

      blocks = paragraphs.map(
        (p): ReviewBlock => ({
          type: "paragraph",
          text: p.replace(/\n/g, "<br />"),
        }),
      );
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-background text-white">
      <main className="flex-1 flex">
        <div className="flex-1 max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 flex">
          <div className="flex-1 bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-b-3xl flex flex-col">
            <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
              <Link
                href="/ratings"
                className="inline-flex items-center text-xs sm:text-sm text-white/70 hover:text-white mb-4"
              >
                ← Back to ratings
              </Link>

              <div className="grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] gap-8 xl:gap-12">
                {/* MAIN COLUMN */}
                <section className="space-y-6">
                  {/* HERO CARD */}
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="relative w-full md:w-[260px] aspect-[16/9] md:aspect-[4/3] rounded-xl overflow-hidden border border-white/15 bg-black/60">
                        {coverImage ? (
                          <Image
                            src={coverImage}
                            alt={gameTitle}
                            fill
                            sizes="(min-width: 1024px) 260px, 100vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                            No cover image
                          </div>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between gap-3 min-w-0">
                        <div className="space-y-2">
                          <p className="text-[11px] uppercase tracking-wide text-white/60">
                            {createdDate}
                          </p>
                          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight break-words">
                            {gameTitle}
                          </h1>

                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/70">
                            {developer && (
                              <span className="break-all">
                                <span className="text-white/50">
                                  Developer:
                                </span>{" "}
                                {developer}
                              </span>
                            )}
                            {publisher && (
                              <span className="break-all">
                                <span className="text-white/50">
                                  Publisher:
                                </span>{" "}
                                {publisher}
                              </span>
                            )}
                            {releaseDate && (
                              <span className="break-all">
                                <span className="text-white/50">
                                  Release:
                                </span>{" "}
                                {releaseDate}
                              </span>
                            )}
                          </div>

                          {(platforms.length > 0 || genres.length > 0) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {platforms.map((p) => (
                                <span
                                  key={`plat-${p}`}
                                  className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] break-words"
                                >
                                  {p}
                                </span>
                              ))}
                              {genres.map((g) => (
                                <span
                                  key={`genre-${g}`}
                                  className="rounded-full border border-purple-400/60 bg-purple-500/20 px-2 py-0.5 text-[11px] break-words"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500 text-xl font-bold shadow-[0_0_30px_rgba(248,113,113,0.7)]">
                            {typeof score === "number"
                              ? score.toFixed(1)
                              : "--"}
                          </div>
                          <div className="text-[11px] text-white/70">
                            <p className="text-[10px] uppercase tracking-wide">
                              GameLink score
                            </p>
                            <p className="break-words">
                              {verdictLabel || "Review"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HOW LONG TO BEAT */}
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-3 sm:p-4">
                    <h2 className="text-sm font-semibold">
                      How long to beat
                    </h2>
                    <div className="grid gap-2 grid-cols-2 md:grid-cols-4 text-center text-[11px]">
                      <div className="rounded-xl border border-white/10 bg-black/70 px-2 py-2">
                        <p className="text-[10px] uppercase text-white/50">
                          Main story
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {data.hours_main != null
                            ? `${data.hours_main} hrs`
                            : "--"}
                        </p>
                      </div>
                      <div className="rounded-xl border border.white/10 bg-black/70 px-2 py-2">
                        <p className="text-[10px] uppercase text-white/50">
                          Story + sides
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {data.hours_main_plus != null
                            ? `${data.hours_main_plus} hrs`
                            : "--"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/70 px-2 py-2">
                        <p className="text-[10px] uppercase text.white/50">
                          Completionist
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {data.hours_completionist != null
                            ? `${data.hours_completionist} hrs`
                            : "--"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/70 px-2 py-2">
                        <p className="text-[10px] uppercase text.white/50">
                          All styles
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {data.hours_all_styles != null
                            ? `${data.hours_all_styles} hrs`
                            : "--"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* MEDIA SECTION */}
                  {(trailerEmbed || galleryImages.length > 0) && (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-3 sm:p-4">
                      <h2 className="text-sm font-semibold">
                        Images & Screenshots
                      </h2>
                      {trailerEmbed && (
                        <div className="w-full max-w-2xl mx-auto aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                          <iframe
                            src={trailerEmbed}
                            title="Trailer"
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>
                      )}
                      {galleryImages.length > 0 && (
                        <StoryGallery
                          images={galleryImages}
                          withBackground
                        />
                      )}
                    </div>
                  )}

                  {/* REVIEW SECTION */}
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-3 sm:p-4">
                    <h2 className="text-sm font-semibold">
                      {verdictLabel || "Review"}
                    </h2>

                    {blocks.length === 0 ? (
                      <p className="text-sm text-white/70">
                        No review text has been added yet.
                      </p>
                    ) : (
                      <section className="mt-1 space-y-3">
                        {blocks.map((block, idx) => renderBlock(block, idx))}
                      </section>
                    )}

                    {(reviewerName || reviewerAvatar) && (
                      <div className="mt-5 border-t border-white/10 pt-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-8 w-8 overflow-hidden rounded-full border border-white/40 bg-black flex-shrink-0">
                            <Image
                              src={reviewerAvatar}
                              alt={reviewerName || "Reviewer"}
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          </div>
                          <div className="text-[11px]">
                            {reviewerName && (
                              <p className="font-semibold break-words">
                                {reviewerName}
                              </p>
                            )}
                            <p className="text-white/60">
                              GameLink reviewer
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* SIDEBAR (desktop) */}
                <aside className="hidden space-y-6 lg:block">
                  {moreStories.length > 0 && (
                    <div className="bg-black/25 rounded-2xl border border-white/10 p-4">
                      <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-white/80">
                        More stories
                      </h2>
                      <div className="space-y-3">
                        {moreStories.map((s) => (
                          <Link
                            key={s.id}
                            href={`/news/${s.slug || s.id}`}
                            className="flex gap-3 group"
                          >
                            <div className="relative w-20 h-14 rounded-md overflow-hidden bg-black/40 flex-shrink-0">
                              {s.img ? (
                                <Image
                                  src={s.img as string}
                                  alt={s.title}
                                  fill
                                  sizes="80px"
                                  className="object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white/40 border border-dashed border-white/20">
                                  No image
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold line-clamp-2 group-hover:text-white">
                                {s.title}
                              </p>
                              {s.subtitle && (
                                <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">
                                  {s.subtitle}
                                </p>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {sidebarRatings.length > 0 && (
                    <div className="bg-black/25 rounded-2xl border border-white/10 p-4">
                      <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-white/80">
                        Latest ratings
                      </h2>
                      <div className="space-y-3">
                        {sidebarRatings.map((r) => (
                          <Link
                            key={r.id}
                            href={`/ratings/${r.slug || r.id}`}
                            className="flex gap-3 items-center bg-black/40 rounded-xl overflow-hidden border border-white/10"
                          >
                            <div className="relative w-16 h-16 flex-shrink-0">
                              <Image
                                src={r.img}
                                alt={r.game_title}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0 py-2 pr-3">
                              <p className="text-xs font-semibold line-clamp-2">
                                {r.game_title}
                              </p>
                              {r.subtitle && (
                                <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">
                                  {r.subtitle}
                                </p>
                              )}
                            </div>
                            <div className="px-2 pr-3">
                              <span className="inline-flex items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold px-2 py-1">
                                {r.score.toFixed(1)}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </aside>
              </div>

              {/* MOBILE sidebar (below content) */}
              <div className="mt-8 space-y-6 lg:hidden">
                {moreStories.length > 0 && (
                  <div className="bg-black/25 rounded-2xl border border-white/10 p-4">
                    <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-white/80">
                      More stories
                    </h2>
                    <div className="space-y-3">
                      {moreStories.map((s) => (
                        <Link
                          key={s.id}
                          href={`/news/${s.slug || s.id}`}
                          className="flex gap-3 group"
                        >
                          <div className="relative w-20 h-14 rounded-md overflow-hidden bg-black/40 flex-shrink-0">
                            {s.img ? (
                              <Image
                                src={s.img as string}
                                alt={s.title}
                                fill
                                sizes="80px"
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white/40 border border-dashed border-white/20">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold line-clamp-2 group-hover:text-white">
                              {s.title}
                            </p>
                            {s.subtitle && (
                              <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">
                                {s.subtitle}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {sidebarRatings.length > 0 && (
                  <div className="bg-black/25 rounded-2xl border border-white/10 p-4">
                    <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-white/80">
                      Latest ratings
                    </h2>
                    <div className="space-y-3">
                      {sidebarRatings.map((r) => (
                        <Link
                          key={r.id}
                          href={`/ratings/${r.slug || r.id}`}
                          className="flex gap-3 items-center bg-black/40 rounded-xl overflow-hidden border border-white/10"
                        >
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <Image
                              src={r.img}
                              alt={r.game_title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 py-2 pr-3">
                            <p className="text-xs font-semibold line-clamp-2">
                              {r.game_title}
                            </p>
                            {r.subtitle && (
                              <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">
                                {r.subtitle}
                              </p>
                            )}
                          </div>
                          <div className="px-2 pr-3">
                            <span className="inline-flex items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold px-2 py-1">
                              {r.score.toFixed(1)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-navbar border-t border-border text-foreground text-center py-4 text-xs sm:text-sm font-medium">
        © {new Date().getFullYear()} GameLink — Built with ❤️ using Next.js
      </footer>
    </div>
  );
}
