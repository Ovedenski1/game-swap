// app/ratings/page.tsx
import { createClient } from "@/lib/supabase/server";
import RatingCard from "@/components/RatingCard";

type RatingsPageProps = {
  searchParams?: {
    q?: string;
    sort?: string;
  };
};

function getSortConfig(sortParam: string | undefined) {
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

export default async function RatingsPage({ searchParams }: RatingsPageProps) {
  const q = (searchParams?.q || "").trim();
  const sortParam = searchParams?.sort || "newest";
  const sort = getSortConfig(sortParam);

  const supabase = await createClient();

  let query = supabase
    .from("ratings")
    .select("*") // we only use a few fields; * keeps it flexible
    .order(sort.column, { ascending: sort.ascending });

  if (q) {
    query = query.ilike("game_title", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("RatingsPage Supabase error", error);
  }

  const ratings = (data || []).map((row: any) => ({
    id: String(row.id),
    title: (row.game_title as string) ?? "Untitled game",
    img:
      (row.image_url as string | null)?.trim() ||
      "/placeholder-rating-cover.jpg",
    score: (row.score as number) ?? 0,
    summary: (row.summary as string | null) ?? null,
    slug: (row.slug as string | null) ?? null,
  }));

  return (
    <div className="min-h-screen bg-background text-white">
      <main className="flex-1 flex">
        <div className="flex-1 max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 flex">
          <div className="flex-1 bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-b-3xl flex flex-col">
            <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
              <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                    Game Ratings
                  </h1>
                  <p className="text-xs sm:text-sm text-white/70 mt-1">
                    Browse all rated games. Filter by newest, oldest, title, or
                    score.
                  </p>
                </div>

                {/* Filters: plain GET form so no extra client code */}
                <form
                  method="GET"
                  className="flex flex-col sm:flex-row gap-2 sm:items-center"
                >
                  <input
                    type="text"
                    name="q"
                    defaultValue={q}
                    placeholder="Search by game title…"
                    className="w-full sm:w-56 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                  <select
                    name="sort"
                    defaultValue={sortParam}
                    className="w-full sm:w-40 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="title">Title (A–Z)</option>
                    <option value="score-desc">Score (highest)</option>
                    <option value="score-asc">Score (lowest)</option>
                  </select>
                </form>
              </header>

              {ratings.length === 0 ? (
                <p className="text-sm text-white/70">
                  No ratings found yet. Try changing the filters or add a rating
                  from the admin dashboard.
                </p>
              ) : (
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-8">
                  {ratings.map((r) => (
                    <RatingCard
                      key={r.id}
                      id={r.id}
                      slug={r.slug}
                      title={r.title}
                      img={r.img}
                      score={r.score}
                      summary={r.summary}
                    />
                  ))}
                </section>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-navbar border-t border-border text-foreground text-center py-4 text-xs sm:text-sm font-medium">
        © {new Date().getFullYear()} GameLink — Built with ❤️ using Next.js
      </footer>
    </div>
  );
}
