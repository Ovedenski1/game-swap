// components/RatingCard.tsx
import Image from "next/image";
import Link from "next/link";

type RatingCardProps = {
  id: string;
  slug?: string | null;

  title?: string;
  game_title?: string;

  img?: string | null;
  image_url?: string | null;

  score: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toScore(score: number) {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  return clamp(Math.round(score), 1, 10);
}

function getTierClass(scoreValue: number | null) {
  if (!scoreValue) return "";
  if (scoreValue <= 3) return "score-badge--bronze";
  if (scoreValue <= 6) return "score-badge--silver";
  if (scoreValue <= 9) return "score-badge--gold";
  return "score-badge--diamond"; // 10
}

export default function RatingCard(props: RatingCardProps) {
  const { id, slug, title, game_title, img, image_url, score } = props;

  const href = `/ratings/${slug || id}`;
  const displayTitle = title || game_title || "Untitled game";

  const coverImage =
    (img && img.trim()) ||
    (image_url && image_url.trim()) ||
    "/placeholder-rating-cover.jpg";

  const scoreValue = toScore(score);
  const scoreLabel = scoreValue ?? "–";
  const tierClass = getTierClass(scoreValue);
  const isDiamond = tierClass === "score-badge--diamond";

  return (
    <Link href={href} className="group block w-[170px] sm:w-[180px] lg:w-[190px]">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-[0_18px_45px_rgba(0,0,0,0.45)] transition-all group-hover:-translate-y-1 group-hover:border-white/25">
        <div className="relative aspect-[2/3]">
          <Image
            src={coverImage}
            alt={displayTitle}
            fill
            sizes="(min-width: 1024px) 210px, (min-width: 640px) 190px, 170px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* SCORE BADGE */}
          <div className="absolute right-3 bottom-3 z-10">
            <div className={`score-badge ${tierClass}`} title="Rating">
              {isDiamond && <span className="score-badge__sparkles" />}
              <span className="score-badge__text">{scoreLabel}</span>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>
      </div>

      {/* TITLE ONLY */}
      <div className="mt-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-news">
          {displayTitle}
        </h3>
      </div>
    </Link>
  );
}
