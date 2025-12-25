import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { RentalRequest } from "@/lib/actions/rentals";
import { MarkUserNotificationsRead } from "./mark-user-read";

export const dynamic = "force-dynamic";

type UserRentalSummary = Pick<
  RentalRequest,
  | "id"
  | "status"
  | "shipping_address"
  | "start_date"
  | "due_date"
  | "created_at"
> & {
  rental_game: {
    title: string;
    platform: string;
    cover_url: string | null;
    price_type: string;
    price_amount: number;
  } | null;
};

export default async function MyRentalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background/30 p-8 shadow-[0_18px_45px_rgba(0,0,0,0.6)] text-center">
          <p className="text-sm text-text-muted mb-6">
            Please sign in to view your rentals.
          </p>

          <Link
            href="/auth"
            className="inline-flex items-center justify-center rounded-md bg-[#C6FF00] px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-black hover:bg-lime-300 transition"
          >
            Go to Login →
          </Link>
        </div>
      </div>
    );
  }

  await supabase
    .from("notifications_user")
    .update({ read: true })
    .eq("user_id", user.id);

  const { data, error } = await supabase
    .from("rental_requests")
    .select(
      `
        id,
        status,
        shipping_address,
        start_date,
        due_date,
        created_at,
        rental_game:rental_games!rental_requests_rental_game_id_fkey (
          title,
          platform,
          cover_url,
          price_type,
          price_amount
        )
      `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<UserRentalSummary[]>();

  if (error) {
    console.error(error);
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background/30 p-8 shadow-[0_18px_45px_rgba(0,0,0,0.6)] text-center">
          <p className="text-red-400 mb-2 font-semibold">Error loading rentals.</p>
          <p className="text-sm text-text-muted">Please try again later.</p>
        </div>
      </div>
    );
  }

  const rentals = data ?? [];

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-500 text-black",
      approved: "bg-blue-500 text-white",
      shipped: "bg-purple-500 text-white",
      playing: "bg-green-500 text-white",
      overdue: "bg-red-500 text-white",
      returned: "bg-lime-500 text-black",
      rejected: "bg-red-500 text-white",
      cancelled: "bg-gray-500 text-white",
    };
    return map[status] || "bg-gray-400 text-black";
  };

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
      {/* Header (client style) */}
      <header className="text-center">
        <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />

        <h1
          className={[
            "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
            "tracking-tight text-foreground leading-none",
            "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
          ].join(" ")}
        >
          My Rentals
        </h1>

        <p className="mt-3 text-xs sm:text-sm text-text-muted">
          View and manage your rental history
        </p>
      </header>

      <div className="mt-7 h-px w-full bg-border/40" />

      <MarkUserNotificationsRead />

      {rentals.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-background/40 p-8 text-center">
          <p className="text-sm text-text-muted">
            You haven’t rented any games yet.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4 max-w-3xl mx-auto">
          {rentals.map((rental) => {
            const today = new Date();
            const due = rental.due_date ? new Date(rental.due_date) : null;

            const daysLeft =
              due && rental.start_date
                ? Math.ceil(
                    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  )
                : null;

            const showTimer = ["playing", "overdue"].includes(rental.status);

            let timerText = "";
            let timerColor = "text-gray-400";

            if (showTimer) {
              if (
                rental.status === "overdue" ||
                (daysLeft !== null && daysLeft < 0)
              ) {
                timerText = "⏰ Overdue – please return";
                timerColor = "text-red-400";
              } else if (daysLeft !== null && daysLeft <= 3) {
                timerText = `⚠️ ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`;
                timerColor = "text-yellow-400";
              } else if (daysLeft !== null && daysLeft > 3) {
                timerText = `🕒 ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`;
                timerColor = "text-green-400";
              }
            }

            return (
              <div
                key={rental.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-background/40 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
              >
                {/* Game cover */}
                {rental.rental_game?.cover_url ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-black/20 flex-shrink-0">
                    <Image
                      src={rental.rental_game.cover_url}
                      alt={rental.rental_game.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-black/20 rounded-lg border border-border flex items-center justify-center text-white/40 flex-shrink-0">
                    🎮
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-white truncate">
                    {rental.rental_game?.title}
                  </h2>
                  <p className="text-sm text-white/60">
                    {rental.rental_game?.platform}
                  </p>

                  <p className="text-xs text-white/50">
                    Requested:{" "}
                    {new Date(rental.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>

                  {rental.start_date && rental.due_date && (
                    <p className="text-xs text-white/50">
                      Due:{" "}
                      {new Date(rental.due_date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}

                  {showTimer && timerText && (
                    <p className={`mt-1 text-xs font-semibold ${timerColor}`}>
                      {timerText}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <span
                  className={`shrink-0 px-3 py-1 rounded-full text-xs sm:text-sm font-medium capitalize ${getStatusColor(
                    rental.status
                  )}`}
                >
                  {rental.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
