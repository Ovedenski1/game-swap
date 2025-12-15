"use server";

import { createClient } from "@/lib/supabase/server";

export type RentalGame = {
  id: string;
  title: string;
  platform: string;
  description?: string | null;
  cover_url?: string | null;
  price_type: "free" | "paid" | "tiered" | string;
  price_amount: number;
  total_copies: number;
  available_copies: number;
  is_active: boolean;
  created_at: string;
};

export type RentalRequest = {
  id: string;
  rental_game_id: string;
  user_id: string;
  status: string;
  shipping_address: string;
  notes: string | null;
  reserved_until: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;

  rental_game: {
    title: string;
    platform: string;
    cover_url: string | null;
    price_type: string;
    price_amount: number;
  } | null;

  user: {
    full_name: string;
    username: string;
    email: string;
  } | null;
};

/* ---------------- Get Catalog ---------------- */
export async function getRentalCatalog() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rental_games")
    .select("*")
    .eq("is_active", true)
    .gt("available_copies", 0)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as RentalGame[];
}

/* ---------------- Single Game ---------------- */
export async function getRentalGame(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rental_games")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as RentalGame | null;
}

/* ---------------- User: Create Request ---------------- */
export async function createRentalRequest(gameId: string, shippingAddress: string, notes?: string) {
  const supabase = await createClient();

  // 1️⃣ Create the rental request using your existing DB function
  const { data, error } = await supabase.rpc("create_rental_request", {
    p_rental_game_id: gameId,
    p_shipping_address: shippingAddress,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  const rentalRequestId = data as string;

  // 2️⃣ Fetch details for notifications
  const { data: gameData } = await supabase
    .from("rental_games")
    .select("title, platform")
    .eq("id", gameId)
    .maybeSingle();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  const requesterName =
    (user?.user_metadata?.full_name || user?.email || "A user").split("@")[0];
  const gameTitle = gameData?.title || "a game";

  // 3️⃣ Notify the user about their own request
  await supabase.from("notifications_user").insert([
    {
      user_id: user?.id,
      title: "Rental request created",
      message: `Your rental request for ${gameTitle} was submitted!`,
      link: "/profile/my-rentals",
    },
  ]);

  // 4️⃣ Notify admin separately
  await supabase.from("notifications_admin").insert([
    {
      title: "New rental request",
      message: `${requesterName} requested ${gameTitle}`,
      link: "/admin/rentals",
    },
  ]);

  return rentalRequestId;
}

/* ---------------- Admin: Get All Requests ---------------- */
export async function adminGetRentalRequests() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rental_requests")
    .select(`
      id,
      rental_game_id,
      user_id,
      status,
      shipping_address,
      notes,
      reserved_until,
      start_date,
      due_date,
      created_at,
      rental_game:rental_games!rental_requests_rental_game_id_fkey (
        title,
        platform,
        cover_url,
        price_type,
        price_amount
      ),
      user:users!rental_requests_user_id_fkey (
        full_name,
        username,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as RentalRequest[];
}

/* ---------------- Admin: Update Status ---------------- */
export async function adminUpdateRentalStatus(requestId: string, status: string) {
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("rental_requests")
    .select("user_id, rental_game_id")
    .eq("id", requestId)
    .maybeSingle();

  const { error } = await supabase.rpc("admin_update_rental_status", {
    p_request_id: requestId,
    p_status: status,
  });
  if (error) throw error;

  // 🔔 Notify user about status change
  if (request?.user_id) {
    let msg = "";
    if (status === "approved") msg = "Your rental was approved!";
    else if (status === "shipped") msg = "Your rental has been shipped.";
    else if (status === "returned") msg = "Rental marked as returned.";
    else if (status === "rejected") msg = "Your rental was rejected.";
    else if (status === "cancelled") msg = "Your rental was cancelled.";

    if (msg) {
      await supabase.from("notifications_user").insert([
        {
          user_id: request.user_id,
          title: "Rental update",
          message: msg,
          link: "/profile/my-rentals",
        },
      ]);
    }
  }

  return true;
}
