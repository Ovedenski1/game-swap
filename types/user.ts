export type UserProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  gender: "male" | "female" | "other" | null;
  birthdate: string | null;
  bio: string | null;
  avatar_url: string | null;
  preferences: Record<string, any> | null;
  location_lat: number | null;
  location_lng: number | null;
  last_active: string | null;
  is_verified: boolean | null;
  is_online: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  city: string | null;

  // 👇 NEW
  is_admin: boolean | null;
};
