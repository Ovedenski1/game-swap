"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { nanoid } from "nanoid";

import {
  adminCreateRating,
  adminUpdateRating,
} from "@/lib/actions/admin-content";
import type { RatingItem } from "@/lib/actions/admin-content";
import NewsImageUpload from "./NewsImageUpload";
import StoryGallery from "./StoryGallery";
import GalleryImageUpload from "./GalleryImageUpload";
import { SocialEmbed } from "./SocialEmbed";

/* ---------- basic helpers ---------- */

type RatingEditorProps = {
  mode: "create" | "edit";
  initial?: (RatingItem & { [key: string]: any }) | null;
};

type GalleryItem = { url: string; caption?: string };

type AdminAuthor = {
  id: string;
  name: string;
  role?: string | null;
  avatar_url?: string | null;
};

function parseList(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNumber(input: string): number | null {
  if (!input.trim()) return null;
  const n = Number(input);
  return Number.isNaN(n) ? null : n;
}

function getYouTubeEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return url;
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {
    return null;
  }
  return null;
}

function buildAutoSummary(body: string): string | null {
  const clean = body.trim();
  if (!clean) return null;
  if (clean.length <= 260) return clean;
  return clean.slice(0, 257) + "…";
}

/* ------------------------------------------------------------------ */
/* Rich text editor (B / I / U + color) for blocks                    */
/* ------------------------------------------------------------------ */

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [color, setColor] = useState<string>("#ffffff");
  const [internalHtml, setInternalHtml] = useState<string>(value || "");

  useEffect(() => {
    setInternalHtml(value || "");
  }, [value]);

  function exec(command: "bold" | "italic" | "underline") {
    document.execCommand(command, false);
  }

  function applyColor(c: string) {
    setColor(c);
    document.execCommand("foreColor", false, c);
  }

  function handleInput(e: React.FormEvent<HTMLDivElement>) {
    const html = (e.currentTarget as HTMLDivElement).innerHTML;
    setInternalHtml(html);
    onChange(html);
  }

  return (
    <div className="space-y-1 mb-2">
      {/* toolbar */}
      <div className="flex items-center gap-2 text-[11px] text-white/70">
        <button
          type="button"
          onClick={() => exec("bold")}
          className="rounded border border-white/30 px-2 py-0.5 font-bold hover:bg-white/10"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className="rounded border border-white/30 px-2 py-0.5 italic hover:bg-white/10"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => exec("underline")}
          className="rounded border border-white/30 px-2 py-0.5 underline hover:bg-white/10"
        >
          U
        </button>

        <span className="ml-2">Text color</span>
        <input
          type="color"
          value={color}
          onChange={(e) => applyColor(e.target.value)}
          className="h-4 w-4 cursor-pointer rounded border border-white/40 bg-transparent"
        />
      </div>

      {/* contenteditable box */}
      <div
        className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-2 text-xs min-h-[80px] whitespace-pre-wrap break-all focus:outline-none focus:ring-2 focus:ring-lime-400"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: internalHtml || "" }}
        data-placeholder={placeholder}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Block types (similar to StoryEditor)                               */
/* ------------------------------------------------------------------ */

type HeadingLevel = 2 | 3;

type ParagraphBlock = {
  id: string;
  type: "paragraph";
  text: string; // HTML
};

type HeadingBlock = {
  id: string;
  type: "heading";
  level: HeadingLevel;
  text: string;
};

type ImageBlock = {
  id: string;
  type: "image";
  url: string;
  caption: string;
};

type QuoteBlock = {
  id: string;
  type: "quote";
  text: string; // HTML
};

type DividerBlock = {
  id: string;
  type: "divider";
};

export type EmbedSize = "default" | "wide" | "compact";

type EmbedBlock = {
  id: string;
  type: "embed";
  url: string;
  title?: string;
  size?: EmbedSize;
};

type CardVariant = "default" | "compact" | "featured";
type CardMediaType = "none" | "video" | "imageGrid";
type CardLayout = "mediaTop" | "mediaBottom" | "mediaLeft" | "mediaRight";
type CardWidth = "narrow" | "full";

type CardBlock = {
  id: string;
  type: "card";
  title: string;
  body: string; // HTML
  linkUrl: string;
  linkLabel: string;
  variant: CardVariant;
  mediaType: CardMediaType;
  layout: CardLayout;
  videoUrl?: string;
  imageUrls?: string[];
  imageLayout?: "row" | "grid";
  cardWidth?: CardWidth;
};

type GalleryImage = {
  id: string;
  url: string;
  caption?: string;
};

type GalleryBlock = {
  id: string;
  type: "gallery";
  title?: string;
  images: GalleryImage[];
  withBackground?: boolean;
};

type ReviewBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | QuoteBlock
  | DividerBlock
  | CardBlock
  | EmbedBlock
  | GalleryBlock;

/* helpers for blocks */

