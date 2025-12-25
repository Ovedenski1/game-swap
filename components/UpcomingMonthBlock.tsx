import type { UpcomingGameRow } from "@/lib/actions/home-content";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function UpcomingMonthBlock({
  year,
  month,
  monthLabel,
  items,
}: {
  year: number;
  month: number;
  monthLabel: string;
  items: UpcomingGameRow[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10">
        <div className="text-sm font-extrabold tracking-wide text-white">
          {monthLabel}
        </div>
        <div className="text-xs text-white/50 mt-0.5">
          {items.length > 0 ? `${items.length} игри` : "Няма добавени"}
        </div>
      </div>

      <div className="px-4 py-3">
        {items.length === 0 ? (
          <div className="text-sm text-white/60">
            Няма игри за този месец.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {items.map((g) => {
              const dateLabel =
                g.day != null && month !== 13
                  ? `${pad2(g.day)}.${pad2(month)}.${year}`
                  : month === 13
                  ? "TBA"
                  : `—.${pad2(month)}.${year}`;

              return (
                <div key={g.id} className="py-3">
                  <div className="font-semibold text-white/90">
                    <span className="text-white/60 mr-2">{dateLabel}</span>
                    {g.title}
                  </div>
                  {g.studio ? (
                    <div className="text-xs text-white/55 mt-1">
                      {g.studio}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
