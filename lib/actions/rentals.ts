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
type Row = Record<string, unknown>;

function asRow(v: unknown): Row {
  return typeof v === "object" && v !== null ? (v as Row) : {};
}

function toStringValue(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function toNullableString(v: unknown): string | null {
  return v == null ? null : typeof v === "string" ? v : String(v);
}

function toNumberValue(v: unknown, fallback = 0): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toBooleanValue(v: unknown): boolean {
  return Boolean(v);
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => toStringValue(x)).filter(Boolean) : [];
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function mapRentalGame(input: unknown): RentalGame {
  const g = asRow(input);
  return {
    id: toStringValue(g.id),
    slug: toNullableString(g.slug),
    title: toStringValue(g.title),
    platform: toStringValue(g.platform),
    description: toNullableString(g.description),
    cover_url: toNullableString(g.cover_url),
    price_type: toStringValue(g.price_type) as RentalGame["price_type"],
    price_amount: toNumberValue(g.price_amount),
    total_copies: toNumberValue(g.total_copies),
    available_copies: toNumberValue(g.available_copies),
    genres: toStringArray(g.genres),
    is_active: toBooleanValue(g.is_active),
    created_at: toStringValue(g.created_at),
  };
}

function mapRentalRequest(input: unknown): RentalRequest {
  const r = asRow(input);

  const rentalGame = r.rental_game == null ? null : asRow(r.rental_game);
  const user = r.user == null ? null : asRow(r.user);

  return {
    id: toStringValue(r.id),
    rental_game_id: toStringValue(r.rental_game_id),
    user_id: toStringValue(r.user_id),
    status: toStringValue(r.status),
    shipping_address: toStringValue(r.shipping_address),
    city: toStringValue(r.city),
    delivery_type: (toStringValue(r.delivery_type) as "home" | "office") || "home",
    phone_number: toStringValue(r.phone_number),
    first_name: toStringValue(r.first_name),
    last_name: toStringValue(r.last_name),
    notes: toNullableString(r.notes),
    reserved_until: toNullableString(r.reserved_until),
    start_date: toNullableString(r.start_date),
    due_date: toNullableString(r.due_date),
    created_at: toStringValue(r.created_at),

    rental_game: rentalGame
      ? {
          title: toStringValue(rentalGame.title),
          platform: toStringValue(rentalGame.platform),
          cover_url: toNullableString(rentalGame.cover_url),
          price_type: toStringValue(rentalGame.price_type),
          price_amount: toNumberValue(rentalGame.price_amount),
        }
      : null,

    user: user
      ? {
          full_name: toStringValue(user.full_name),
          username: toStringValue(user.username),
          email: toStringValue(user.email),
          avatar_url: toStringValue(user.avatar_url),
        }
      : null,
  };
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

  return ((data as unknown[] | null | undefined) ?? []).map(mapRentalGame);
}

/* ---------------- Single Game (Slug Only) ---------------- */
export async function getRentalGame(
  idOrSlug: string,
): Promise<RentalGame | null> {
  const supabase = await createClient();
  if (looksLikeUuid(idOrSlug)) return null;

  const { data, error } = await supabase
    .from("rental_games")
    .select("*")
    .eq("slug", idOrSlug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapRentalGame(data);
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
  notes?: string,
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

  const rentalRequestId = toStringValue(data);

  const { data: gameData } = await supabase
    .from("rental_games")
    .select("title, platform")
    .eq("id", gameId)
    .maybeSingle();

  const gameRow = gameData ? asRow(gameData) : {};
  const gameTitle = toStringValue(gameRow.title);

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  await supabase.from("notifications_user").insert([
    {
      user_id: user?.id,
      title: "Rental request created",
      message: `Your rental request for ${gameTitle} was submitted!`,
      link: "/profile/my-rentals",
    },
  ]);

  await supabase.from("notifications_admin").insert([
    {
      title: "New rental request",
      message: `${user?.email || "User"} requested ${gameTitle}`,
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

  return ((data as unknown[] | null | undefined) ?? []).map(mapRentalRequest);
}

/* ---------------- Admin: Update Status ---------------- */
export async function adminUpdateRentalStatus(requestId: string, status: string) {
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("rental_requests")
    .select("user_id, rental_game_id")
    .eq("id", requestId)
    .maybeSingle();

  const requestRow = request ? asRow(request) : {};

  const { error } = await supabase.rpc("admin_update_rental_status", {
    p_request_id: requestId,
    p_status: status,
  });

  if (error) throw error;

  const userId = toNullableString(requestRow.user_id);

  if (userId) {
    await supabase.from("notifications_user").insert([
      {
        user_id: userId,
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

  const title = toStringValue(formData.get("title"));
  const platform = toStringValue(formData.get("platform"));
  const totalCopies = Number(formData.get("total_copies"));
  const priceAmount = Number(formData.get("price_amount"));
  const genres = formData.getAll("genres").map((g) => toStringValue(g)).filter(Boolean);
  const description = toStringValue(formData.get("description"), "");
  const coverFile = formData.get("cover");

  const slug = slugify(title);
  let coverUrl: string | null = null;

  const cover = coverFile instanceof File ? coverFile : null;

  if (cover) {
    const fileName = `${Date.now()}_${cover.name}`;
    const fileBuffer = Buffer.from(await cover.arrayBuffer());

    const { data, error } = await supabase.storage
      .from("rental_covers")
      .upload(fileName, fileBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: cover.type || "image/jpeg",
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
    description,
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
