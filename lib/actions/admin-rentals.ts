// lib/actions/admin-rentals.ts
import { createClient } from "@/lib/supabase/server";

export async function adminGetRentalRequests() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rental_requests")
    .select(`
      id,
      status,
      shipping_address,
      notes,
      created_at,
      start_date,
      due_date,
      rental_games (
        id,
        title,
        platform
      ),
      users (
        id,
        username,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[adminGetRentalRequests]", error);
    return [];
  }

  return data;
}
