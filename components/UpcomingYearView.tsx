"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { UpcomingGameRow } from "@/lib/actions/home-content";
import UpcomingMonthBlock from "./UpcomingMonthBlock";

const MONTHS: { key: number; label: string }[] = [
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

export default function UpcomingYearView({
  year,
  items,
}: {
  year: number;
  items: UpcomingGameRow[];
}) {
  const grouped = useMemo(() => {
    const map = new Map<number, UpcomingGameRow[]>();
    for (const m of MONTHS) map.set(m.key, []);
    for (const it of items) {
      const arr = map.get(it.month) ?? [];
      arr.push(it);
      map.set(it.month, arr);
    }
    return map;
  }, [items]);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return [now - 1, now, now + 1, now + 2];
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="text-white/70 text-sm font-semibold">
          Година:{" "}
          <select
            className="ml-2 rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            value={year}
            onChange={(e) => {
              const y = e.target.value;
              window.location.href = `/upcoming?year=${y}`;
            }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <Link
          href="/admin/upcoming"
          className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/30 hover:text-white transition"
        >
          Админ →
        </Link>
      </div>

      {/* ✅ FIX HERE: items-start */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
        {MONTHS.map((m) => (
          <UpcomingMonthBlock
            key={m.key}
            month={m.key}
            monthLabel={m.label}
            year={year}
            items={grouped.get(m.key) ?? []}
          />
        ))}
      </div>
    </div>
  );
}
