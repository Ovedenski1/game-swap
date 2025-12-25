"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  initialQ: string;
  initialSort: string;
};

export default function RatingsFilters({ initialQ, initialSort }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(initialQ);
  const [sort, setSort] = useState(initialSort);

  // Keep local state in sync when user navigates back/forward
  useEffect(() => {
    setQ(initialQ);
    setSort(initialSort);
  }, [initialQ, initialSort]);

  const baseParams = useMemo(() => {
    // start from current params (so if you add more later they won't get lost)
    const sp = new URLSearchParams(searchParams?.toString() || "");
    return sp;
  }, [searchParams]);

  function pushNext(nextQ: string, nextSort: string) {
    const sp = new URLSearchParams(baseParams.toString());

    const qq = nextQ.trim();
    if (qq) sp.set("q", qq);
    else sp.delete("q");

    if (nextSort && nextSort !== "newest") sp.set("sort", nextSort);
    else sp.delete("sort");

    const qs = sp.toString();
    router.push(qs ? `/ratings?${qs}` : "/ratings");
  }

  // ✅ Auto-apply sort immediately
  function onSortChange(nextSort: string) {
    setSort(nextSort);
    pushNext(q, nextSort);
  }

  // OPTIONAL: live search (debounced)
  // If you want ONLY enter-to-search, comment this whole effect out.
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    // Live search debounce: 350ms
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => {
      pushNext(q, sort);
      debounceRef.current = null;
    }, 350);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]); // only when q changes

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by game title…"
        className="w-full sm:w-56 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
      />

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="w-full sm:w-40 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="title">Title (A–Z)</option>
        <option value="score-desc">Score (highest)</option>
        <option value="score-asc">Score (lowest)</option>
      </select>
    </div>
  );
}
