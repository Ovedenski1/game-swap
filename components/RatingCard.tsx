// components/RatingCard.tsx
import Image from "next/image";
import Link from "next/link";

type RatingCardProps = {
  id: string;
  slug?: string | null;

  // allow both shapes to keep it compatible with old code
  title?: string;
  game_title?: string;

  img?: string | null;
  image_url?: string | null;

  score: number;
  summary?: string | null;
};

export default function RatingCard(props: RatingCardProps) {
  const {
    id,
    slug,
    title,
    game_title,
    img,
    image_url,
    score,
    summary,
  } = props;

  // use slug if present, otherwise fall back to id
  const href = `/ratings/${slug || id}`;

  const displayTitle = title || game_title || "Untitled game";
  const coverImage =
    (img && img.trim()) ||
    (image_url && image_url.trim()) ||
    "/placeholder-rating-cover.jpg";

  const scoreLabel =
    typeof score === "number" && !Number.isNaN(score)
      ? score.toFixed(1)
      : "--";

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_18px_45px_rgba(0,0,0,0.6)] transition-all hover:-translate-y-1 hover:border-lime-400/70 hover:shadow-[0_24px_70px_rgba(0,0,0,0.85)]"
    >
      {/* COVER IMAGE */}
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        <Image
          src={coverImage}
          alt={displayTitle}
          fill
          sizes="(min-width: 1024px) 360px, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* SCORE BADGE */}
        <div className="absolute left-3 bottom-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500 text-xs font-bold shadow-[0_0_22px_rgba(248,113,113,0.7)]">
            {scoreLabel}
          </div>
          <span className="hidden rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/80 sm:inline-flex">
            Score
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-lime-300">
          {displayTitle}
        </h3>

        {summary && (
          <p className="mt-1 line-clamp-3 text-xs text-white/65">
            {summary}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-white/60">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
            <span>Read review</span>
          </span>
          <span className="opacity-60 group-hover:opacity-100">→</span>
        </div>
      </div>
    </Link>
  );
}
