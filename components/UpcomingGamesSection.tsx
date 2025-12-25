import Link from "next/link";

export type UpcomingGameItem = {
  id: string;
  month_key: number; // 1..13 (13 = TBA)
  title: string;
  release_date: string | null; // "YYYY-MM-DD"
  studio: string | null;

  platforms: string[] | null; // ✅
  link_url: string | null; // ✅

  // kept for compatibility (but NOT rendered anymore)
  details_html: string | null;
};

const MONTHS_BG: { key: number; label: string }[] = [
  { key: 1, label: "ЯНУАРИ" },
  { key: 2, label: "ФЕВРУАРИ" },
  { key: 3, label: "МАРТ" },
  { key: 4, label: "АПРИЛ" },
  { key: 5, label: "МАЙ" },
  { key: 6, label: "ЮНИ" },
  { key: 7, label: "ЮЛИ" },
  { key: 8, label: "АВГУСТ" },
  { key: 9, label: "СЕПТЕМВРИ" },
  { key: 10, label: "ОКТОМВРИ" },
  { key: 11, label: "НОЕМВРИ" },
  { key: 12, label: "ДЕКЕМВРИ" },
  { key: 13, label: "TBA" },
];

function formatDateBG(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export default function UpcomingGamesSection({
  items,
  adminHref = "/admin",
}: {
  items: UpcomingGameItem[];
  adminHref?: string;
}) {
  const byMonth = new Map<number, UpcomingGameItem[]>();
  for (const m of MONTHS_BG) byMonth.set(m.key, []);
  for (const it of items) {
    const k = Number(it.month_key);
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k)!.push(it);
  }

  return (
    <section className="w-full pt-10">
      <div className="-mx-3 sm:-mx-6 lg:-mx-4 py-10 bg-surface/25">
        <div className="px-3 sm:px-6 lg:px-4">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Предстоящи игри
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                По месеци + TBA. Редактира се от админ панела.
              </p>
            </div>

            <Link
              href={adminHref}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-soft hover:border-white/25 hover:text-foreground transition"
            >
              Admin →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MONTHS_BG.map((m) => {
              const list = byMonth.get(m.key) || [];

              return (
                <div
                  key={m.key}
                  className="rounded-2xl border border-border bg-background/40 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-border bg-black/30">
                    <div className="font-extrabold tracking-wide text-lg">
                      {m.label}
                    </div>
                    <div className="text-xs text-text-muted">
                      {list.length ? `${list.length} заглавия` : "Няма добавени"}
                    </div>
                  </div>

                  <div className="p-4">
                    {list.length ? (
                      <div className="space-y-2">
                        {list.map((g) => {
                          const titleEl = g.link_url ? (
                            <a
                              href={g.link_url}
                              className="font-semibold text-white/95 hover:underline"
                              target={g.link_url.startsWith("http") ? "_blank" : undefined}
                              rel={g.link_url.startsWith("http") ? "noreferrer" : undefined}
                            >
                              {g.title}
                            </a>
                          ) : (
                            <span className="font-semibold text-white/95">{g.title}</span>
                          );

                          const platformText = g.platforms?.length ? g.platforms.join(", ") : null;

                          return (
                            <div key={g.id} className="py-1.5">
                              <div className="min-w-0">
                                <div className="line-clamp-2">{titleEl}</div>

                                <div className="mt-1 text-xs text-white/70">
                                  <span className="text-white/50">Дата:</span>{" "}
                                  {formatDateBG(g.release_date)}
                                  {g.studio ? (
                                    <>
                                      {" "}
                                      <span className="text-white/30">•</span>{" "}
                                      <span className="text-white/50">Студио:</span>{" "}
                                      {g.studio}
                                    </>
                                  ) : null}
                                  {platformText ? (
                                    <>
                                      {" "}
                                      <span className="text-white/30">•</span>{" "}
                                      <span className="text-white/50">Платформи:</span>{" "}
                                      {platformText}
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-white/50">
                        Няма игри за този месец.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-xs text-white/40">
            Tip: Ползвай <b>TBA</b> за игри без дата, после ги мести по месеци.
          </div>
        </div>
      </div>
    </section>
  );
}
