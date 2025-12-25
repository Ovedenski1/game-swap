"use client";

import { useMemo, useState, useTransition } from "react";
import { adminUpdateRentalStatus } from "@/lib/actions/rentals";
import type { RentalRequest } from "@/lib/actions/rentals";
import toast from "react-hot-toast";

export default function AdminRentalRequests({
  initialRequests,
}: {
  initialRequests: RentalRequest[];
}) {
  const [items, setItems] = useState(initialRequests);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState("all");

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
      try {
        await adminUpdateRentalStatus(id, status);
        updateLocal(id, status);
        toast.success(`Marked as ${status}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to update status");
      }
    });
  }

  const order = [
    "all",
    "pending",
    "approved",
    "shipped",
    "playing",
    "overdue",
    "returned",
    "rejected",
    "cancelled",
  ];

  return (
    <div className="space-y-8">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {order.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
              filter === s
                ? "bg-lime-400 text-black border-lime-400"
                : "border-white/30 text-white/70 hover:text-white hover:border-white/50"
            }`}
          >
            {s === "all"
              ? "All"
              : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <p className="text-white/60 text-center py-8">
          No {filter === "all" ? "" : filter} rental requests.
        </p>
      ) : (
        order
          .filter((status) => status !== "all")
          .map((status) => {
            const list = grouped[status] || [];
            if (list.length === 0) return null;

            return (
              <section
                key={status}
                className="rounded-2xl border border-white/10 bg-[#0d0d0d]/80 p-4 shadow-lg"
              >
                <h2 className="text-sm font-bold uppercase tracking-wide text-white/80 mb-4">
                  {status}{" "}
                  <span className="text-white/40">({list.length})</span>
                </h2>

                <div className="space-y-3">
                  {list.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4 flex items-start gap-4"
                    >
                      {/* User avatar */}
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                        {r.user?.avatar_url ? (
                          <img
                            src={r.user.avatar_url}
                            alt={r.user.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-xs text-white/40">
                            No img
                          </div>
                        )}
                      </div>

                      {/* Game + details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white">
                          {r.rental_game?.title}{" "}
                          <span className="text-white/50 text-sm">
                            ({r.rental_game?.platform})
                          </span>
                        </p>

                        <p className="text-xs text-white/60">
                          {r.first_name} {r.last_name} — {r.user?.email}
                        </p>

                        <p className="text-xs text-white/60">
                          <span className="text-white/50">City:</span>{" "}
                          {r.city || "—"}
                        </p>

                        <p className="text-xs text-white/60 whitespace-pre-wrap">
                          <span className="text-white/50">Address:</span>{" "}
                          {r.shipping_address}
                        </p>

                        <p className="text-xs text-white/60">
                          <span className="text-white/50">Phone:</span>{" "}
                          {r.phone_number}
                        </p>

                        <p className="text-xs text-white/60">
                          <span className="text-white/50">Delivery:</span>{" "}
                          {r.delivery_type}
                        </p>

                        {r.notes && (
                          <p className="mt-1 text-xs text-white/70">
                            <span className="text-white/50">Notes:</span>{" "}
                            {r.notes}
                          </p>
                        )}

                        {/* Action buttons */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {status === "pending" && (
                            <>
                              <button
                                disabled={pending}
                                onClick={() => setStatus(r.id, "approved")}
                                className="rounded-xl bg-lime-400 text-black px-3 py-2 text-xs font-bold disabled:opacity-60"
                              >
                                Approve
                              </button>
                              <button
                                disabled={pending}
                                onClick={() => setStatus(r.id, "rejected")}
                                className="rounded-xl bg-red-500 text-white px-3 py-2 text-xs font-bold disabled:opacity-60"
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
                                className="rounded-xl bg-red-500 text-white px-3 py-2 text-xs font-bold disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {["shipped", "playing", "overdue"].includes(status) && (
                            <>
                              {status !== "playing" && (
                                <button
                                  disabled={pending}
                                  onClick={() => setStatus(r.id, "playing")}
                                  className="rounded-xl bg-lime-500 text-black px-3 py-2 text-xs font-bold disabled:opacity-60"
                                >
                                  Mark playing
                                </button>
                              )}
                              <button
                                disabled={pending}
                                onClick={() => setStatus(r.id, "returned")}
                                className="rounded-xl bg-white/10 text-white px-3 py-2 text-xs font-bold border border-white/15 disabled:opacity-60"
                              >
                                Mark returned
                              </button>
                            </>
                          )}
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
