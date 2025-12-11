"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export type NewsItem = {
  id: number | string;
  title: string;
  img: string;
  href?: string;      // where to go on click (e.g. /news/123 or external URL)
  badge?: string;     // for rating like "9.5"
  subtitle?: string;  // short description
  isSpoiler?: boolean;
};

type NewsCardProps = {
  item: NewsItem;
};

const MAX_SUBTITLE_CHARS = 140;

function truncate(text: string | undefined, maxLength = MAX_SUBTITLE_CHARS) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

export default function NewsCard({ item }: NewsCardProps) {
  const router = useRouter();
  const { title, img, href, badge, subtitle, isSpoiler  } = item;
  const shortSubtitle = truncate(subtitle);
  const clickable = Boolean(href);

  function handleClick() {
    if (!href) return;

    if (href.startsWith("http")) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(href);
  }

  return (
    <article
      data-interactive="true"           // 👈 important for the scroller
      onClick={handleClick}
      className={[
        "relative h-full overflow-hidden rounded-2xl border border-white/10 bg-black/40",
        clickable ? "cursor-pointer" : "",
      ].join(" ")}
    >
      <div className="relative aspect-[16/9]">
  {/* ⭐ SPOILER TAG */}
  {isSpoiler && (
    <div className="absolute right-3 top-3 z-10 rounded-full bg-red-600/90 backdrop-blur px-3 py-1 text-[10px] font-bold shadow-lg shadow-red-600/40">
  SPOILER
</div>
  )}

  {/* ⭐ BADGE (score) – move to right so it doesn't clash */}
  {badge && (
    <div className="absolute right-3 top-3 z-10 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold">
      {badge}
    </div>
  )}

  <Image
    src={img}
    alt={title}
    fill
    sizes="(min-width: 1024px) 420px, (min-width: 640px) 360px, 50vw"
    className="object-cover transition-transform duration-300 hover:scale-105"
  />

  <div className="pointer-events-none absolute inset-x-0 bottom-0">
    <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent">
      <div className="pointer-events-auto px-4 pb-4 pt-3">
        <h3 className="text-base font-semibold leading-tight line-clamp-2">
          {title}
        </h3>
        {shortSubtitle && (
          <p className="mt-1 text-sm text-white/80 line-clamp-3">
            {shortSubtitle}
          </p>
        )}
      </div>
    </div>
  </div>
</div>

    </article>
  );
}
