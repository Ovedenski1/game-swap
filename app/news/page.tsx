// app/news/page.tsx
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type StoryRow = {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  summary: string | null;
  image_url: string | null;
  created_at: string;
};

type TopStoryDbRow = {
  id: unknown;
  slug: unknown;
  title: unknown;
  subtitle: unknown;
  summary: unknown;
  image_url: unknown;
  created_at: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNullableString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function mapStoryRow(raw: unknown): StoryRow {
  const r: TopStoryDbRow = isRecord(raw) ? (raw as TopStoryDbRow) : ({} as TopStoryDbRow);

  return {
    id: String(r.id ?? ""),
    slug: asNullableString(r.slug),
    title: asString(r.title, "Untitled"),
    subtitle: asNullableString(r.subtitle),
    summary: asNullableString(r.summary),
    image_url: asNullableString(r.image_url),
    created_at: String(r.created_at ?? ""),
  };
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "";
  }
}

export default async function NewsIndexPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("top_stories")
    .select("id, slug, title, subtitle, summary, image_url, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  const stories: StoryRow[] = Array.isArray(data) ? data.map(mapStoryRow) : [];

  const hero = stories[0] ?? null;
  const rest = stories.slice(1);

  return (
    <main className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 py-8">
      {/* Header like "РЕЙТИНГИ" */}
      <div className="relative mb-6">
        <h1 className="text-center text-4xl sm:text-5xl font-extrabold tracking-tight uppercase">
          НОВИНИ
        </h1>

        <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden sm:block">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/5"
          >
            ← Back to home
          </Link>
        </div>

        <div className="mt-3 sm:hidden flex justify-end">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/5"
          >
            ← Back to home
          </Link>
        </div>
      </div>

      {/* HERO */}
      {hero && (
        <Link
          href={`/news/${hero.slug || hero.id}`}
          className="block group max-w-[980px] mx-auto"
          aria-label={hero.title}
        >
          <div className="relative overflow-hidden rounded-2xl">
            {/* Normal (not cropped) image */}
            {hero.image_url ? (
              <Image
                src={hero.image_url}
                alt={hero.title}
                width={1200}
                height={675}
                priority
                sizes="(min-width: 1200px) 980px, 100vw"
                className="w-full h-auto"
              />
            ) : (
              <div className="w-full aspect-[16/9] bg-black/30" />
            )}

            {/* Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

            {/* Text inside image */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <p className="text-[11px] sm:text-xs uppercase tracking-wide text-white/70">
                {fmtDate(hero.created_at)}
              </p>

              <h2 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
                {hero.title}
              </h2>

              {(hero.subtitle || hero.summary) && (
                <p className="mt-2 text-sm sm:text-base text-white/80 line-clamp-2 max-w-3xl">
                  {hero.subtitle || hero.summary}
                </p>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* LIST */}
      <section className="mt-8 space-y-6">
        {rest.map((s) => {
          const href = `/news/${s.slug || s.id}`;
          const desc = s.subtitle || s.summary;

          return (
            <Link
              key={s.id}
              href={href}
              className="block group max-w-[980px] mx-auto"
              aria-label={s.title}
            >
              <div className="flex gap-4">
                {/* thumb */}
                <div className="relative w-44 sm:w-52 flex-shrink-0 overflow-hidden rounded-xl">
                  {s.image_url ? (
                    <Image
                      src={s.image_url}
                      alt={s.title}
                      width={520}
                      height={292}
                      sizes="220px"
                      className="w-full h-auto"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-black/25" />
                  )}
                </div>

                {/* text */}
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide text-white/60">
                    {fmtDate(s.created_at)}
                  </p>

                  <h3 className="mt-1 text-lg sm:text-xl font-bold leading-snug line-clamp-2 group-hover:text-white">
                    {s.title}
                  </h3>

                  {desc && (
                    <p className="mt-1 text-sm text-white/75 line-clamp-2">
                      {desc}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 h-px w-full bg-white/10" />
            </Link>
          );
        })}
      </section>
    </main>
  );
}