function createBlock(type: ReviewBlock["type"]): ReviewBlock {
  switch (type) {
    case "paragraph":
      return { id: nanoid(), type: "paragraph", text: "" };
    case "heading":
      return { id: nanoid(), type: "heading", level: 2, text: "" };
    case "image":
      return { id: nanoid(), type: "image", url: "", caption: "" };
    case "quote":
      return { id: nanoid(), type: "quote", text: "" };
    case "divider":
      return { id: nanoid(), type: "divider" };
    case "card":
      return {
        id: nanoid(),
        type: "card",
        title: "",
        body: "",
        linkUrl: "",
        linkLabel: "Learn more",
        variant: "default",
        mediaType: "none",
        layout: "mediaTop",
        videoUrl: "",
        imageUrls: [],
        imageLayout: "row",
        cardWidth: "narrow",
      };
    case "embed":
      return {
        id: nanoid(),
        type: "embed",
        url: "",
        title: "",
        size: "default",
      };
    case "gallery":
      return {
        id: nanoid(),
        type: "gallery",
        title: "",
        images: [],
        withBackground: false,
      };
  }
}

/** convert blocks into plain text (for summary / SEO) */
function blocksToPlainText(blocks: ReviewBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return b.text;
        case "paragraph":
        case "quote":
          return b.text.replace(/<[^>]+>/g, "");
        case "image":
          return b.caption ?? "";
        case "card":
          return [
            b.title || "",
            (b.body || "").replace(/<[^>]+>/g, ""),
          ]
            .filter(Boolean)
            .join(". ");
        case "gallery":
          return (b.images ?? [])
            .map((img) => img.caption || "")
            .filter(Boolean)
            .join(" ");
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}


function updateImageUrls(
  block: CardBlock,
  index: number,
  url: string,
): string[] {
  const current = block.imageUrls ?? [];
  const copy = [...current];
  copy[index] = url;
  return copy;
}

function getCardVariantClasses(variant: CardVariant) {
  const base =
    "rounded-2xl border border-white/15 bg-black/40 p-4 transition-all";
  switch (variant) {
    case "compact":
      return `${base} text-xs sm:text-sm py-3 px-3`;
    case "featured":
      return `${base} border-lime-400/70 shadow-[0_0_35px_rgba(190,242,100,0.35)]`;
    case "default":
    default:
      return `${base} text-sm space-y-3`;
  }
}

function normalizeEmbedInput(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();

  // twitter embed
  if (trimmed.includes("twitter-tweet")) {
    const matches = [...trimmed.matchAll(/<a[^>]+href="([^"]+)"/gi)];
    const lastHref = matches.length ? matches[matches.length - 1][1] : null;
    if (lastHref) return lastHref;
  }

  // iframe
  const iframeMatch = trimmed.match(/<iframe[^>]+src="([^"]+)"/i);
  const src = iframeMatch?.[1] ?? trimmed;

  try {
    const u = new URL(src);
    if (u.hostname.toLowerCase().includes("facebook.com")) {
      u.searchParams.delete("width");
      u.searchParams.delete("height");
      return u.toString();
    }
    return u.toString();
  } catch {
    return src;
  }
}

/* ====================================================================== */
/* COMPONENT                                                              */
/* ====================================================================== */

