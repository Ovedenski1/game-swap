// /types/game.ts

export type GamePlatform =
  | "ps1"
  | "ps2"
  | "ps3"
  | "ps4"
  | "ps5"
  | "xbox"
  | "xbox360"
  | "xbox_one"
  | "xbox_series"
  | "switch"
  | "wii"
  | "wiiu"
  | "ds"
  | "3ds"
  | "pc"
  | "sega"
  | "other";

export interface Game {
  id: string;
  owner_id: string;
  title: string;
  platform: GamePlatform;
  description?: string | null;
  condition?: string | null;
  images: string[];
  created_at: string;
}
