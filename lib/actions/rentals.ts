"use server";

import { createClient } from "@/lib/supabase/server";

/* ---------------- Types ---------------- */
export type RentalGame = {
  id: string;
  slug?: string | null;
  title: string;
  platform: string;
  description?: string | null;
  cover_url?: string | null;
  price_type: "free" | "paid" | "tiered" | string;
  price_amount: number;
  total_copies: number;
  available_copies: number;
  genres: string[];
  is_active: boolean;
  created_at: string;
};

export type RentalRequest = {
  id: string;
  rental_game_id: string;
  user_id: string;
  status: string;
  shipping_address: string;
  delivery_type: "home" | "office";
  phone_number: string;
  first_name: string;
  last_name: string;
  city: string;
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
    avatar_url: string;
  } | null;
};

/* ---------------- Helpers ---------------- */
function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/* ---------------- Get Catalog ---------------- */
export async function getRentalCatalog(): Promise<RentalGame[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rental_games")
    .select("*")
    .eq("is_active", true)
    .gt("available_copies", 0)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((game) => ({
    ...game,
    genres: game.genres ?? [],
  })) as RentalGame[];
}

/* ---------------- Single Game (Slug Only) ---------------- */
export async function getRentalGame(idOrSlug: string): Promise<RentalGame | null> {
  const supabase = await createClient();
  if (looksLikeUuid(idOrSlug)) return null;

  const { data, error } = await supabase
    .from("rental_games")
    .select("*")
    .eq("slug", idOrSlug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    genres: data.genres ?? [],
  } as RentalGame;
}

/* ---------------- User: Create Request ---------------- */
export async function createRentalRequest(
  gameId: string,
  shippingAddress: string,
  deliveryType: "home" | "office",
  phoneNumber: string,
  firstName: string,
  lastName: string,
  city: string,
  notes?: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_rental_request", {
    p_rental_game_id: gameId,
    p_shipping_address: shippingAddress,
    p_delivery_type: deliveryType,
    p_phone_number: phoneNumber,
    p_first_name: firstName,
    p_last_name: lastName,
    p_city: city,
    p_notes: notes ?? null,
  });

  if (error) throw new Error(error.message || "Failed to create rental request.");

  const rentalRequestId = data as string;

  const { data: gameData } = await supabase
    .from("rental_games")
    .select("title, platform")
    .eq("id", gameId)
    .maybeSingle();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  await supabase.from("notifications_user").insert([
    {
      user_id: user?.id,
      title: "Rental request created",
      message: `Your rental request for ${gameData?.title} was submitted!`,
      link: "/profile/my-rentals",
    },
  ]);

  await supabase.from("notifications_admin").insert([
    {
      title: "New rental request",
      message: `${user?.email || "User"} requested ${gameData?.title}`,
      link: "/admin/rentals",
    },
  ]);

  return rentalRequestId;
}

/* ---------------- Admin: Get All Requests ---------------- */
export async function adminGetRentalRequests(): Promise<RentalRequest[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rental_requests")
    .select(`
      id,
      rental_game_id,
      user_id,
      status,
      shipping_address,
      city,
      delivery_type,
      phone_number,
      first_name,
      last_name,
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
        email,
        avatar_url
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

  if (request?.user_id) {
    await supabase.from("notifications_user").insert([
      {
        user_id: request.user_id,
        title: "Rental update",
        message: `Your rental status changed to ${status}.`,
        link: "/profile/my-rentals",
      },
    ]);
  }

  return true;
}

/* ---------------- Admin: Create new rental game ---------------- */
export async function adminCreateRentalGame(formData: FormData) {
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const platform = formData.get("platform") as string;
  const totalCopies = Number(formData.get("total_copies"));
  const priceAmount = Number(formData.get("price_amount"));
  const genres = formData.getAll("genres") as string[];
  const description = (formData.get("description") as string) || ""; // ✅ Added
  const coverFile = formData.get("cover") as File | null;

  const slug = slugify(title);
  let coverUrl: string | null = null;

  if (coverFile) {
    const fileName = `${Date.now()}_${coverFile.name}`;
    const fileBuffer = Buffer.from(await coverFile.arrayBuffer());

    const { data, error } = await supabase.storage
      .from("rental_covers")
      .upload(fileName, fileBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: coverFile.type || "image/jpeg",
      });

    if (error) throw new Error("Failed to upload cover image.");

    const { data: publicUrl } = supabase.storage
      .from("rental_covers")
      .getPublicUrl(data.path);

    coverUrl = publicUrl.publicUrl;
  }

  const { error } = await supabase.from("rental_games").insert({
    title,
    slug,
    platform,
    description, // ✅ Added
    total_copies: totalCopies,
    available_copies: totalCopies,
    price_amount: priceAmount,
    price_type: priceAmount === 0 ? "free" : "paid",
    genres,
    is_active: true,
    cover_url: coverUrl,
  });

  if (error) throw new Error(error.message);
  return { success: true };
}
