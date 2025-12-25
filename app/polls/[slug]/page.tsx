import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPollBySlug } from "@/lib/actions/polls";
import { isPollActive } from "@/lib/polls-utils";
import PollRunner from "@/components/PollRunner";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return null;
  }
}

export default async function PollDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const poll = await getPollBySlug(slug);
  if (!poll) return notFound();

  const active = isPollActive(poll);

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1200px] px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
        <Link
          href="/polls"
          className="inline-flex items-center text-xs sm:text-sm text-white/65 hover:text-white transition mb-4"
        >
          ← Back to polls
        </Link>

        {poll.hero_image_url ? (
          <div className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden border border-white/10 bg-black/30 shadow-[0_14px_60px_rgba(0,0,0,0.45)]">
            <Image
              src={poll.hero_image_url}
              alt={poll.title}
              fill
              sizes="(min-width: 1024px) 1100px, 100vw"
              className={["object-cover", !active ? "grayscale" : ""].join(" ")}
              priority
            />

            <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/35 to-black/75" />

            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            </div>

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={[
                    "text-[10px] uppercase tracking-[0.18em] rounded-full border px-2.5 py-1 font-extrabold",
                    active
                      ? "border-lime-400/35 bg-lime-400/10 text-lime-200"
                      : "border-white/20 bg-white/5 text-white/70",
                  ].join(" ")}
                >
                  {active ? "ACTIVE" : "CLOSED"}
                </span>

                {poll.ends_at ? (
                  <span className="text-[11px] text-white/65">
                    {active ? "Ends" : "Ended"}: {formatDate(poll.ends_at)}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight leading-[0.95] drop-shadow-[0_10px_0_rgba(0,0,0,0.55)]">
                {poll.title}
              </h1>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-black/20 shadow-[0_14px_60px_rgba(0,0,0,0.35)] p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={[
                  "text-[10px] uppercase tracking-[0.18em] rounded-full border px-2.5 py-1 font-extrabold",
                  active
                    ? "border-lime-400/35 bg-lime-400/10 text-lime-200"
                    : "border-white/20 bg-white/5 text-white/70",
                ].join(" ")}
              >
                {active ? "ACTIVE" : "CLOSED"}
              </span>

              {poll.ends_at ? (
                <span className="text-[11px] text-white/65">
                  {active ? "Ends" : "Ended"}: {formatDate(poll.ends_at)}
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight leading-[0.95] drop-shadow-[0_10px_0_rgba(0,0,0,0.55)]">
              {poll.title}
            </h1>
          </div>
        )}

        {poll.description ? (
          <p className="mt-6 text-sm sm:text-base text-white/75 leading-relaxed whitespace-pre-wrap max-w-[85ch]">
            {poll.description}
          </p>
        ) : null}

        {/* ✅ no grayscale/opacity here anymore */}
        <div className="mt-8">
          <PollRunner poll={poll} />
        </div>
      </div>
    </div>
  );
}
