import { createClient } from "@/lib/supabase/server";
import type { RentalRequest } from "@/lib/actions/rentals";
import { MarkUserNotificationsRead } from "./mark-user-read"; // 👈 we'll add this next

export const dynamic = "force-dynamic";

type UserRentalSummary = Pick<
  RentalRequest,
  "id" | "status" | "shipping_address" | "start_date" | "due_date" | "created_at"
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
      <div className="text-center py-20 text-gray-400">
        Please sign in to view your rentals.
      </div>
    );
  }

  // 👇 use notifications_user now (not notifications)
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
      <div className="text-center py-20 text-red-400">
        Error loading rentals. Please try again later.
      </div>
    );
  }

  const rentals = data ?? [];

  if (rentals.length === 0) {
    return (
      <>
        <div className="text-center py-20 text-gray-400">
          You haven’t rented any games yet.
        </div>
      </>
    );
  }

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-500 text-black",
      approved: "bg-blue-500 text-white",
      shipped: "bg-purple-500 text-white",
      returned: "bg-green-500 text-white",
      rejected: "bg-red-500 text-white",
      cancelled: "bg-gray-500 text-white",
    };
    return map[status] || "bg-gray-400 text-black";
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* 👇 client component handles mark-read for client session */}
      <MarkUserNotificationsRead />

      <h1 className="text-3xl font-bold mb-8 text-white">My Rentals</h1>
      <div className="grid gap-4">
        {rentals.map((rental) => (
          <div
            key={rental.id}
            className="flex items-center gap-4 bg-[#121212] p-4 rounded-xl border border-neutral-800"
          >
            {rental.rental_game?.cover_url ? (
              <img
                src={rental.rental_game.cover_url}
                alt={rental.rental_game.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-neutral-800 rounded-lg flex items-center justify-center text-gray-500">
                🎮
              </div>
            )}

            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">
                {rental.rental_game?.title}
              </h2>
              <p className="text-sm text-gray-400">
                {rental.rental_game?.platform}
              </p>
              <p className="text-xs text-gray-500">
                Requested:{" "}
                {new Date(rental.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>

              {rental.start_date && rental.due_date && (
                <p className="text-xs text-gray-500">
                  Due:{" "}
                  {new Date(rental.due_date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>

            <span
              className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(
                rental.status
              )}`}
            >
              {rental.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