export default function RatingEditor({ mode, initial }: RatingEditorProps) {
  const router = useRouter();

  /* ---------- authors ---------- */

  const [authors, setAuthors] = useState<AdminAuthor[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>("");

  useEffect(() => {
    async function loadAuthors() {
      try {
        const res = await fetch("/api/admin/authors");
        if (!res.ok) return;
        const json = await res.json();

        const list: AdminAuthor[] = Array.isArray(json.authors)
          ? json.authors.map((a: any) => ({
              id: String(a.id),
              name: a.name ?? a.full_name ?? "",
              role: a.role ?? a.authorRole ?? null,
              avatar_url: a.avatar_url ?? a.avatarUrl ?? null,
            }))
          : [];

        setAuthors(list);

        const currentName =
          ((initial as any)?.reviewer_name as string | undefined) ?? "";
        if (currentName) {
          const match = list.find((a) => a.name === currentName);
          if (match) setSelectedAuthorId(match.id);
        }
      } catch (err) {
        console.error("Failed to load authors for ratings editor", err);
      }
    }
    loadAuthors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- basic info ---------- */

  const [title, setTitle] = useState(initial?.game_title ?? "");
  const [slug, setSlug] = useState((initial as any)?.slug ?? "");
  const [score, setScore] = useState(
    initial?.score != null ? String(initial.score) : "",
  );

  const [imageUrl, setImageUrl] = useState(
    ((initial as any)?.image_url as string | undefined) ??
      (initial?.img as string | undefined) ??
      "",
  );

  /* ---------- game details ---------- */

  const [developer, setDeveloper] = useState((initial as any)?.developer ?? "");
  const [publisher, setPublisher] = useState((initial as any)?.publisher ?? "");
  const [releaseDateInput, setReleaseDateInput] = useState(
    ((initial as any)?.release_date as string | undefined) ?? "",
  );
  const [platformsInput, setPlatformsInput] = useState(
    ((initial as any)?.platforms as string[] | undefined)?.join(", ") ?? "",
  );
  const [genresInput, setGenresInput] = useState(
    ((initial as any)?.genres as string[] | undefined)?.join(", ") ?? "",
  );

  /* ---------- how long to beat ---------- */

  const [hoursMainInput, setHoursMainInput] = useState(
    (initial as any)?.hours_main != null
      ? String((initial as any).hours_main)
      : "",
  );
  const [hoursMainPlusInput, setHoursMainPlusInput] = useState(
    (initial as any)?.hours_main_plus != null
      ? String((initial as any).hours_main_plus)
      : "",
  );
  const [hoursCompletionistInput, setHoursCompletionistInput] = useState(
    (initial as any)?.hours_completionist != null
      ? String((initial as any).hours_completionist)
      : "",
  );
  const [hoursAllStylesInput, setHoursAllStylesInput] = useState(
    (initial as any)?.hours_all_styles != null
      ? String((initial as any).hours_all_styles)
      : "",
  );

  /* ---------- media ---------- */

  const [trailerUrl, setTrailerUrl] = useState(
    ((initial as any)?.trailer_url as string | undefined) ?? "",
  );

  const initialGallery: GalleryItem[] =
    Array.isArray((initial as any)?.gallery_images) &&
    (initial as any).gallery_images.length
      ? (initial as any).gallery_images.map((g: any) => ({
          url: g.url as string,
          caption: g.caption as string | undefined,
        }))
      : [];

  const [gallery, setGallery] = useState<GalleryItem[]>(initialGallery);

  /* ---------- review: blocks + verdict + reviewer ---------- */

  const [verdictLabel, setVerdictLabel] = useState(
    ((initial as any)?.verdict_label as string | undefined) ?? "Review",
  );

const [blocks, setBlocks] = useState<ReviewBlock[]>(() => {
  const existing =
    ((initial as any)?.review_body as string | undefined) ?? "";

  if (!existing.trim()) {
    return [createBlock("paragraph")];
  }

  // NEW: try to parse as JSON array of blocks (like news `content_blocks`)
  try {
    const parsed = JSON.parse(existing);
    if (Array.isArray(parsed)) {
      return parsed as ReviewBlock[];
    }
  } catch {
    // not JSON → fall back to old behaviour
  }

  // Fallback: treat it as plain text → single paragraph block
  return [
    {
      id: nanoid(),
      type: "paragraph",
      text: existing.replace(/\n/g, "<br />"),
    } as ParagraphBlock,
  ];
});


  const [reviewerName, setReviewerName] = useState(
    ((initial as any)?.reviewer_name as string | undefined) ?? "",
  );
  const [reviewerAvatarUrl, setReviewerAvatarUrl] = useState(
    ((initial as any)?.reviewer_avatar_url as string | undefined) ?? "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------- author dropdown behaviour ---------- */

  function handleSelectAuthor(id: string) {
    setSelectedAuthorId(id);
    const author = authors.find((a) => a.id === id);
    if (!author) return;
    setReviewerName(author.name);
    if (author.avatar_url) {
      setReviewerAvatarUrl(author.avatar_url);
    }
  }

  /* ---------- block operations ---------- */

  function updateBlock<T extends ReviewBlock>(id: string, patch: Partial<T>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function addBlockAfter(id: string, type: ReviewBlock["type"]) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy.splice(idx + 1, 0, createBlock(type));
      return copy;
    });
  }

  function removeBlock(id: string) {
    setBlocks((prev) =>
      prev.length <= 1 ? prev : prev.filter((b) => b.id !== id),
    );
  }

  function moveBlock(id: string, direction: "up" | "down") {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const nextIdx = direction === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;

      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, item);
      return copy;
    });
  }

  function duplicateBlock(id: string) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const original = prev[idx];
      const clone: ReviewBlock = { ...original, id: nanoid() } as ReviewBlock;
      const copy = [...prev];
      copy.splice(idx + 1, 0, clone);
      return copy;
    });
  }

  /* ---------- submit ---------- */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (!title.trim()) {
        throw new Error("Game title is required.");
      }
      const parsedScore = parseNumber(score);
      if (parsedScore == null) {
        throw new Error("Score must be a valid number.");
      }
      if (!imageUrl.trim()) {
        throw new Error("Cover image is required.");
      }

      const platforms = parseList(platformsInput);
      const genres = parseList(genresInput);

            const galleryPayload =
        gallery.length > 0
          ? gallery
              .map((g) => ({
                url: g.url.trim(),
                caption: g.caption?.trim() || null,
              }))
              .filter((g) => g.url)
          : null;

      // NEW: plain text only for summary + JSON for the actual review
      const reviewPlain = blocksToPlainText(blocks);
      const autoSummary = buildAutoSummary(reviewPlain) ?? "";
      const reviewJson = JSON.stringify(blocks);

      const payload: any = {
        game_title: title.trim(),
        img: imageUrl.trim(),
        score: parsedScore,

        // summary / subtitle: auto from review text (plain)
        subtitle: autoSummary || null,
        summary: autoSummary || null,
        slug: slug.trim() || null,

        developer: developer.trim() || null,
        publisher: publisher.trim() || null,
        release_date: releaseDateInput.trim() || null,
        platforms: platforms.length ? platforms : null,
        genres: genres.length ? genres : null,

        hours_main: parseNumber(hoursMainInput),
        hours_main_plus: parseNumber(hoursMainPlusInput),
        hours_completionist: parseNumber(hoursCompletionistInput),
        hours_all_styles: parseNumber(hoursAllStylesInput),

        trailer_url: trailerUrl.trim() || null,
        gallery_images: galleryPayload,

        // IMPORTANT: now store JSON string of blocks, like news `content_blocks`
        review_body: reviewJson,
        reviewer_name: reviewerName.trim() || null,
        reviewer_avatar_url: reviewerAvatarUrl.trim() || null,
        verdict_label: verdictLabel.trim() || null,
      };


      let saved: any;
      if (mode === "edit" && initial?.id) {
        saved = await adminUpdateRating(initial.id, payload);
      } else {
        saved = await adminCreateRating(payload);
      }

      const slugOrId = saved.slug || saved.id;
      router.push(`/ratings/${slugOrId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save rating");
    } finally {
      setSaving(false);
    }
  }

  /* ---------- preview derived ---------- */

  const previewScoreNumber = parseNumber(score);
  const previewCover = imageUrl.trim() || "/placeholder-rating-cover.jpg";
  const previewPlatforms = parseList(platformsInput);
  const previewGenres = parseList(genresInput);
  const embedTrailer = getYouTubeEmbedUrl(trailerUrl);

  const previewGallery = gallery
    .filter((g) => g.url.trim())
    .map((g, idx) => ({
      id: `g-${idx}`,
      url: g.url.trim(),
      caption: g.caption,
    }));

  /* ---------- render helpers for preview blocks ---------- */

  function renderPreviewBlock(block: ReviewBlock) {
    switch (block.type) {
      case "heading":
        return (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Heading
            </p>
            {block.level === 2 ? (
              <h2 className="text-lg font-semibold">{block.text || "Title"}</h2>
            ) : (
              <h3 className="text-base font-semibold">
                {block.text || "Subtitle"}
              </h3>
            )}
          </div>
        );
      case "paragraph":
        return (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-white/50 mb-1">
              Paragraph
            </p>
            <div
              className="text-xs sm:text-sm text-white/85 whitespace-pre-wrap break-all"
              dangerouslySetInnerHTML={{
                __html: block.text || "Start typing your review here…",
              }}
            />
          </div>
        );
      case "quote":
        return (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Quote
            </p>
            <blockquote className="border-l-4 border-lime-400/70 pl-3 text-xs sm:text-sm italic text-white/90">
              <div
                className="whitespace-pre-wrap break-all"
                dangerouslySetInnerHTML={{
                  __html:
                    block.text || "Add a highlighted quote or pull-quote…",
                }}
              />
            </blockquote>
          </div>
        );
      case "image":
        return (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Inline image
            </p>
            {block.url ? (
              <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/10 bg-black/50">
                <Image
                  src={block.url}
                  alt={block.caption || "Review image"}
                  fill
                  sizes="400px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/40 text-xs text-white/50">
                Upload an image in the editor to see it here.
              </div>
            )}
            {block.caption && (
              <p className="text-[11px] text-white/60">{block.caption}</p>
            )}
          </div>
        );
      case "gallery": {
        const images =
          block.images?.filter((img) => img.url && img.url.trim()) ?? [];
        if (!images.length) {
          return (
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-white/50">
                Gallery
              </p>
              <p className="text-[11px] text-white/60">
                Add some gallery images in the editor…
              </p>
            </div>
          );
        }

        const storyGalleryImages = images.map((img) => ({
          id: img.id,
          url: img.url,
          caption: img.caption,
        }));

        return (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Gallery
            </p>
            {block.title && (
              <h3 className="text-sm font-semibold">{block.title}</h3>
            )}
            <StoryGallery
              images={storyGalleryImages}
              withBackground={block.withBackground ?? false}
            />
          </div>
        );
      }
      case "embed":
        return (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Embed
            </p>
            {block.url ? (
              <SocialEmbed
                url={block.url}
                title={block.title}
                size={block.size}
              />
            ) : (
              <p className="text-[11px] text-white/60">
                Paste a Facebook / YouTube / X URL in the editor…
              </p>
            )}
          </div>
        );
      case "card":
        return (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Info card ({block.variant})
            </p>
            <div className={getCardVariantClasses(block.variant)}>
              {block.title && (
                <h3 className="text-sm font-semibold mb-1">{block.title}</h3>
              )}
              {block.body && (
                <div
                  className="text-xs sm:text-sm text-white/80 whitespace-pre-wrap break-all mb-1"
                  dangerouslySetInnerHTML={{ __html: block.body }}
                />
              )}
              {block.linkUrl && (
                <p className="text-[11px] text-lime-300 break-words">
                  {block.linkLabel || block.linkUrl}
                </p>
              )}
              {block.mediaType === "video" && block.videoUrl && (
                <p className="mt-2 text-[11px] text-white/60">
                  YouTube video will appear in the full article layout.
                </p>
              )}
              {block.mediaType === "imageGrid" &&
                (block.imageUrls ?? []).some((u) => u && u.trim()) && (
                  <p className="mt-2 text-[11px] text-white/60">
                    Image grid preview.
                  </p>
                )}
            </div>
          </div>
        );
      case "divider":
        return (
          <div className="my-2">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>
        );
    }
  }

  /* ---------- render editor block ---------- */

  function renderEditorBlockControls(block: ReviewBlock) {
    return (
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => moveBlock(block.id, "up")}
            className="rounded-full border border-white/20 px-2 py-0.5 hover:bg-white/10"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => moveBlock(block.id, "down")}
            className="rounded-full border border-white/20 px-2 py-0.5 hover:bg-white/10"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => duplicateBlock(block.id)}
            className="rounded-full border border-white/20 px-2 py-0.5 hover:bg-white/10"
          >
            Copy
          </button>
        </div>
        <button
          type="button"
          onClick={() => removeBlock(block.id)}
          className="rounded-full border border-red-500/60 px-2 py-0.5 text-red-300 hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>
    );
  }

  function renderEditorBlock(block: ReviewBlock) {
    return (
      <div
        key={block.id}
        className="space-y-2 rounded-lg border border-white/10 bg-black/40 p-3"
      >
        {renderEditorBlockControls(block)}

        {block.type === "paragraph" && (
          <RichTextEditor
            value={block.text}
            onChange={(html) =>
              updateBlock<ParagraphBlock>(block.id, { text: html })
            }
            placeholder="Review text..."
          />
        )}

        {block.type === "heading" && (
          <div className="space-y-2">
            <div className="flex gap-2 text-[11px]">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={block.level === 2}
                  onChange={() =>
                    updateBlock<HeadingBlock>(block.id, { level: 2 })
                  }
                />
                H2
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={block.level === 3}
                  onChange={() =>
                    updateBlock<HeadingBlock>(block.id, { level: 3 })
                  }
                />
                H3
              </label>
            </div>
            <input
              className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
              value={block.text}
              onChange={(e) =>
                updateBlock<HeadingBlock>(block.id, { text: e.target.value })
              }
              placeholder="Section title…"
            />
          </div>
        )}

        {block.type === "image" && (
          <div className="space-y-2">
            <NewsImageUpload
              label="Block image"
              value={block.url}
              onChange={(url) => updateBlock<ImageBlock>(block.id, { url })}
            />
            <input
              className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
              value={block.caption}
              onChange={(e) =>
                updateBlock<ImageBlock>(block.id, { caption: e.target.value })
              }
              placeholder="Caption (optional)…"
            />
          </div>
        )}

        {block.type === "quote" && (
          <RichTextEditor
            value={block.text}
            onChange={(html) =>
              updateBlock<QuoteBlock>(block.id, { text: html })
            }
            placeholder="Pull-quote…"
          />
        )}

        {block.type === "embed" && (
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-[11px] text-white/60">
                Embed URL or iframe / Twitter code
              </label>
              <input
                className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                value={block.url}
                onChange={(e) =>
                  updateBlock<EmbedBlock>(block.id, {
                    url: normalizeEmbedInput(e.target.value),
                  })
                }
                placeholder="Paste Facebook/YouTube/X URL or embed code"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-white/60">
                Optional caption / title
              </label>
              <input
                className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                value={block.title || ""}
                onChange={(e) =>
                  updateBlock<EmbedBlock>(block.id, { title: e.target.value })
                }
                placeholder="Short caption…"
              />
            </div>
          </div>
        )}

        {block.type === "gallery" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] text-white/60">
                Gallery title (optional)
              </label>
              <input
                className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                value={block.title ?? ""}
                onChange={(e) =>
                  updateBlock<GalleryBlock>(block.id, { title: e.target.value })
                }
                placeholder="e.g. Screenshots…"
              />
            </div>
            <label className="flex items-center gap-2 text-[11px] text-white/70">
              <input
                type="checkbox"
                checked={block.withBackground ?? false}
                onChange={(e) =>
                  updateBlock<GalleryBlock>(block.id, {
                    withBackground: e.target.checked,
                  })
                }
              />
              <span>Show dark box behind gallery</span>
            </label>

            <div className="space-y-2">
              {(block.images ?? []).map((img, idx) => (
                <div
                  key={img.id}
                  className="grid gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start"
                >
                  <GalleryImageUpload
                    label={`Image ${idx + 1}`}
                    value={img.url}
                    onChange={(url) => {
                      const next = (block.images ?? []).map((g, i) =>
                        i === idx ? { ...g, url } : g,
                      );
                      updateBlock<GalleryBlock>(block.id, { images: next });
                    }}
                  />
                  <div className="space-y-1">
                    <input
                      className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                      value={img.caption ?? ""}
                      onChange={(e) => {
                        const next = (block.images ?? []).map((g, i) =>
                          i === idx ? { ...g, caption: e.target.value } : g,
                        );
                        updateBlock<GalleryBlock>(block.id, { images: next });
                      }}
                      placeholder="Caption (optional)…"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = (block.images ?? []).filter(
                          (_g, i) => i !== idx,
                        );
                        updateBlock<GalleryBlock>(block.id, { images: next });
                      }}
                      className="text-[11px] text-red-300 hover:text-red-200"
                    >
                      Remove image
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const next = [
                    ...(block.images ?? []),
                    { id: nanoid(), url: "", caption: "" },
                  ];
                  updateBlock<GalleryBlock>(block.id, { images: next });
                }}
                className="rounded-full border border-white/30 px-3 py-1 text-[11px] hover:bg-white/10"
              >
                + Add image
              </button>
            </div>
          </div>
        )}

        {block.type === "card" && (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-4 text-[11px]">
              <div className="space-y-1">
                <label className="text-white/60">Card size / style</label>
                <select
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                  value={block.variant}
                  onChange={(e) =>
                    updateBlock<CardBlock>(block.id, {
                      variant: e.target.value as CardVariant,
                    })
                  }
                >
                  <option value="default">Default</option>
                  <option value="compact">Compact</option>
                  <option value="featured">Featured</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-white/60">Media</label>
                <select
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                  value={block.mediaType}
                  onChange={(e) =>
                    updateBlock<CardBlock>(block.id, {
                      mediaType: e.target.value as CardMediaType,
                    })
                  }
                >
                  <option value="none">None</option>
                  <option value="video">YouTube video</option>
                  <option value="imageGrid">Image gallery (up to 3)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-white/60">Layout</label>
                <select
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                  value={block.layout}
                  onChange={(e) =>
                    updateBlock<CardBlock>(block.id, {
                      layout: e.target.value as CardLayout,
                    })
                  }
                >
                  <option value="mediaTop">Media top, text bottom</option>
                  <option value="mediaBottom">Text top, media bottom</option>
                  <option value="mediaLeft">Media left, text right</option>
                  <option value="mediaRight">Text left, media right</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-white/60">Card width</label>
                <select
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                  value={block.cardWidth || "narrow"}
                  onChange={(e) =>
                    updateBlock<CardBlock>(block.id, {
                      cardWidth: e.target.value as CardWidth,
                    })
                  }
                >
                  <option value="narrow">Narrow</option>
                  <option value="full">Full article width</option>
                </select>
              </div>
            </div>

            {block.mediaType === "video" && (
              <div className="space-y-1">
                <label className="text-[11px] text-white/60">
                  YouTube URL
                </label>
                <input
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                  value={block.videoUrl || ""}
                  onChange={(e) =>
                    updateBlock<CardBlock>(block.id, {
                      videoUrl: e.target.value,
                    })
                  }
                  placeholder="https://www.youtube.com/watch?v=…"
                />
              </div>
            )}

            {block.mediaType === "imageGrid" && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">
                    Gallery layout
                  </label>
                  <select
                    className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                    value={block.imageLayout || "row"}
                    onChange={(e) =>
                      updateBlock<CardBlock>(block.id, {
                        imageLayout: e.target.value as "row" | "grid",
                      })
                    }
                  >
                    <option value="row">Row</option>
                    <option value="grid">Grid</option>
                  </select>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {[0, 1, 2].map((idx) => (
                    <NewsImageUpload
                      key={idx}
                      label={`Image ${idx + 1}`}
                      value={(block.imageUrls ?? [])[idx] || ""}
                      onChange={(url) =>
                        updateBlock<CardBlock>(block.id, {
                          imageUrls: updateImageUrls(block, idx, url),
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <input
              className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
              value={block.title}
              onChange={(e) =>
                updateBlock<CardBlock>(block.id, { title: e.target.value })
              }
              placeholder="Card title…"
            />

            <RichTextEditor
              value={block.body}
              onChange={(html) =>
                updateBlock<CardBlock>(block.id, { body: html })
              }
              placeholder="Short text…"
            />

            <input
              className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
              value={block.linkUrl}
              onChange={(e) =>
                updateBlock<CardBlock>(block.id, { linkUrl: e.target.value })
              }
              placeholder="Link URL (https://google.com)…"
            />
            <input
              className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
              value={block.linkLabel}
              onChange={(e) =>
                updateBlock<CardBlock>(block.id, { linkLabel: e.target.value })
              }
              placeholder='Link label (e.g. "Read more")…'
            />
          </div>
        )}

        {block.type === "divider" && (
          <p className="text-[11px] text-white/60">Horizontal divider</p>
        )}

        <div className="pt-2 border-t border-white/10 mt-2 flex flex-wrap gap-2 text-[11px]">
          <span className="text-white/50">Add block:</span>
          {[
            "paragraph",
            "heading",
            "image",
            "gallery",
            "quote",
            "embed",
            "card",
            "divider",
          ].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addBlockAfter(block.id, t as ReviewBlock["type"])}
              className="rounded-full border border-white/30 px-2 py-0.5 hover:bg-white/10"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* LEFT: form */}
      <div className="space-y-6">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {mode === "edit" ? "Edit Rating" : "Create Rating"}
          </h1>
          <Link
            href="/admin"
            className="text-xs text-white/60 underline hover:text-white"
          >
            ← Back to admin
          </Link>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <section className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <h2 className="text-sm font-semibold">Basic info</h2>

            <div className="space-y-1">
              <label className="text-xs text-white/60">Game title</label>
              <input
                className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/60">
                Slug (optional, for URL)
              </label>
              <input
                className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="example: elden-ring-review"
              />
              <p className="text-[11px] text-white/40">
                If empty, the rating will use the numeric id in the URL.
              </p>
            </div>

            {/* NO summary field here anymore */}

            <div className="grid gap-3 md:grid-cols-[1fr,180px]">
              <div className="space-y-1">
                <label className="text-xs text-white/60">Score</label>
                <input
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="8.5"
                />
              </div>

              <NewsImageUpload
                label="Cover image"
                value={imageUrl}
                onChange={setImageUrl}
              />
            </div>

            {/* Reviewer section (no URL bar under avatar) */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide">
                Reviewer
              </h3>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                {/* Left: dropdown + name */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">
                      Choose reviewer
                    </label>
                    <select
                      className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                      value={selectedAuthorId}
                      onChange={(e) => handleSelectAuthor(e.target.value)}
                    >
                      <option value="">Custom reviewer…</option>
                      {authors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                          {a.role ? ` — ${a.role}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">
                      Reviewer name
                    </label>
                    <input
                      className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                      value={reviewerName}
                      onChange={(e) => {
                        setSelectedAuthorId("");
                        setReviewerName(e.target.value);
                      }}
                      placeholder="e.g. Viktor"
                    />
                  </div>
                </div>

                {/* Right: avatar preview only */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative h-32 w-32 rounded-full overflow-hidden border border-white/60 bg-black/50 flex-shrink-0">
                    {reviewerAvatarUrl ? (
                      <Image
                        src={reviewerAvatarUrl}
                        alt={reviewerName || "Reviewer avatar"}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-white/60">
                        No image
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Game details */}
          <section className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <h2 className="text-sm font-semibold">Game details</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-white/60">Developer</label>
                <input
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm break-all"
                  value={developer}
                  onChange={(e) => setDeveloper(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/60">Publisher</label>
                <input
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm break-all"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/60">
                  Release date (YYYY-MM-DD)
                </label>
                <input
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                  value={releaseDateInput}
                  onChange={(e) => setReleaseDateInput(e.target.value)}
                  placeholder="2025-11-14"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/60">
                  Platforms (comma separated)
                </label>
                <input
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm break-words"
                  value={platformsInput}
                  onChange={(e) => setPlatformsInput(e.target.value)}
                  placeholder="PC, PS5, Xbox Series X"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-white/60">
                  Genres (comma separated)
                </label>
                <input
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm break-words"
                  value={genresInput}
                  onChange={(e) => setGenresInput(e.target.value)}
                  placeholder="RPG, Action, Souls-like"
                />
              </div>
            </div>
          </section>

          {/* How long to beat */}
          <section className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <h2 className="text-sm font-semibold">How long to beat</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs text-white/60">
                  Main story (hours)
                </label>
                <input
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                  value={hoursMainInput}
                  onChange={(e) => setHoursMainInput(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">Story + sides</label>
                <input
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                  value={hoursMainPlusInput}
                  onChange={(e) => setHoursMainPlusInput(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">Completionist</label>
                <input
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                  value={hoursCompletionistInput}
                  onChange={(e) => setHoursCompletionistInput(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">All styles</label>
                <input
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                  value={hoursAllStylesInput}
                  onChange={(e) => setHoursAllStylesInput(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Media */}
          <section className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <h2 className="text-sm font-semibold">Media (trailer & gallery)</h2>

            <div className="space-y-1">
              <label className="text-xs text-white/60">
                Trailer URL (YouTube link or embed URL)
              </label>
              <input
                className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm break-words"
                value={trailerUrl}
                onChange={(e) => setTrailerUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">Gallery images</span>
                <button
                  type="button"
                  className="rounded-full border border-white/30 px-2 py-0.5 text-[11px]"
                  onClick={() =>
                    setGallery((g) => [...g, { url: "", caption: "" }])
                  }
                >
                  + Add image
                </button>
              </div>

              {gallery.length === 0 && (
                <p className="text-[11px] text-white/50">
                  No images yet. Click &ldquo;Add image&rdquo;.
                </p>
              )}

              <div className="space-y-2">
                {gallery.map((g, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 rounded-md border border-white/15 bg-black/40 p-2 text-xs md:grid-cols-[2fr,3fr,auto]"
                  >
                    <NewsImageUpload
                      label="Image URL"
                      value={g.url}
                      onChange={(url) =>
                        setGallery((list) =>
                          list.map((item, i) =>
                            i === idx ? { ...item, url } : item,
                          ),
                        )
                      }
                    />
                    <div className="space-y-1">
                      <label className="text-[11px] text-white/60">
                        Caption (optional)
                      </label>
                      <input
                        className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                        value={g.caption || ""}
                        onChange={(e) =>
                          setGallery((list) =>
                            list.map((item, i) =>
                              i === idx
                                ? { ...item, caption: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="self-start rounded-md border border-red-500/70 px-2 py-1 text-[11px] text-red-300"
                      onClick={() =>
                        setGallery((list) => list.filter((_, i) => i !== idx))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Review blocks */}
          <section className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <h2 className="text-sm font-semibold">Review & verdict</h2>

            <div className="space-y-1">
              <label className="text-xs text-white/60">
                Verdict label (e.g. &ldquo;Amazing&rdquo;, &ldquo;Okay&rdquo;)
              </label>
              <input
                className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                value={verdictLabel}
                onChange={(e) => setVerdictLabel(e.target.value)}
                placeholder="Review"
              />
            </div>

            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-white/70">
                  Review blocks
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setBlocks((prev) => [...prev, createBlock("paragraph")])
                  }
                  className="rounded-full border border-white/30 px-3 py-1 text-[11px] hover:bg-white/10"
                >
                  + Paragraph
                </button>
              </div>

              <div className="space-y-3">{blocks.map(renderEditorBlock)}</div>
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : mode === "edit"
              ? "Save rating"
              : "Create rating"}
          </button>
        </form>
      </div>

      {/* RIGHT: live preview */}
      <aside className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/60">
          Live preview (approximate)
        </h2>

        {/* HERO PREVIEW – no summary here */}
        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/60 p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative w-full max-w-full overflow-hidden rounded-xl border border-white/20 bg-black/70 md:w-[220px] aspect-[16/9] md:aspect-[4/3]">
              <Image
                src={previewCover}
                alt={title || "Game cover"}
                fill
                sizes="220px"
                className="object-cover"
              />
            </div>

            <div className="flex flex-1 flex-col justify-between gap-3 min-w-0">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-white/60">
                  Preview
                </p>
                <h3 className="text-xl font-extrabold leading-tight break-words">
                  {title || "Game title…"}
                </h3>

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/70">
                  {developer && (
                    <span className="break-all">
                      <span className="text-white/50">Developer:</span>{" "}
                      {developer}
                    </span>
                  )}
                  {publisher && (
                    <span className="break-all">
                      <span className="text-white/50">Publisher:</span>{" "}
                      {publisher}
                    </span>
                  )}
                  {releaseDateInput && (
                    <span className="break-all">
                      <span className="text-white/50">Release:</span>{" "}
                      {releaseDateInput}
                    </span>
                  )}
                </div>

                {(previewPlatforms.length > 0 || previewGenres.length > 0) && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {previewPlatforms.map((p) => (
                      <span
                        key={`plat-${p}`}
                        className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] break-words"
                      >
                        {p}
                      </span>
                    ))}
                    {previewGenres.map((g) => (
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

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-lg font-bold shadow-[0_0_25px_rgba(248,113,113,0.6)]">
                    {previewScoreNumber != null
                      ? previewScoreNumber.toFixed(1)
                      : "--"}
                  </div>
                  <div className="text-[11px] text-white/70">
                    <p className="text-[10px] uppercase tracking-wide">
                      GameLink score
                    </p>
                    <p className="break-words">{verdictLabel || "Review"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HLTB preview */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-black/60 p-3">
          <h3 className="text-xs font-semibold">How long to beat</h3>
          <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
            <div className="rounded-xl border border-white/10 bg-black/70 px-2 py-2">
              <p className="text-[10px] uppercase text-white/50">Main story</p>
              <p className="mt-1 text-sm font-semibold">
                {hoursMainInput ? `${hoursMainInput} hrs` : "--"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/70 px-2 py-2">
              <p className="text-[10px] uppercase text-white/50">
                Story + sides
              </p>
              <p className="mt-1 text-sm font-semibold">
                {hoursMainPlusInput ? `${hoursMainPlusInput} hrs` : "--"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/70 px-2 py-2">
              <p className="text-[10px] uppercase text-white/50">
                Completionist
              </p>
              <p className="mt-1 text-sm font-semibold">
                {hoursCompletionistInput
                  ? `${hoursCompletionistInput} hrs`
                  : "--"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/70 px-2 py-2">
              <p className="text-[10px] uppercase text-white/50">
                All styles
              </p>
              <p className="mt-1 text-sm font-semibold">
                {hoursAllStylesInput ? `${hoursAllStylesInput} hrs` : "--"}
              </p>
            </div>
          </div>
        </section>

        {/* Media preview */}
        {(embedTrailer || previewGallery.length > 0) && (
          <section className="space-y-2 rounded-2xl border border-white/10 bg-black/60 p-3">
            <h3 className="text-xs font-semibold">Images & screenshots</h3>
            {embedTrailer && (
              <div className="w-full max-w-md mx-auto aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                <iframe
                  src={embedTrailer}
                  title="Trailer preview"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            )}
            {previewGallery.length > 0 && (
              <StoryGallery images={previewGallery} withBackground />
            )}
          </section>
        )}

        {/* Review preview */}
        <section className="space-y-2 rounded-2xl border border-white/10 bg-black/60 p-3">
          <h3 className="text-xs font-semibold">{verdictLabel || "Review"}</h3>

          {blocks.map((b, idx) => (
            <div key={b.id} className={idx === 0 ? "" : "mt-3"}>
              {renderPreviewBlock(b)}
            </div>
          ))}

          {(reviewerName || reviewerAvatarUrl) && (
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-8 w-8 overflow-hidden rounded-full border border-white/40 bg-black">
                <Image
                  src={reviewerAvatarUrl || "/default.jpg"}
                  alt={reviewerName || "Reviewer"}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </div>
              <div className="text-[11px]">
                {reviewerName && (
                  <p className="font-semibold break-words">{reviewerName}</p>
                )}
                <p className="text-white/60">GameLink reviewer</p>
              </div>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
