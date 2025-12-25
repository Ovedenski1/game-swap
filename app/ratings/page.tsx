// app/ratings/page.tsx
import { createClient } from "@/lib/supabase/server";
import RatingCard from "@/components/RatingCard";
import RatingsFilters from "@/components/RatingsFilters";

type RatingsPageProps = {
  searchParams?: Promise<{
    q?: string;
    sort?: string;
  }>;
};

type SortConfig = {
  column: "created_at" | "game_title" | "score";
  ascending: boolean;
  label: string;
};

function getSortConfig(sortParam: string | undefined): SortConfig {
  switch (sortParam) {
    case "oldest":
      return { column: "created_at", ascending: true, label: "Oldest" };
    case "title":
      return { column: "game_title", ascending: true, label: "Title (A–Z)" };
    case "score-asc":
      return { column: "score", ascending: true, label: "Score (lowest)" };
    case "score-desc":
      return { column: "score", ascending: false, label: "Score (highest)" };
    case "newest":
    default:
      return { column: "created_at", ascending: false, label: "Newest" };
  }
}

type RatingRow = {
  id: string | number;
  game_title: string | null;
  image_url: string | null;
  score: number | null;
  summary: string | null;
  slug: string | null;
};

export default async function RatingsPage({ searchParams }: RatingsPageProps) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q || "").trim();
  const sortParam = sp.sort || "newest";
  const sort = getSortConfig(sortParam);

  const supabase = await createClient();

  // ✅ Explicit select list so TS can infer a stable shape
  let query = supabase
    .from("ratings")
    .select("id, game_title, image_url, score, summary, slug")
    .order(sort.column, { ascending: sort.ascending });

  if (q) {
    query = query.ilike("game_title", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("RatingsPage Supabase error", error);
  }

  const rows = (data ?? []) as RatingRow[];

  const ratings = rows.map((row) => ({
    id: String(row.id),
    title: row.game_title ?? "Untitled game",
    img: row.image_url?.trim() || "/placeholder-rating-cover.jpg",
    score: row.score ?? 0,
    summary: row.summary ?? null,
    slug: row.slug ?? null,
  }));

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-6 py-8">
      {/* Header (Poll Editor style) */}
      <header className="text-center">
        <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />

        <h1
          className={[
            "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
            "tracking-tight text-foreground leading-none",
            "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
          ].join(" ")}
        >
          Game Ratings
        </h1>

        <p className="mt-3 text-xs sm:text-sm text-text-muted">
          Browse all rated games. Filter by newest, oldest, title, or score.
        </p>

        <div className="mt-6 flex justify-center">
          <RatingsFilters initialQ={q} initialSort={sortParam} />
        </div>
      </header>

      <div className="mt-7 h-px w-full bg-border/40" />

      <div className="mt-6">
        {ratings.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-10">
            No ratings found yet. Try changing the filters or add a rating from
            the admin dashboard.
          </p>
        ) : (
          <section
            className={[
              "grid pb-8",
              "gap-4 lg:gap-5",
              "sm:grid-cols-2",
              "lg:grid-cols-3",
              "xl:grid-cols-4",
              "2xl:grid-cols-5",
            ].join(" ")}
          >
            {ratings.map((r) => (
              <RatingCard
                key={r.id}
                id={r.id}
                slug={r.slug}
                title={r.title}
                img={r.img}
                score={r.score}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
