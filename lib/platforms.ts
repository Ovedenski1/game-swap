// lib/platforms.ts
import type { IconType } from "react-icons";
import { FaPlaystation, FaXbox, FaWindows } from "react-icons/fa";
import { SiNintendoswitch } from "react-icons/si";

export type PlatformKey =
  | "PS5"
  | "PS4"
  | "Xbox One"
  | "Xbox Series X|S"
  | "Switch"
  | "Switch 2"
  | "PC";

export type PlatformIconEntry = {
  label: string;
  Icon: IconType;
  iconClassName: string;

  // simple badge (text)
  badge?: string;

  // split badge (for X|S)
  badgeParts?: { left: string; right: string };

  badgeClassName?: string;
};

export const PLATFORM_ICONS: Record<PlatformKey, PlatformIconEntry> = {
  PS5: {
    label: "PlayStation 5",
    Icon: FaPlaystation,
    iconClassName: "text-[#2D6BFF]", // strong blue
    badge: "5",
    badgeClassName: "bg-[#2D6BFF]/90 text-black",
  },

  PS4: {
    label: "PlayStation 4",
    Icon: FaPlaystation,
    iconClassName: "text-[#60A5FA]", // lighter blue
    badge: "4",
    badgeClassName: "bg-[#60A5FA]/90 text-black",
  },

  "Xbox Series X|S": {
    label: "Xbox Series X|S",
    Icon: FaXbox,
    iconClassName: "text-[#22C55E]", // strong green
    badgeParts: { left: "X", right: "S" },
    badgeClassName: "bg-[#22C55E]/90 text-black",
  },

  "Xbox One": {
    label: "Xbox One",
    Icon: FaXbox,
    iconClassName: "text-[#86EFAC]", // lighter green
    badge: "ONE",
    badgeClassName: "bg-[#86EFAC]/90 text-black",
  },

  Switch: {
    label: "Nintendo Switch",
    Icon: SiNintendoswitch,
    iconClassName: "text-[#FB7185]", // lighter red
    badge: "1",
    badgeClassName: "bg-[#FB7185]/90 text-black",
  },

  "Switch 2": {
    label: "Nintendo Switch 2",
    Icon: SiNintendoswitch,
    iconClassName: "text-[#EF4444]", // strong red
    badge: "2",
    badgeClassName: "bg-[#EF4444]/90 text-black",
  },

  PC: {
    label: "PC",
    Icon: FaWindows,
    iconClassName: "text-[#38BDF8]",
    badge: "PC",
    badgeClassName: "bg-[#38BDF8]/90 text-black",
  },
};

/**
 * Makes user-entered strings match your PlatformKey reliably.
 * Also supports your admin stored values: "XBOX", "XSX/S", etc.
 */
export function normalizePlatformKey(input: string): PlatformKey | null {
  const raw = (input || "").trim();
  if (!raw) return null;

  const collapsed = raw.replace(/\s+/g, " ").trim();

  // Keep an aggressive "normalized" version for matching weird formats:
  // - lowercase
  // - remove spaces
  // - unify separators
  const lower = collapsed.toLowerCase();
  const lowerNoSpaces = lower.replace(/\s+/g, "");
  const lowerNoPunct = lowerNoSpaces.replace(/[._-]/g, "");
  const lowerFlat = lowerNoPunct.replace(/[|/\\]/g, ""); // for x|s, x/s, xsx/s

  // PlayStation
  if (
    lower === "ps5" ||
    lower === "playstation 5" ||
    lower === "play station 5" ||
    lowerNoSpaces === "ps5"
  )
    return "PS5";

  if (
    lower === "ps4" ||
    lower === "playstation 4" ||
    lower === "play station 4" ||
    lowerNoSpaces === "ps4"
  )
    return "PS4";

  // Nintendo Switch
  if (
    lower === "switch" ||
    lower === "nintendo switch" ||
    lower === "switch 1" ||
    lower === "nintendo switch 1" ||
    lowerNoSpaces === "switch"
  )
    return "Switch";

  if (
    lower === "switch 2" ||
    lower === "switch2" ||
    lower === "nintendo switch 2" ||
    lower === "nintendo switch2" ||
    lowerNoSpaces === "switch2"
  )
    return "Switch 2";

  // PC
  if (lower === "pc" || lower === "windows" || lowerNoSpaces === "pc")
    return "PC";

  // Xbox One
  // ✅ supports: "XBOX", "Xbox", "Xbox One"
  if (lower === "xbox one" || lowerNoSpaces === "xboxone") return "Xbox One";
  if (lower === "xbox" || lowerNoSpaces === "xbox") return "Xbox One"; // your admin uses "XBOX"

  // Xbox Series X|S
  // ✅ supports: "XSX/S", "XSX", "XSS", "Series X|S", "Xbox Series", etc.
  if (lower === "xbox series x|s") return "Xbox Series X|S";
  if (lower === "xbox series x/s") return "Xbox Series X|S";
  if (lower === "xbox series xs") return "Xbox Series X|S";
  if (lower === "xbox series x s") return "Xbox Series X|S";
  if (lower === "xbox series x and s") return "Xbox Series X|S";
  if (lower === "series x|s") return "Xbox Series X|S";
  if (lower === "x|s") return "Xbox Series X|S";
  if (lower === "xs") return "Xbox Series X|S";

  // aggressive matching for stored/admin short forms
  // "xsx/s", "xsxs", "xsx", "xss", "xboxseriesxs", "xboxseries"
  if (lowerFlat === "xsxs") return "Xbox Series X|S";
  if (lowerFlat === "xsxs" || lowerFlat === "xsx" || lowerFlat === "xss")
    return "Xbox Series X|S";
  if (lowerFlat === "xboxseriesxs" || lowerFlat === "xboxseriesx|s")
    return "Xbox Series X|S";
  if (lowerNoSpaces === "xboxseries" || lowerNoSpaces === "xboxseriesxs")
    return "Xbox Series X|S";
  if (lowerNoSpaces === "xsx/s" || lowerNoSpaces === "xsxs")
    return "Xbox Series X|S";

  // If they already typed exactly like the key
  if ((PLATFORM_ICONS as any)[collapsed]) return collapsed as PlatformKey;

  return null;
}
