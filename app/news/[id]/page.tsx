// app/news/[id]/page.tsx
import Image from "next/image";
import Link from "next/link";

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { adminGetRatings } from "@/lib/actions/admin-content";
import ShareButtons from "@/components/ShareButton";

import SocialEmbed, { type EmbedSize as SocialEmbedSize } from "@/components/SocialEmbed";
import StoryGallery from "@/components/StoryGallery";

type PageParams = { id: string };

type PageProps = {
  params: PageParams | Promise<PageParams>;
};

type CardVariant = "default" | "compact" | "featured";
type CardMediaType = "none" | "video" | "imageGrid";
type CardLayout = "mediaTop" | "mediaBottom" | "mediaLeft" | "mediaRight";
type CardMediaSizeMode = "fixed" | "flex";
type CardWidth = "narrow" | "full";

type StoryBlock =
  | { id?: string; type: "paragraph"; text: string }
  | { id?: string; type: "heading"; level: 2 | 3; text: string }
  | { id?: string; type: "image"; url: string; caption?: string }
  | { id?: string; type: "quote"; text: string }
  | { id?: string; type: "embed"; url: string; title?: string; size?: SocialEmbedSize }
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

/* ------------------------------------------------------------------ */
/* Shared helper – fetch by id OR slug                                */
/* ------------------------------------------------------------------ */

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

type StoryRow = {
  id: string;
  slug: string | null;
  title: string | null;
  subtitle: string | null;
  summary: string | null;
  body: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
  content_blocks: unknown;
  meta_title: string | null;
  meta_description: string | null;
  author_name: string | null;
  author_role: string | null;
  author_avatar_url: string | null;
  reviewed_by: string | null;
};

async function fetchStoryByIdOrSlug(idOrSlug: string) {
  const supabase = await createClient();

  const baseSelect = supabase.from("top_stories").select(`
      id,
      slug,
      title,
      subtitle,
      summary,
      body,
      image_url,
      created_at,
      updated_at,
      content_blocks,
      meta_title,
      meta_description,
      author_name,
      author_role,
      author_avatar_url,
      reviewed_by
    `);

  const isUuid = looksLikeUuid(idOrSlug);

  const query = isUuid ? baseSelect.eq("id", idOrSlug) : baseSelect.eq("slug", idOrSlug);

  const { data, error } = await query.maybeSingle();
  return { data: data as StoryRow | null, error };
}

