"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { nanoid } from "nanoid";
import { SocialEmbed } from "@/components/SocialEmbed";
import StoryGallery, {
  GalleryImage as PreviewGalleryImage,
} from "@/components/StoryGallery";
import GalleryImageUpload from "@/components/GalleryImageUpload";

import NewsImageUpload from "@/components/NewsImageUpload";
import { adminCreateStory, adminUpdateStory } from "@/lib/actions/admin-content";

/* ------------------------------------------------------------------ */
/* Rich text editor (B / I / U + color)                               */
/* ------------------------------------------------------------------ */

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [color, setColor] = useState<string>("#ffffff");

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  function readHtml() {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  }

  function exec(command: "bold" | "italic" | "underline") {
    document.execCommand(command, false);
    readHtml();
  }

  function applyColor(c: string) {
    setColor(c);
    document.execCommand("foreColor", false, c);
    readHtml();
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

      {/* editor box */}
      <div
        ref={editorRef}
        className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-2 text-xs min-h-[80px] whitespace-pre-wrap break-all focus:outline-none focus:ring-2 focus:ring-lime-400"
        contentEditable
        suppressContentEditableWarning
        onInput={readHtml}
        data-placeholder={placeholder}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Types                                                              */
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
  caption: string; // plain text
};

type QuoteBlock = {
  id: string;
  type: "quote";
  text: string; // HTML
};

export type EmbedSize = "default" | "wide" | "compact";

type EmbedBlock = {
  id: string;
  type: "embed";
  url: string;
  title?: string; // optional caption / title
  size?: EmbedSize;
};

