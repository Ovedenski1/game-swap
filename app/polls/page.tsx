// app/polls/page.tsx
import Link from "next/link";
import Image from "next/image";
import { getPublishedPolls } from "@/lib/actions/polls";
import { isPollActive } from "@/lib/polls-utils";

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return null;
  }
}

function PollCard({
  href,
  title,
  description,
  imageUrl,
  badgeText,
  badgeTone,
  metaText,
  ctaText,
  concluded = false,
}: {
  href: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  badgeText: string;
  badgeTone: "active" | "closed";
  metaText: string | null;
  ctaText: string;
  concluded?: boolean;
}) {
  const badgeCls =
    badgeTone === "active"
      ? "border-news/35 bg-news/10 text-news"
      : "border-white/20 bg-white/5 text-white/70";

  return (
    <Link
      href={href}
      className={[
        "group relative overflow-hidden", // ✅ no normal border
        "bg-black/20 hover:bg-black/25 transition",
        "shadow-[0_10px_40px_rgba(0,0,0,0.35)]",
        concluded ? "opacity-75 grayscale hover:opacity-95" : "",
      ].join(" ")}
    >
      {/* ✅ CARD BORDER STYLE (like your red example) */}
      <div className="pointer-events-none absolute inset-0">
        {/* top + right “bracket” */}
        <span
          className={[
            "absolute top-0 left-0 right-0 h-[70%]", // right border only 70% height
            "border-t border-r border-news/55",
            "opacity-70 transition-opacity",
            "group-hover:opacity-100 group-hover:border-news",
          ].join(" ")}
        />

        {/* left + bottom “bracket” */}
        <span
          className={[
            "absolute left-0 top-0 bottom-0 w-[70%]", // bottom border only 70% width
            "border-l border-b border-news/55",
            "opacity-70 transition-opacity",
            "group-hover:opacity-100 group-hover:border-news",
          ].join(" ")}
        />
      </div>

      {/* image */}
      {imageUrl ? (
        <>
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className={[
              "object-cover transition duration-300",
              concluded ? "opacity-35" : "opacity-55 group-hover:opacity-70",
            ].join(" ")}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/75 via-black/45 to-black/70" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-tr from-black/55 via-black/35 to-black/55" />
      )}

      {/* subtle edge glow (kept) */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition">
        <div className="absolute inset-0 ring-1 ring-white/10" />
        <div className="absolute -inset-px bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
      </div>

      <div className="relative p-4 min-h-[170px] flex flex-col justify-between">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span
              className={[
                "text-[10px] uppercase tracking-[0.18em] border px-2 py-0.5 font-extrabold",
                badgeCls,
              ].join(" ")}
            >
              {badgeText}
            </span>

            {metaText ? (
              <span className="text-[11px] text-white/55">{metaText}</span>
            ) : null}
          </div>

          <h3 className="text-[13px] sm:text-sm font-extrabold leading-snug line-clamp-2">
            {title}
          </h3>

          {description ? (
            <p className="text-[11px] text-white/70 leading-relaxed line-clamp-3">
              {description}
            </p>
          ) : null}
        </div>

        <div className="pt-3 flex items-center justify-between">
          <span
            className={[
              "text-xs font-extrabold tracking-wide",
              concluded ? "text-white/55" : "text-news",
            ].join(" ")}
          >
            {ctaText} ↗
          </span>

          <span className="border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-white/60 group-hover:text-white/80 transition">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function PollsPage() {
  const polls = await getPublishedPolls();
  const now = Date.now();

  const active = polls.filter((p) => isPollActive(p));
  const concluded = polls.filter((p) => {
    if (p.status === "archived") return true;
    if (p.ends_at && new Date(p.ends_at).getTime() <= now) return true;
    return !isPollActive(p);
  });

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1200px] px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
        <header className="mb-10 sm:mb-12 text-center">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.9] uppercase">
            Polls
          </h1>

          <p className="mt-3 text-sm sm:text-base text-white/65 max-w-[70ch] mx-auto">
            Vote while polls are active. Concluded polls are still viewable.
          </p>
        </header>

        {/* Active */}
        <section className="mb-10">
          <div className="flex items-end justify-between mb-3">
            <h2 className="text-lg font-extrabold tracking-wide">Active</h2>
            <span className="text-xs text-white/50">
              {active.length} poll{active.length === 1 ? "" : "s"}
            </span>
          </div>

          {active.length === 0 ? (
            <p className="text-sm text-white/70">No active polls right now.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {active.map((p) => (
                <PollCard
                  key={p.id}
                  href={`/polls/${p.slug}`}
                  title={p.title}
                  description={p.description ?? null}
                  imageUrl={p.card_image_url ?? null}
                  badgeText="ACTIVE"
                  badgeTone="active"
                  metaText={p.ends_at ? `Ends: ${formatDate(p.ends_at)}` : null}
                  ctaText="Open poll"
                />
              ))}
            </div>
          )}
        </section>

        {/* Concluded */}
        <section>
          <div className="flex items-end justify-between mb-3">
            <h2 className="text-lg font-extrabold tracking-wide">Concluded</h2>
            <span className="text-xs text-white/50">
              {concluded.length} poll{concluded.length === 1 ? "" : "s"}
            </span>
          </div>

          {concluded.length === 0 ? (
            <p className="text-sm text-white/70">No concluded polls yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {concluded.map((p) => (
                <PollCard
                  key={p.id}
                  href={`/polls/${p.slug}`}
                  title={p.title}
                  description={p.description ?? null}
                  imageUrl={p.card_image_url ?? null}
                  badgeText="CLOSED"
                  badgeTone="closed"
                  metaText={p.ends_at ? `Ended: ${formatDate(p.ends_at)}` : null}
                  ctaText="View results"
                  concluded
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
