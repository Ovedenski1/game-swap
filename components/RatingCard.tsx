// components/RatingCard.tsx
import Link from "next/link";
import Image from "next/image";

type RatingCardProps = {
  id: string;
  slug?: string | null;
  title: string;
  img: string;
  score: number;
  summary?: string | null;
};

export default function RatingCard({
  id,
  slug,
  title,
  img,
  score,
  summary,
}: RatingCardProps) {
  const href = slug ? `/ratings/${slug}` : `/ratings/${id}`;

  return (
    <Link href={href} className="block group h-full">
      <article className="h-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_14px_40px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:-translate-y-1">
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          <Image
            src={img}
            alt={title}
            fill
            sizes="(min-width: 1024px) 360px, 100vw"
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute top-2 left-2 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white flex items-center gap-1">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-[11px] text-black">
              ★
            </span>
            <span>{score.toFixed(1)}</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-1">
          <h3 className="text-sm sm:text-base font-semibold line-clamp-2">
            {title}
          </h3>
          {summary && (
            <p className="text-xs sm:text-sm text-white/70 line-clamp-2">
              {summary}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
