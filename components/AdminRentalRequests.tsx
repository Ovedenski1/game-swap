"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import type { RentalRequest } from "@/lib/actions/rentals";
import { adminUpdateRentalStatus } from "@/lib/actions/rentals";

export default function AdminRentalRequests({
  initialRequests,
}: {
  initialRequests: RentalRequest[];
}) {
  const [items, setItems] = useState(initialRequests);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "shipped" | "returned" | "rejected"
  >("all");

  // Filter before grouping
  const filteredItems =
    filter === "all" ? items : items.filter((r) => r.status === filter);

  const grouped = useMemo(() => {
    const by: Record<string, RentalRequest[]> = {};
    for (const r of filteredItems) {
      by[r.status] ||= [];
      by[r.status].push(r);
    }
    return by;
  }, [filteredItems]);

  function updateLocal(id: string, status: string) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  function setStatus(id: string, status: string) {
    startTransition(async () => {
      await adminUpdateRentalStatus(id, status);
      updateLocal(id, status);
    });
  }

  const order = [
    "pending",
    "approved",
    "shipped",
    "returned",
    "expired",
    "cancelled",
    "rejected",
  ];

  return (
    <div className="space-y-6">
      {/* 🔹 Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["all", "pending", "approved", "shipped", "returned", "rejected"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s as any)}
              className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                filter === s
                  ? "bg-lime-400 text-black border-lime-400"
                  : "border-white/30 text-white/70 hover:text-white hover:border-white/50"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ),
        )}
      </div>

      {/* 🔹 No requests */}
      {filteredItems.length === 0 ? (
        <p className="text-white/60 text-center py-8">
          No {filter === "all" ? "" : filter} rental requests.
        </p>
      ) : (
        order.map((status) => {
          const list = grouped[status] || [];
          if (list.length === 0) return null;

          return (
            <section
              key={status}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <h2 className="text-sm font-bold uppercase tracking-wide text-white/80 mb-3">
                {status} <span className="text-white/40">({list.length})</span>
              </h2>

              <div className="space-y-3">
                {list.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-white/10 bg-black/35 p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative w-28 aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-black/40 flex-shrink-0">
                        {r.rental_game?.cover_url ? (
                          <Image
                            src={r.rental_game.cover_url}
                            alt={r.rental_game.title}
                            fill
                            className="object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold">
                          {r.rental_game?.title}{" "}
                          <span className="text-white/50 text-sm">
                            ({r.rental_game?.platform})
                          </span>
                        </p>

                        <p className="text-xs text-white/60">
                          User: {r.user?.username} — {r.user?.email}
                        </p>

                        <div className="mt-2 text-xs text-white/70 whitespace-pre-wrap">
                          <span className="text-white/50">Address:</span>{" "}
                          {r.shipping_address}
                        </div>

                        {r.notes && (
                          <div className="mt-2 text-xs text-white/70">
                            <span className="text-white/50">Notes:</span>{" "}
                            {r.notes}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {status === "pending" && (
                            <>
                              <button
                                disabled={pending}
                                onClick={() => setStatus(r.id, "approved")}
                                className="rounded-xl bg-lime-400/90 text-black px-3 py-2 text-xs font-bold disabled:opacity-60"
                              >
                                Approve
                              </button>
                              <button
                                disabled={pending}
                                onClick={() => setStatus(r.id, "rejected")}
                                className="rounded-xl bg-red-500/90 text-white px-3 py-2 text-xs font-bold disabled:opacity-60"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {status === "approved" && (
                            <>
                              <button
                                disabled={pending}
                                onClick={() => setStatus(r.id, "shipped")}
                                className="rounded-xl bg-white/10 text-white px-3 py-2 text-xs font-bold border border-white/15 disabled:opacity-60"
                              >
                                Mark shipped
                              </button>
                              <button
                                disabled={pending}
                                onClick={() => setStatus(r.id, "cancelled")}
                                className="rounded-xl bg-red-500/90 text-white px-3 py-2 text-xs font-bold disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {status === "shipped" && (
                            <button
                              disabled={pending}
                              onClick={() => setStatus(r.id, "returned")}
                              className="rounded-xl bg-white/10 text-white px-3 py-2 text-xs font-bold border border-white/15 disabled:opacity-60"
                            >
                              Mark returned
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