type DividerBlock = {
  id: string;
  type: "divider";
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

export type StoryBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | QuoteBlock
  | DividerBlock
  | CardBlock
  | EmbedBlock
  | GalleryBlock;

/**
 * In practice, you may load contentBlocks from DB where `id` might be missing.
 * This input type lets us normalize safely without using `any`.
 */
type StoryBlockInput = StoryBlock | (Omit<StoryBlock, "id"> & { id?: string });

/* authors from API */
type AuthorOption = {
  id: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
};

type ApiAuthor = {
  id: string | number;
  name?: string | null;
  full_name?: string | null;
  role?: string | null;
  authorRole?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
};

type AuthorsApiResponse = {
  authors?: ApiAuthor[];
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeStoryBlock(b: StoryBlockInput): StoryBlock {
  const maybeId = isRecord(b) ? b.id : undefined;
  const id = typeof maybeId === "string" && maybeId.trim() ? maybeId : nanoid();

  // `b` might not include `id`, so we create a new object with `id`.
  return {
    ...(b as Omit<StoryBlock, "id">),
    id,
  } as StoryBlock;
}

function isAuthorsApiResponse(v: unknown): v is AuthorsApiResponse {
  if (!isRecord(v)) return false;
  const authors = v.authors;
  if (authors === undefined) return true;
  if (!Array.isArray(authors)) return false;
  return authors.every((a) => isRecord(a) && ("id" in a));
}

function createBlock(type: StoryBlock["type"]): StoryBlock {
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

/** simple markdown-ish body for legacy use/search */
function blocksToBody(blocks: StoryBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return `${b.level === 2 ? "##" : "###"} ${b.text}`;
        case "paragraph":
          return b.text.replace(/<[^>]+>/g, "");
        case "quote":
          return b.text ? `> ${b.text.replace(/<[^>]+>/g, "")}` : "";
        case "image":
          return b.url ? `![${b.caption || "image"}](${b.url})` : "";
        case "divider":
          return "---";
        case "card":
          return b.title
            ? `**${b.title}**\n${b.body.replace(/<[^>]+>/g, "") || ""}\n${
                b.linkUrl
                  ? `[${b.linkLabel || "Learn more"}](${b.linkUrl})`
                  : ""
              }`
            : "";
        case "embed":
          return b.url ? `[embed](${b.url})` : "";
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

function updateImageUrls(block: CardBlock, index: number, url: string): string[] {
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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// (still here if you ever want to use it again)
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

// turn "<iframe ... src='...'></iframe>" OR twitter blockquote into a clean URL
// and strip Facebook width/height params so you don't have to.
function normalizeEmbedInput(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();

  // 1) Twitter / X embed code
  if (trimmed.includes("twitter-tweet")) {
    const matches = [...trimmed.matchAll(/<a[^>]+href="([^"]+)"/gi)];
    const lastHref = matches.length ? matches[matches.length - 1][1] : null;
    if (lastHref) return lastHref;
  }

  // 2) Generic iframe
  const iframeMatch = trimmed.match(/<iframe[^>]+src="([^"]+)"/i);
  const src = iframeMatch?.[1] ?? trimmed;

  try {
    const u = new URL(src);
    const host = u.hostname.toLowerCase();

    if (host.includes("facebook.com")) {
      u.searchParams.delete("width");
      u.searchParams.delete("height");
      return u.toString();
    }

    return u.toString();
  } catch {
    return src;
  }
}

/* ------------------------------------------------------------------ */
/* Social preview tester modal (GSW-11)                               */
/* ------------------------------------------------------------------ */

const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

type SocialPreviewTesterProps = {
  slug: string;
  title: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  heroImage: string;
  onClose: () => void;
};

function buildShareUrl(slug: string): string {
  const trimmed = slug.trim();
  const path = trimmed ? `/news/${trimmed}` : "/news/your-article-slug";
  return `${PUBLIC_SITE_URL}${path}`;
}

function getOgTitle(title: string, metaTitle: string): string {
  const t = metaTitle.trim() || title.trim();
  return t || "Example article title for social previews";
}

function getOgDescription(subtitle: string, metaDescription: string): string {
  const d = metaDescription.trim() || subtitle.trim();
  return (
    d ||
    "Short description of your article will appear here. Around 140 characters works best."
  );
}

function getDomainFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "example.com";
  }
}

function SocialPreviewTesterModal({
  slug,
  title,
  subtitle,
  metaTitle,
  metaDescription,
  heroImage,
  onClose,
}: SocialPreviewTesterProps) {
  const shareUrl = buildShareUrl(slug);
  const domain = getDomainFromUrl(shareUrl);
  const ogTitle = getOgTitle(title, metaTitle);
  const ogDescription = getOgDescription(subtitle, metaDescription);
  const hasImage = Boolean(heroImage.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 bg-[#050712] p-4 sm:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        {/* header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Social preview tester
            </p>
            <p className="text-[11px] text-white/50">
              Uses hero image + SEO title / description. This is a visual
              approximation of how X / Facebook / Discord cards will look.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="space-y-5">
          {/* X / Twitter card */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              X / Twitter card
            </p>
            <div className="overflow-hidden rounded-xl border border-white/20 bg-black/80 text-xs">
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-[11px] text-white/60">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                <span className="truncate">{domain}</span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <div className="relative w-full sm:w-[38%] aspect-[16/9] sm:aspect-[4/3] bg-black/80">
                  {hasImage ? (
                    <Image
                      src={heroImage}
                      alt={ogTitle}
                      fill
                      sizes="(min-width: 1024px) 35vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black text-[10px] text-white/40">
                      No hero image yet
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 px-3 py-2 space-y-1">
                  <p className="font-semibold text-white leading-snug line-clamp-2">
                    {ogTitle}
                  </p>
                  <p className="text-[11px] text-white/70 leading-snug line-clamp-3">
                    {ogDescription}
                  </p>
                  <p className="mt-1 text-[10px] text-white/40 truncate">
                    {shareUrl}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Facebook link preview */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Facebook link preview
            </p>
            <div className="overflow-hidden rounded-xl border border-white/20 bg-[#0f1015] text-xs">
              {/* big image on top */}
              <div className="relative w-full aspect-[1.91/1] bg-black/80">
                {hasImage ? (
                  <Image
                    src={heroImage}
                    alt={ogTitle}
                    fill
                    sizes="(min-width: 1024px) 100vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black text-[10px] text-white/40">
                    No hero image yet
                  </div>
                )}
              </div>

              {/* text block */}
              <div className="px-3 py-2 space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-white/45">
                  {domain}
                </p>
                <p className="font-semibold text-white leading-snug line-clamp-2">
                  {ogTitle}
                </p>
                <p className="text-[11px] text-white/70 leading-snug line-clamp-3">
                  {ogDescription}
                </p>
                <p className="text-[10px] text-white/35 truncate">{shareUrl}</p>
              </div>
            </div>
          </div>

          {/* Discord / OG card */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Discord / generic Open Graph
            </p>
            <div className="overflow-hidden rounded-xl border border-[#5865F2]/40 bg-[#0b0d15] text-xs">
              <div className="border-b border-white/5 px-3 py-2 text-[11px] text-white/65">
                {shareUrl}
              </div>
              <div className="flex flex-col sm:flex-row">
                <div className="relative w-full sm:w-[34%] aspect-[16/9] bg-black/80">
                  {hasImage ? (
                    <Image
                      src={heroImage}
                      alt={ogTitle}
                      fill
                      sizes="(min-width: 1024px) 33vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-700 via-slate-900 to-black text-[10px] text-white/45">
                      No hero image yet
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 px-3 py-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-[#a5b4fc]">
                    {domain}
                  </p>
                  <p className="font-semibold text-white leading-snug line-clamp-2">
                    {ogTitle}
                  </p>
                  <p className="text-[11px] text-slate-200 leading-snug line-clamp-3">
                    {ogDescription}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Props for create/edit modes                                        */
/* ------------------------------------------------------------------ */

type StoryBuilderProps = {
  mode: "create" | "edit";
  existingId?: string;

  initialTitle?: string;
  initialSubtitle?: string;
  initialHeroImage?: string;

  // NEW: author fields
  initialAuthorName?: string | null;
  initialAuthorRole?: string | null;
  initialAuthorAvatarUrl?: string | null;
  initialReviewedBy?: string | null;

  initialSlug?: string | null;
  initialMetaTitle?: string | null;
  initialMetaDescription?: string | null;

  initialBlocks?: StoryBlockInput[] | null;
  initialIsSpoiler?: boolean | null;
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function StoryBuilderClient({
  mode,
  existingId,
  initialTitle,
  initialSubtitle,
  initialHeroImage,
  initialAuthorName,
  initialAuthorRole,
  initialAuthorAvatarUrl,
  initialReviewedBy,
  initialSlug,
  initialMetaTitle,
  initialMetaDescription,
  initialBlocks,
  initialIsSpoiler,
}: StoryBuilderProps) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [subtitle, setSubtitle] = useState(initialSubtitle ?? "");
  const [heroImage, setHeroImage] = useState(initialHeroImage ?? "");

  // NEW: author state
  const [authorName, setAuthorName] = useState(initialAuthorName ?? "");
  const [authorRole, setAuthorRole] = useState(initialAuthorRole ?? "");
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState(
    initialAuthorAvatarUrl ?? "",
  );

  const [isSpoiler, setIsSpoiler] = useState(initialIsSpoiler ?? false);
  const [reviewedBy] = useState(initialReviewedBy ?? "");

  // list of admins to choose from
  const [authorOptions, setAuthorOptions] = useState<AuthorOption[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>("custom");

  // SEO
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialSlug));
  const [metaTitle, setMetaTitle] = useState(initialMetaTitle ?? "");
  const [metaTitleTouched, setMetaTitleTouched] =
    useState(Boolean(initialMetaTitle));
  const [metaDescription, setMetaDescription] = useState(
    initialMetaDescription ?? "",
  );
  const [seoOpen, setSeoOpen] = useState(false);

  // NEW: social preview modal
  const [isSocialPreviewOpen, setIsSocialPreviewOpen] = useState(false);

  const [blocks, setBlocks] = useState<StoryBlock[]>(() => {
    const list = initialBlocks ?? [];
    const normalized = list.map(normalizeStoryBlock);
    return normalized.length ? normalized : [createBlock("paragraph")];
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // measure live preview column width
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);

  useEffect(() => {
    function updateWidth() {
      if (previewRef.current) {
        setPreviewWidth(previewRef.current.clientWidth);
      }
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  /* load list of admin authors */
  useEffect(() => {
    async function loadAuthors() {
      try {
        const res = await fetch("/api/admin/authors");
        if (!res.ok) return;

        const json: unknown = await res.json();
        if (!isAuthorsApiResponse(json) || !Array.isArray(json.authors)) return;

        const normalized: AuthorOption[] = json.authors.map((a) => {
          const id = String(a.id);
          const name = (a.name ?? a.full_name ?? "") || "";
          const role = (a.role ?? a.authorRole ?? null) ?? null;
          const avatar_url = (a.avatar_url ?? a.avatarUrl ?? null) ?? null;
          return { id, name, role, avatar_url };
        });

        setAuthorOptions(normalized);
      } catch (err: unknown) {
        console.error("Failed to load authors", err);
      }
    }

    loadAuthors();
  }, []);

  function handleAuthorSelect(id: string) {
    setSelectedAuthorId(id);

    if (id === "custom") return;

    const found = authorOptions.find((a) => a.id === id);
    if (!found) return;

    setAuthorName(found.name || "");
    setAuthorRole("Editor");
    setAuthorAvatarUrl(found.avatar_url || "");
  }

  /* auto-fill slug + metaTitle from title until user edits them */
  useEffect(() => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      if (!slugTouched) setSlug("");
      if (!metaTitleTouched) setMetaTitle("");
      return;
    }

    if (!slugTouched) {
      setSlug(slugify(trimmedTitle));
    }

    if (!metaTitleTouched) {
      setMetaTitle(trimmedTitle);
    }
  }, [title, slugTouched, metaTitleTouched]);

  /* -------------------- block operations -------------------- */

  function updateBlock<T extends StoryBlock>(id: string, patch: Partial<T>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function addBlockAfter(id: string, type: StoryBlock["type"]) {
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
      const clone: StoryBlock = { ...original, id: nanoid() } as StoryBlock;
      const copy = [...prev];
      copy.splice(idx + 1, 0, clone);
      return copy;
    });
  }

  /* -------------------- save story -------------------- */

  async function handleSave() {
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!heroImage.trim()) {
      setError("Hero image is required.");
      return;
    }

    const body = blocksToBody(blocks);
    const extraImages = blocks
      .filter((b): b is ImageBlock => b.type === "image" && !!b.url)
      .map((b) => b.url);

    const trimmedTitle = title.trim();

    const payload = {
      title: trimmedTitle,
      img: heroImage.trim(),
      href: undefined,
      subtitle: subtitle.trim() || undefined,
      body: body || undefined,
      extraImages,
      contentBlocks: blocks,
      slug: slug.trim() || null,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,

      // NEW: author fields
      authorName: authorName.trim() || null,
      authorRole: authorRole.trim() || null,
      authorAvatarUrl: authorAvatarUrl.trim() || null,
      reviewedBy: reviewedBy.trim() || null,
      isSpoiler: isSpoiler,
    } as const;

    startTransition(async () => {
      try {
        if (mode === "edit" && existingId) {
          await adminUpdateStory(existingId, payload);
          setSuccess("Story updated successfully!");
        } else {
          await adminCreateStory(payload);

          setSuccess("Story created successfully!");
          setTitle("");
          setSubtitle("");
          setHeroImage("");
          setSlug("");
          setSlugTouched(false);
          setMetaTitle("");
          setMetaTitleTouched(false);
          setMetaDescription("");
          setBlocks([createBlock("paragraph")]);

          setAuthorName("");
          setAuthorRole("");
          setAuthorAvatarUrl("");
          setSelectedAuthorId("custom");
        }
      } catch (err: unknown) {
        console.error(err);

        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : "Failed to save story.";

        setError(message);
      }
    });
  }

  /* -------------------- preview rendering -------------------- */

  function renderPreviewCard(block: CardBlock) {
    const variantClasses = getCardVariantClasses(block.variant);
    const layout: CardLayout = block.layout ?? "mediaTop";
    const cardWidth: CardWidth = block.cardWidth || "narrow";

    const imageUrls =
      block.mediaType === "imageGrid"
        ? (block.imageUrls ?? []).filter(Boolean)
        : [];
    const hasImages = imageUrls.length > 0;

    const media =
      block.mediaType === "video" && block.videoUrl ? (
        <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black/60 aspect-video flex items-center justify-center text-[11px] text-white/60">
          YouTube video will appear here in the article.
        </div>
      ) : hasImages ? (
        <div
          className={
            block.imageLayout === "grid"
              ? "grid grid-cols-2 sm:grid-cols-3 gap-2"
              : "flex flex-wrap gap-2"
          }
        >
          {imageUrls.map((url, idx) => (
            <div
              key={idx}
              className="relative aspect-square w-20 h-20 sm:w-24 sm:h-24 overflow-hidden rounded-lg border border-white/10 bg-black/40"
            >
              <Image
                src={url}
                alt={`Gallery ${idx + 1}`}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null;

    const cardTitle = block.title?.trim();
    const body = block.body?.trim();
    const hasBody = !!body;

    const textSection = (
      <>
        {cardTitle && (
          <h3 className="text-sm font-semibold text-white mb-1 break-words">
            {cardTitle}
          </h3>
        )}

        {hasBody ? (
          <div className="text-xs sm:text-sm text-white/80 mb-1 whitespace-pre-wrap break-all">
            <div
              dangerouslySetInnerHTML={{
                __html: body,
              }}
            />
          </div>
        ) : (
          !cardTitle && (
            <p className="text-xs text-white/60">
              Card content preview will appear here…
            </p>
          )
        )}

        {block.linkUrl && (
          <p className="text-[11px] text-lime-300 mt-1 break-words">
            {block.linkLabel || block.linkUrl}
          </p>
        )}
      </>
    );

    let inner: React.ReactNode;

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

    if (cardWidth === "full") {
      return (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-white/50">
            Info card ({block.variant}, {layout}, full width)
          </p>

          <div className={`${variantClasses} w-full`}>{inner}</div>
        </div>
      );
    }

    const paddingX = 32;
    const available =
      previewWidth != null ? Math.max(previewWidth - paddingX, 0) : null;

    const scale = 0.65;
    let baseWidthPx: number;

    if (available != null) {
      const targetVisualWidth = available * 0.5;
      baseWidthPx = targetVisualWidth / scale;
    } else {
      baseWidthPx = 448;
    }

    return (
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-white/50">
          Info card ({block.variant}, {layout}, narrow)
        </p>

        <div
          className="inline-block origin-top-left"
          style={{
            width: `${baseWidthPx}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div className={variantClasses}>{inner}</div>
        </div>
      </div>
    );
  }

  function renderPreviewBlock(block: StoryBlock) {
    switch (block.type) {
      case "heading":
        return (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Heading (H{block.level})
            </p>
            {block.level === 2 ? (
              <h2 className="text-2xl font-bold">
                {block.text || "Section title"}
              </h2>
            ) : (
              <h3 className="text-xl font-semibold">
                {block.text || "Sub-section title"}
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
              className="text-sm leading-relaxed text-white/85 whitespace-pre-wrap break-all"
              dangerouslySetInnerHTML={{
                __html: block.text || "Start typing your article text here…",
              }}
            />
          </div>
        );

      case "quote":
        return (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Quote
            </p>
            <blockquote className="border-l-4 border-lime-400/70 pl-3 text-sm italic text-white/90">
              <div
                className="whitespace-pre-wrap break-all"
                dangerouslySetInnerHTML={{
                  __html: block.text || "Add a highlighted quote or pull-quote…",
                }}
              />
            </blockquote>
          </div>
        );

      case "embed": {
        const url = block.url;
        const embedTitle = block.title ?? "";
        const size = block.size as EmbedSize | undefined;

        if (!url) {
          return (
            <div className="text-xs text-white/50 italic">
              Paste a Facebook / YouTube / X URL or embed code…
            </div>
          );
        }

        const paddingX = 32;
        const available =
          previewWidth != null ? Math.max(previewWidth - paddingX, 0) : null;

        const scale = 0.9;
        const baseWidthPx = available != null ? (available * 0.8) / scale : 640;

        return (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Embed
            </p>

            <div
              className="inline-block origin-top-left"
              style={{
                width: `${baseWidthPx}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <SocialEmbed url={url} title={embedTitle} size={size} />
            </div>
          </div>
        );
      }

      case "image":
        return (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Inline image
            </p>

            {block.url ? (
              <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/10 bg-black/50">
                <Image
                  src={block.url}
                  alt={block.caption || "Article image"}
                  fill
                  sizes="(min-width: 1200px) 900px, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/40 text-xs text-white/50">
                Upload an image on the left to see a preview here.
              </div>
            )}

            {block.caption && (
              <p className="text-[11px] text-white/60">{block.caption}</p>
            )}
          </div>
        );

      case "gallery": {
        const images = block.images ?? [];
        if (!images.length) {
          return (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-white/50">
                Image gallery
              </p>
              {block.title && (
                <h3 className="text-xl font-semibold text-white">
                  {block.title}
                </h3>
              )}
              <p className="text-xs text-white/50">
                Add some images on the left to preview the gallery here…
              </p>
            </div>
          );
        }

        const galleryImages: PreviewGalleryImage[] = images
          .filter((img) => img && img.url)
          .map((img) => ({
            id: img.id || nanoid(),
            url: img.url,
            caption: img.caption,
          }));

        return (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Image gallery
            </p>
            {block.title && (
              <h3 className="text-xl font-semibold text-white">{block.title}</h3>
            )}
            <StoryGallery
              images={galleryImages}
              withBackground={block.withBackground ?? false}
            />
          </div>
        );
      }

      case "divider":
        return (
          <div className="my-4">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>
        );

      case "card":
        return renderPreviewCard(block);
    }
  }

  /* -------------------- edit UI for a single block -------------------- */

  function renderEditorBlockControls(block: StoryBlock) {
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

  function renderEditorBlock(block: StoryBlock) {
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
            placeholder="Article text..."
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
            onChange={(html) => updateBlock<QuoteBlock>(block.id, { text: html })}
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
                placeholder='Paste Facebook/YouTube/X URL, &lt;iframe ...&gt; or Twitter embed code'
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
                  updateBlock<GalleryBlock>(block.id, {
                    title: e.target.value,
                  })
                }
                placeholder="e.g. Screenshots, Concept art…"
              />
            </div>

            {/* NEW: wrapper toggle */}
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
                  <option value="narrow">Narrow (magazine-style)</option>
                  <option value="full">Full article width</option>
                </select>
              </div>
            </div>

            {block.mediaType === "video" && (
              <div className="space-y-1">
                <label className="text-[11px] text-white/60">
                  YouTube URL (full link or share link)
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
              onChange={(html) => updateBlock<CardBlock>(block.id, { body: html })}
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
              onClick={() => addBlockAfter(block.id, t as StoryBlock["type"])}
              className="rounded-full border border-white/30 px-2 py-0.5 hover:bg-white/10"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* -------------------- render page -------------------- */

  return (
    <div className="flex-1 bg-background text-white">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-3 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link href="/admin" className="text-xs text-white/60 hover:text-white">
              ← Back to admin
            </Link>
            <h1 className="mt-2 text-2xl font-bold">
              {mode === "edit" ? "Edit story" : "Create story"}
            </h1>
            <p className="text-xs text-white/60">
              Build the article layout visually, then publish it as a top story.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-full bg-lime-400 px-4 py-2 text-xs font-semibold text-black disabled:opacity-60"
          >
            {isPending
              ? mode === "edit"
                ? "Saving changes…"
                : "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Save story"}
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* ---------- Left: editor ---------- */}
          <section className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-4">
            <h2 className="text-sm font-semibold">Story setup</h2>

            <div className="space-y-2">
              <label className="text-[11px] text-white/60">Title</label>
              <input
                className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Story title…"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-white/60">
                Subtitle / short teaser
              </label>
              <input
                className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm break-all"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Short summary shown on cards…"
              />
            </div>

            {/* ⭐ SPOILER CHECKBOX */}
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
              />
              <span className="text-white/80">This article contains spoilers</span>
            </div>

            {/* NEW: Author section */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide">
                Author
              </h3>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                {/* Left: dropdown + text fields */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">Choose author</label>
                    <select
                      className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                      value={selectedAuthorId}
                      onChange={(e) => handleAuthorSelect(e.target.value)}
                    >
                      <option value="custom">Custom author…</option>
                      {authorOptions.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">Author name</label>
                    <input
                      className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                      value={authorName}
                      onChange={(e) => {
                        setSelectedAuthorId("custom");
                        setAuthorName(e.target.value);
                      }}
                      placeholder="e.g. Alex Johnson"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">Author role</label>
                    <input
                      className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                      value={authorRole}
                      onChange={(e) => {
                        setSelectedAuthorId("custom");
                        setAuthorRole(e.target.value);
                      }}
                      placeholder="e.g. Senior Editor, Reviewer"
                    />
                  </div>
                </div>

                {/* Right: avatar column, centered, no label */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative h-48 w-48 rounded-full overflow-hidden border border-white/60 bg-black/50 flex-shrink-0">
                    {authorAvatarUrl ? (
                      <Image
                        src={authorAvatarUrl}
                        alt={authorName || "Author avatar"}
                        fill
                        sizes="192px"
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

            {/* SEO fields in collapsible section */}
            <div className="pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSeoOpen((v) => !v)}
                className="flex w-full items-center justify-between text-xs font-semibold text-white/80 uppercase tracking-wide"
              >
                <span>SEO (advanced)</span>
                <span className="text-[10px] text-white/60">
                  {seoOpen ? "Hide ▲" : "Show ▼"}
                </span>
              </button>

              {seoOpen && (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-white/60">
                        Slug (URL part)
                      </label>
                      <input
                        className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                        value={slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          setSlug(e.target.value);
                        }}
                        placeholder="auto-generated-from-title"
                      />
                      <p className="text-[10px] text-white/40">
                        e.g. <span className="italic">best-indie-rpgs-2025</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-white/60">
                        Meta title (SEO)
                      </label>
                      <input
                        className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs"
                        value={metaTitle}
                        onChange={(e) => {
                          setMetaTitleTouched(true);
                          setMetaTitle(e.target.value);
                        }}
                        placeholder="Browser / search result title…"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">
                      Meta description (SEO)
                    </label>
                    <textarea
                      className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs min-h-[60px] resize-none"
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder="Short summary for search engines…"
                    />
                    <p className="text-[10px] text-white/40">
                      Around 140–160 characters works best.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-white/60">Hero image</label>
              <NewsImageUpload
                label="Hero image"
                value={heroImage}
                onChange={setHeroImage}
              />
            </div>

            <div className="pt-4 space-y-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Content blocks</h3>
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

          {/* ---------- Right: live preview ---------- */}
          <section className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Live preview</h2>
              <button
                type="button"
                onClick={() => setIsSocialPreviewOpen(true)}
                className="rounded-full border border-white/30 px-3 py-1 text-[11px] text-white hover:bg-white/10"
              >
                Social preview
              </button>
            </div>

            <div ref={previewRef} className="mx-auto w-full max-w-3xl">
              <div className="space-y-3">
                {heroImage ? (
                  <div className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-black/50">
                    <Image
                      src={heroImage}
                      alt={title || "Hero image"}
                      fill
                      sizes="(min-width: 1200px) 900px, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/40 text-xs text-white/50">
                    Pick a hero image to see how it looks here.
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-white/60">
                    {new Date().toLocaleDateString()}
                  </p>
                  <h1 className="text-2xl font-extrabold leading-tight">
                    {title || "Story title"}
                  </h1>
                  {subtitle && (
                    <p className="text-sm text-white/80 break-all">{subtitle}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                {/* article blocks */}
                {blocks.map((b, idx) => {
                  const marginClass =
                    idx === 0 ? "" : b.type === "embed" ? "mt-4" : "mt-6";

                  return (
                    <div key={b.id} className={marginClass}>
                      {renderPreviewBlock(b)}
                    </div>
                  );
                })}

                {/* author card at bottom */}
                {(authorName || authorRole || authorAvatarUrl || reviewedBy) && (
                  <div className="mt-6 rounded-2xl border border-white/15 bg-black/40 p-4 flex items-center gap-3">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden border border-white/40 bg-black/60 flex-shrink-0">
                      {authorAvatarUrl ? (
                        <Image
                          src={authorAvatarUrl}
                          alt={authorName || "Author avatar"}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
                          A
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      {authorName && (
                        <p className="text-xs font-semibold text-white truncate">
                          By {authorName}
                        </p>
                      )}
                      {authorRole && (
                        <p className="text-[11px] text-white/60 truncate">
                          {authorRole}
                        </p>
                      )}
                      {reviewedBy && (
                        <p className="text-[10px] text-white/50 mt-0.5 truncate">
                          {reviewedBy}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {isSocialPreviewOpen && (
        <SocialPreviewTesterModal
          slug={slug}
          title={title}
          subtitle={subtitle}
          metaTitle={metaTitle}
          metaDescription={metaDescription}
          heroImage={heroImage}
          onClose={() => setIsSocialPreviewOpen(false)}
        />
      )}
    </div>
  );
}
