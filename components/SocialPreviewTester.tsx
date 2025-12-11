// components/SocialPreviewTester.tsx
"use client";

import React from "react";
import Image from "next/image";

type SocialPreviewTesterProps = {
  slug: string;
  title: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  heroImage: string;
};

const FALLBACK_DESCRIPTION =
  "Short description of your article will appear here. Around 140 characters works best.";

const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

function buildShareUrl(slug: string): string {
  const trimmed = slug.trim();
  const path = trimmed ? `/news/${trimmed}` : "/news/your-article-slug";
  return `${PUBLIC_SITE_URL}${path}`;
}

function getOgTitle(title: string, metaTitle: string): string {
  const t = metaTitle.trim() || title.trim();
  return t || "Example article title for social previews";
}

function getOgDescription(
  subtitle: string,
  metaDescription: string,
): string {
  const d = metaDescription.trim() || subtitle.trim();
  return d || FALLBACK_DESCRIPTION;
}

function getDomainFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "gameswap.example";
  }
}

const SocialPreviewTester: React.FC<SocialPreviewTesterProps> = ({
  slug,
  title,
  subtitle,
  metaTitle,
  metaDescription,
  heroImage,
}) => {
  const shareUrl = buildShareUrl(slug);
  const domain = getDomainFromUrl(shareUrl);
  const ogTitle = getOgTitle(title, metaTitle);
  const ogDescription = getOgDescription(subtitle, metaDescription);
  const hasImage = Boolean(heroImage.trim());

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-4 mt-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Social preview tester</h2>
        <p className="text-[10px] text-white/50 text-right">
          Uses hero image + SEO title / description. This is a visual
          approximation of how X / Discord / OG cards will look.
        </p>
      </div>

      {/* X / Twitter preview */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-white/50">
          X / Twitter card
        </p>
        <div className="overflow-hidden rounded-xl border border-white/15 bg-black/70 text-xs">
          {/* top bar with domain */}
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-[11px] text-white/60">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            <span className="truncate">{domain}</span>
          </div>

          <div className="flex flex-col sm:flex-row">
            {/* image on the left on desktop, top on mobile */}
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
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black flex items-center justify-center text-[10px] text-white/40">
                  No hero image yet
                </div>
              )}
            </div>

            {/* text */}
            <div className="flex-1 px-3 py-2 space-y-1 min-w-0">
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


      {/* X / Twitter preview */}
      <div className="space-y-2">
        ...
      </div>

      {/* Facebook / Meta preview */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-white/50">
          Facebook / Meta link preview
        </p>
        <div className="overflow-hidden rounded-xl border border-white/15 bg-[#18191a] text-xs">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-[11px] text-white/70">
            <span className="h-2 w-2 rounded-full bg-[#2d88ff]" />
            <span className="uppercase tracking-wide truncate">{domain}</span>
          </div>

          <div className="flex">
            <div className="relative w-24 sm:w-32 aspect-square bg-black/80 flex-shrink-0">
              {hasImage ? (
                <Image
                  src={heroImage}
                  alt={ogTitle}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-900 to-black text-[10px] text-white/45">
                  No hero image yet
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 px-3 py-2 space-y-1">
              <p className="font-semibold text-white leading-snug line-clamp-2">
                {ogTitle}
              </p>
              <p className="text-[11px] text-white/75 leading-snug line-clamp-3">
                {ogDescription}
              </p>
              <p className="mt-1 text-[10px] text-white/40 truncate">
                {shareUrl}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Discord / generic Open Graph preview */}
      <div className="space-y-2">
        ...
      </div>

      {/* Discord / generic Open Graph preview */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-white/50">
          Discord / generic Open Graph
        </p>
        <div className="overflow-hidden rounded-xl border border-[#5865F2]/40 bg-[#0b0d15] text-xs">
          {/* header with URL */}
          <div className="border-b border-white/5 px-3 py-2 text-[11px] text-white/60">
            {shareUrl}
          </div>

          <div className="flex flex-col sm:flex-row">
            {/* big image on top (mobile) or left (desktop) */}
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
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-slate-900 to-black flex items-center justify-center text-[10px] text-white/45">
                  No hero image yet
                </div>
              )}
            </div>

            <div className="flex-1 px-3 py-2 space-y-1 min-w-0">
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
    </section>
  );
};

export default SocialPreviewTester;
