"use client";

import type React from "react";
import { useMemo, useState, useTransition } from "react";
import { adminUpdateRentalStatus } from "@/lib/actions/rentals";
import type { RentalRequest } from "@/lib/actions/rentals";
import toast from "react-hot-toast";

type Status =
  | "pending"
  | "approved"
  | "shipped"
  | "playing"
  | "overdue"
  | "returned"
  | "rejected"
  | "cancelled";

const ORDER: Array<"all" | Status> = [
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

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Failed to update status";
}

export default function AdminRentalRequests({
  initialRequests,
}: {
  initialRequests: RentalRequest[];
}) {
  const [items, setItems] = useState<RentalRequest[]>(initialRequests);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<(typeof ORDER)[number]>("all");

  const filteredItems =
    filter === "all"
      ? items
      : items.filter((r) => String((r as any).status) === String(filter));

  const grouped = useMemo(() => {
    const by: Record<string, RentalRequest[]> = {};
    for (const r of filteredItems) {
      const st = String((r as any).status || "pending");
      (by[st] ||= []).push(r);
    }
    return by;
  }, [filteredItems]);

  function updateLocal(id: string, status: Status) {
    setItems((prev) =>
      prev.map((x) =>
        String((x as any).id) === String(id) ? ({ ...x, status } as any) : x,
      ),
    );
  }

  function setStatus(id: string, status: Status) {
    startTransition(async () => {
      try {
        await adminUpdateRentalStatus(id, status);
        updateLocal(id, status);
        toast.success(`Marked as ${status}`);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
              filter === s
                ? "bg-lime-400 text-black border-lime-400"
                : "border-white/30 text-white/70 hover:text-white hover:border-white/50"
            }`}
          >
            {s === "all" ? "All" : titleCase(s)}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <p className="text-white/60 text-center py-8">
          No {filter === "all" ? "" : String(filter)} rental requests.
        </p>
      ) : (
        ORDER.filter((s) => s !== "all").map((status) => {
          const list = grouped[status] || [];
          if (list.length === 0) return null;

          return (
            <section
              key={status}
              className="rounded-2xl border border-white/10 bg-[#0d0d0d]/80 p-4 shadow-lg"
            >
              <h2 className="text-sm font-bold uppercase tracking-wide text-white/80 mb-4">
                {status} <span className="text-white/40">({list.length})</span>
              </h2>

              <div className="space-y-3">
                {list.map((r) => (
                  <div
                    key={String((r as any).id)}
                    className="rounded-2xl border border-white/10 bg-black/30 p-4 flex items-start gap-4"
                  >
                    {/* User avatar */}
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                      {(r as any)?.user?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={(r as any).user.avatar_url}
                          alt={(r as any).user.full_name || "User avatar"}
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
                        {(r as any)?.rental_game?.title ?? "Unknown game"}{" "}
                        <span className="text-white/50 text-sm">
                          ({(r as any)?.rental_game?.platform ?? "—"})
                        </span>
                      </p>

                      <p className="text-xs text-white/60">
                        {(r as any).first_name} {(r as any).last_name} —{" "}
                        {(r as any)?.user?.email ?? "—"}
                      </p>

                      <p className="text-xs text-white/60">
                        <span className="text-white/50">City:</span>{" "}
                        {(r as any).city || "—"}
                      </p>

                      <p className="text-xs text-white/60 whitespace-pre-wrap">
                        <span className="text-white/50">Address:</span>{" "}
                        {(r as any).shipping_address || "—"}
                      </p>

                      <p className="text-xs text-white/60">
                        <span className="text-white/50">Phone:</span>{" "}
                        {(r as any).phone_number || "—"}
                      </p>

                      <p className="text-xs text-white/60">
                        <span className="text-white/50">Delivery:</span>{" "}
                        {(r as any).delivery_type || "—"}
                      </p>

                      {(r as any).notes && (
                        <p className="mt-1 text-xs text-white/70">
                          <span className="text-white/50">Notes:</span>{" "}
                          {(r as any).notes}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {status === "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => setStatus(String((r as any).id), "approved")}
                              className="rounded-xl bg-lime-400 text-black px-3 py-2 text-xs font-bold disabled:opacity-60"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => setStatus(String((r as any).id), "rejected")}
                              className="rounded-xl bg-red-500 text-white px-3 py-2 text-xs font-bold disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {status === "approved" && (
                          <>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => setStatus(String((r as any).id), "shipped")}
                              className="rounded-xl bg-white/10 text-white px-3 py-2 text-xs font-bold border border-white/15 disabled:opacity-60"
                            >
                              Mark shipped
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => setStatus(String((r as any).id), "cancelled")}
                              className="rounded-xl bg-red-500 text-white px-3 py-2 text-xs font-bold disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {(["shipped", "playing", "overdue"] as Status[]).includes(
                          status as Status,
                        ) && (
                          <>
                            {status !== "playing" && (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => setStatus(String((r as any).id), "playing")}
                                className="rounded-xl bg-lime-500 text-black px-3 py-2 text-xs font-bold disabled:opacity-60"
                              >
                                Mark playing
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => setStatus(String((r as any).id), "returned")}
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