/* ------------------------------------------------------------------ */
/* SEO metadata                                                       */
/* ------------------------------------------------------------------ */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { id } = resolvedParams;

  const { data } = await fetchStoryByIdOrSlug(id);

  if (!data) {
    return {
      title: "News article | Checkpoint",
      description: "Game news and reviews on Checkpoint.",
    };
  }

  const siteName = "Checkpoint";

  const rawTitle = data.meta_title ?? data.title ?? "News article";
  const fullTitle = `${rawTitle} | ${siteName}`;

  const rawDescription =
    data.meta_description ??
    data.summary ??
    data.subtitle ??
    (typeof data.body === "string" ? data.body.replace(/[#_*`>]/g, "").slice(0, 160) : null) ??
    "Game news and reviews on Checkpoint.";

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const pathSegment = data.slug ?? String(data.id);
  const canonicalUrl = `${baseUrl}/news/${pathSegment}`;

  const authorName = data.author_name ?? null;

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
      images: data.image_url
        ? [
            {
              url: data.image_url,
              alt: rawTitle,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: rawDescription,
      images: data.image_url ? [data.image_url] : undefined,
    },
    authors: authorName ? [{ name: authorName }] : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseJson<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

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

function isEmbedSize(v: unknown): v is SocialEmbedSize {
  return v === "default" || v === "wide" || v === "compact";
}

/* ------------------------------------------------------------------ */
/* Page component                                                     */
/* ------------------------------------------------------------------ */

export default async function NewsArticlePage({ params }: PageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { id } = resolvedParams;

  const { data, error } = await fetchStoryByIdOrSlug(id);

  if (error || !data) {
    console.error("news page error", error);
    notFound();
  }

  if (id === String(data.id) && data.slug) {
    redirect(`/news/${data.slug}`);
  }

  const articleId = data.id;
  const articleTitle = String(data.title ?? "Article");
  const publishedDate = new Date(data.created_at).toLocaleDateString();
  const updatedDate = data.updated_at ? new Date(data.updated_at).toLocaleDateString() : null;

  const authorName = data.author_name ?? null;
  const authorRole = data.author_role ?? null;
  const authorAvatar = data.author_avatar_url || "/default.jpg";
  const reviewedBy = data.reviewed_by ?? null;

  const heroImageUrl = data.image_url && data.image_url.trim() !== "" ? data.image_url : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const articlePath = data.slug ? `/news/${data.slug}` : `/news/${data.id}`;
  const articleUrl = `${siteUrl}${articlePath}`;

  let blocks: StoryBlock[] = [];

  const parsedBlocks = parseJson<StoryBlock[]>(data.content_blocks);
  if (Array.isArray(parsedBlocks)) {
    blocks = parsedBlocks;
  }

  if (blocks.length === 0) {
    const bodyText = data.summary ?? data.subtitle ?? "";
    const paragraphs = bodyText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    blocks = paragraphs.map((p) => ({ type: "paragraph", text: p }));
  }

  const supabase = await createClient();

  type MoreStoryRow = {
    id: string;
    slug: string | null;
    title: string;
    subtitle: string | null;
    image_url: string | null;
    created_at: string;
  };

  const { data: moreStoriesRaw } = await supabase
    .from("top_stories")
    .select("id, slug, title, subtitle, image_url, created_at")
    .neq("id", articleId)
    .order("created_at", { ascending: false })
    .limit(10);

  const moreStories =
    (moreStoriesRaw as MoreStoryRow[] | null)?.map((row) => ({
      id: row.id,
      slug: row.slug ?? null,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      img: row.image_url && row.image_url.trim() !== "" ? row.image_url : null,
    })) ?? [];

  const allRatings = await adminGetRatings();
  const sidebarRatings = allRatings.slice(0, 10);

  function renderBlock(block: StoryBlock, index: number) {
    const key = typeof block.id === "string" && block.id ? block.id : index;

    switch (block.type) {
      case "heading": {
        const level = "level" in block && (block.level === 2 || block.level === 3) ? block.level : 2;
        const text = "text" in block && typeof block.text === "string" ? block.text : "";
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
        const text = "text" in block && typeof block.text === "string" ? block.text : "";
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
        const url = "url" in block && typeof block.url === "string" ? block.url : "";
        const caption = "caption" in block && typeof block.caption === "string" ? block.caption : "";
        if (!url) return null;

        return (
          <figure key={key} className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            <div className="relative w-full aspect-[16/9]">
              <Image
                src={url}
                alt={caption || articleTitle}
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
        const text = "text" in block && typeof block.text === "string" ? block.text : "";
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
        const url = "url" in block && typeof block.url === "string" ? block.url : "";
        if (!url) return null;

        const title = "title" in block && typeof block.title === "string" ? block.title : undefined;
        const sizeRaw = "size" in block ? block.size : undefined;
        const size = isEmbedSize(sizeRaw) ? sizeRaw : undefined;

        return <SocialEmbed key={key} url={url} title={title} size={size} />;
      }

      case "gallery": {
        const title = "title" in block && typeof block.title === "string" ? block.title : "";
        const images = "images" in block && Array.isArray(block.images)
          ? block.images.filter((img) => img && typeof img.url === "string" && img.url)
          : [];

        if (images.length === 0) return null;

        const galleryImages = images.map((img, imgIndex) => ({
          id: typeof img.id === "string" && img.id ? img.id : `${key}-${imgIndex}`,
          url: img.url,
          caption: typeof img.caption === "string" ? img.caption : undefined,
        }));

        const withBackground = "withBackground" in block ? Boolean(block.withBackground) : false;

        return (
          <div key={key} className="mt-6 space-y-2">
            {title && <h3 className="text-xl sm:text-[20px] font-semibold text-white break-words">{title}</h3>}
            <StoryGallery images={galleryImages} withBackground={withBackground} />
          </div>
        );
      }

      case "card": {
        const title = "title" in block && typeof block.title === "string" ? block.title : "";
        const bodyRaw =
          "body" in block && typeof block.body === "string"
            ? block.body
            : "text" in block && typeof block.text === "string"
              ? block.text
              : "";

        const rawLinkUrl = "linkUrl" in block && typeof block.linkUrl === "string" ? block.linkUrl : "";
        const linkUrl = rawLinkUrl ? normalizeUrl(rawLinkUrl) : "";
        const linkLabel = "linkLabel" in block && typeof block.linkLabel === "string" ? block.linkLabel : "Learn more";

        const variant: CardVariant =
          "variant" in block && (block.variant === "compact" || block.variant === "featured")
            ? block.variant
            : "default";

        const mediaType: CardMediaType =
          "mediaType" in block && (block.mediaType === "video" || block.mediaType === "imageGrid")
            ? block.mediaType
            : "none";

        const cardWidth: CardWidth = "cardWidth" in block && block.cardWidth === "full" ? "full" : "narrow";

        const layout: CardLayout =
          "layout" in block &&
          (block.layout === "mediaBottom" || block.layout === "mediaLeft" || block.layout === "mediaRight")
            ? block.layout
            : "mediaTop";

        const videoUrl = "videoUrl" in block && typeof block.videoUrl === "string" ? block.videoUrl : undefined;
        const embedUrl = mediaType === "video" ? getYouTubeEmbedUrl(videoUrl) : null;

        const imageUrls: string[] =
          "imageUrls" in block && Array.isArray(block.imageUrls)
            ? block.imageUrls.filter((u): u is string => typeof u === "string" && Boolean(u))
            : [];

        const imageLayout: "row" | "grid" =
          "imageLayout" in block && block.imageLayout === "grid" ? "grid" : "row";

        if (!title && !bodyRaw && imageUrls.length === 0 && !embedUrl) return null;

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
            {bodyRaw && (
              <div className="text-xs sm:text-sm text-white/80 mb-1 whitespace-pre-wrap break-all">
                <div dangerouslySetInnerHTML={{ __html: bodyRaw }} />
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

        const inner =
          layout === "mediaLeft" || layout === "mediaRight" ? (
            <div className='after:content-[""] after:block after:clear-both'>
              {media && (
                <div
                  className={
                    layout === "mediaRight"
                      ? "float-right ml-4 mb-2 w-24 sm:w-32"
                      : "float-left mr-4 mb-2 w-24 sm:w-32"
                  }
                >
                  {media}
                </div>
              )}
              {textSection}
            </div>
          ) : (
            <div className={`flex flex-col gap-3 ${layout === "mediaBottom" ? "flex-col-reverse" : ""}`}>
              {media && <div>{media}</div>}
              <div className="space-y-1">{textSection}</div>
            </div>
          );

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

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 py-8">
      <Link href="/" className="inline-flex items-center text-xs sm:text-sm text-white/70 hover:text-white mb-4">
        ← Back to home
      </Link>

      <div className="grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] gap-8 xl:gap-12">
        <article className="space-y-5">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
            {heroImageUrl ? (
              <div className="relative w-full aspect-[16/9]">
                <Image
                  src={heroImageUrl}
                  alt={data.title ?? "Article image"}
                  fill
                  sizes="(min-width: 1200px) 900px, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="relative w-full aspect-[16/9] flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black text-xs text-white/50">
                No cover image
              </div>
            )}
          </div>

          <header className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] sm:text-xs uppercase tracking-wide text-white/60">
                {publishedDate}
                {updatedDate && updatedDate !== publishedDate && (
                  <>
                    {" / "}
                    <span className="normal-case text-white/70">updated {updatedDate}</span>
                  </>
                )}
              </p>
              <ShareButtons url={articleUrl} title={articleTitle} />
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight break-words">
              {data.title}
            </h1>

            {data.subtitle && (
              <p className="text-base sm:text-lg text-white/80 break-words whitespace-pre-line">
                {data.subtitle}
              </p>
            )}
          </header>

          <section className="mt-2 space-y-3">
            {blocks.length === 0 ? (
              <p className="text-sm text-white/70">No article content has been added yet.</p>
            ) : (
              blocks.map((block, idx) => renderBlock(block, idx))
            )}
          </section>

          {(authorName || authorRole || reviewedBy) && (
            <section className="mt-8">
              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/40 flex-shrink-0">
                    <Image src={authorAvatar} alt={authorName || "Author"} fill sizes="48px" className="object-cover" />
                  </div>

                  <div className="flex flex-col text-sm min-w-0">
                    {authorName && <span className="font-semibold leading-tight">By {authorName}</span>}
                    {authorRole && <span className="text-xs text-white/60 leading-tight">{authorRole}</span>}
                    <span className="mt-1 text-[11px] text-white/50">Published on {publishedDate}</span>
                    {reviewedBy && <span className="mt-1 text-[11px] text-white/50">Reviewed by {reviewedBy}</span>}
                  </div>
                </div>
              </div>
            </section>
          )}
        </article>

        <aside className="hidden space-y-6 lg:block">
          {moreStories.length > 0 && (
            <div className="bg-black/25 rounded-2xl border border-white/10 p-4">
              <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-white/80">More stories</h2>
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
                          No image
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

          {sidebarRatings.length > 0 && (
            <div className="bg-black/25 rounded-2xl border border-white/10 p-4">
              <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-white/80">Latest ratings</h2>
              <div className="space-y-3">
                {sidebarRatings.map((r) => (
                  <div key={r.id} className="flex gap-3 items-center bg-black/40 rounded-xl overflow-hidden border border-white/10">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image src={r.img} alt={r.game_title} fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 py-2 pr-3">
                      <p className="text-xs font-semibold line-clamp-2">{r.game_title}</p>
                      {r.subtitle && <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">{r.subtitle}</p>}
                    </div>
                    <div className="px-2 pr-3">
                      <span className="inline-flex items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold px-2 py-1">
                        {r.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-8 space-y-6 lg:hidden">
        {moreStories.length > 0 && (
          <div className="bg-black/25 rounded-2xl border border-white/10 p-4">
            <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-white/80">More stories</h2>
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
                        No image
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

        {sidebarRatings.length > 0 && (
          <div className="bg-black/25 rounded-2xl border border-white/10 p-4">
            <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-white/80">Latest ratings</h2>
            <div className="space-y-3">
              {sidebarRatings.map((r) => (
                <div key={r.id} className="flex gap-3 items-center bg-black/40 rounded-xl overflow-hidden border border-white/10">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image src={r.img} alt={r.game_title} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 py-2 pr-3">
                    <p className="text-xs font-semibold line-clamp-2">{r.game_title}</p>
                    {r.subtitle && <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">{r.subtitle}</p>}
                  </div>
                  <div className="px-2 pr-3">
                    <span className="inline-flex items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold px-2 py-1">
                      {r.score.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
