// lib/actions/admin-rentals.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export type RentalRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "shipped"
  | "playing"
  | "returned"
  | "cancelled"
  | string;

export type AdminRentalRequestRow = {
  id: string;
  status: RentalRequestStatus;
  shipping_address: string | null;
  notes: string | null;
  created_at: string | null;
  start_date: string | null;
  due_date: string | null;

  rental_games: {
    id: string;
    title: string | null;
    platform: string | null;
  } | null;

  users: {
    id: string;
    username: string | null;
    email: string | null;
  } | null;
};

export async function adminGetRentalRequests(): Promise<AdminRentalRequestRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rental_requests")
    .select(
      `
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
    `,
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[adminGetRentalRequests]", error);
    return [];
  }

  // Supabase returns unknown-ish rows; we shape-cast to our known structure
  return data as unknown as AdminRentalRequestRow[];
}
