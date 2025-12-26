"use client";

import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";

import { adminUpdateRentalStatus } from "@/lib/actions/rentals";
import type { RentalRequest } from "@/lib/actions/rentals";

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

type UserShape = {
  avatar_url?: string | null;
  full_name?: string | null;
  email?: string | null;
};

type RentalGameShape = {
  title?: string | null;
  platform?: string | null;
};

type RentalRequestShape = RentalRequest & {
  id: string;
  status?: Status | string | null;
  first_name?: string | null;
  last_name?: string | null;
  city?: string | null;
  shipping_address?: string | null;
  phone_number?: string | null;
  delivery_type?: string | null;
  notes?: string | null;
  user?: UserShape | null;
  rental_game?: RentalGameShape | null;
};

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Failed to update status";
}

function isStatus(v: unknown): v is Status {
  return (
    v === "pending" ||
    v === "approved" ||
    v === "shipped" ||
    v === "playing" ||
    v === "overdue" ||
    v === "returned" ||
    v === "rejected" ||
    v === "cancelled"
  );
}

function getStatus(r: RentalRequestShape): Status {
  const s = r.status;
  if (isStatus(s)) return s;
  if (typeof s === "string" && isStatus(s)) return s;
  return "pending";
}

export default function AdminRentalRequests({
  initialRequests,
}: {
  initialRequests: RentalRequest[];
}) {
  const [items, setItems] = useState<RentalRequestShape[]>(
    (initialRequests as RentalRequestShape[]).map((r) => ({
      ...r,
      id: String((r as unknown as { id?: unknown }).id ?? ""),
    })),
  );

  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<(typeof ORDER)[number]>("all");

  const filteredItems =
    filter === "all"
      ? items
      : items.filter((r) => getStatus(r) === filter);

  const grouped = useMemo(() => {
    const by: Record<Status, RentalRequestShape[]> = {
      pending: [],
      approved: [],
      shipped: [],
      playing: [],
      overdue: [],
      returned: [],
      rejected: [],
      cancelled: [],
    };

    for (const r of filteredItems) {
      by[getStatus(r)].push(r);
    }

    return by;
  }, [filteredItems]);

  function updateLocal(id: string, status: Status) {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status } : x)),
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
        (ORDER.filter((s) => s !== "all") as Status[]).map((status) => {
          const list = grouped[status];
          if (!list.length) return null;

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
                {list.map((r) => {
                  const id = r.id;

                  const avatarUrl = r.user?.avatar_url ?? null;
                  const fullName = r.user?.full_name ?? null;
                  const email = r.user?.email ?? null;

                  const gameTitle = r.rental_game?.title ?? "Unknown game";
                  const gamePlatform = r.rental_game?.platform ?? "—";

                  const firstName = r.first_name ?? "";
                  const lastName = r.last_name ?? "";

                  const city = r.city ?? "—";
                  const shippingAddress = r.shipping_address ?? "—";
                  const phone = r.phone_number ?? "—";
                  const deliveryType = r.delivery_type ?? "—";
                  const notes = r.notes ?? null;

                  return (
                    <div
                      key={id}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4 flex items-start gap-4"
                    >
                      {/* User avatar */}
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarUrl}
                            alt={fullName || "User avatar"}
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
                          {gameTitle}{" "}
                          <span className="text-white/50 text-sm">
                            ({gamePlatform})
                          </span>
                        </p>

                        <p className="text-xs text-white/60">
                          {firstName} {lastName}
                          {" — "}
                          {email ?? "—"}
                        </p>

                        <p className="text-xs text-white/60">
                          <span className="text-white/50">City:</span> {city}
                        </p>

                        <p className="text-xs text-white/60 whitespace-pre-wrap">
                          <span className="text-white/50">Address:</span>{" "}
                          {shippingAddress}
                        </p>

                        <p className="text-xs text-white/60">
                          <span className="text-white/50">Phone:</span> {phone}
                        </p>

                        <p className="text-xs text-white/60">
                          <span className="text-white/50">Delivery:</span>{" "}
                          {deliveryType}
                        </p>

                        {notes ? (
                          <p className="mt-1 text-xs text-white/70">
                            <span className="text-white/50">Notes:</span> {notes}
                          </p>
                        ) : null}

                        {/* Action buttons */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {status === "pending" && (
                            <>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => setStatus(id, "approved")}
                                className="rounded-xl bg-lime-400 text-black px-3 py-2 text-xs font-bold disabled:opacity-60"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => setStatus(id, "rejected")}
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
                                onClick={() => setStatus(id, "shipped")}
                                className="rounded-xl bg-white/10 text-white px-3 py-2 text-xs font-bold border border-white/15 disabled:opacity-60"
                              >
                                Mark shipped
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => setStatus(id, "cancelled")}
                                className="rounded-xl bg-red-500 text-white px-3 py-2 text-xs font-bold disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {(["shipped", "playing", "overdue"] as Status[]).includes(
                            status,
                          ) && (
                            <>
                              {status !== "playing" && (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => setStatus(id, "playing")}
                                  className="rounded-xl bg-lime-500 text-black px-3 py-2 text-xs font-bold disabled:opacity-60"
                                >
                                  Mark playing
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => setStatus(id, "returned")}
                                className="rounded-xl bg-white/10 text-white px-3 py-2 text-xs font-bold border border-white/15 disabled:opacity-60"
                              >
                                Mark returned
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
