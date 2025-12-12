import { PLATFORM_ICONS, normalizePlatformKey } from "@/lib/platforms";

export function PlatformIcons({ platforms }: { platforms: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((p, idx) => {
        const key = normalizePlatformKey(p);
        if (!key) return null;

        const entry = PLATFORM_ICONS[key];
        const Icon = entry.Icon;

        return (
          <span
            key={`${key}-${idx}`} // ✅ avoids duplicate key crashes (ex: "Switch" + "Switch 2" etc.)
            title={entry.label}
            className="relative h-9 w-9 flex items-center justify-center rounded-full border border-white/15 bg-white/5"
          >
            <Icon className={`h-[18px] w-[18px] ${entry.iconClassName}`} />

            {(entry.badge || entry.badgeParts) ? (
              <span
                className={[
                  // position
                  "absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4",
                  // pill
                  "rounded-full px-2 py-[2px] min-w-[22px]",
                  // text layout
                  "text-[9px] font-extrabold leading-none shadow-sm",
                  // IMPORTANT: keep contents vertically centered so the divider doesn't touch bottom
                  "inline-flex items-center justify-center gap-[2px]",

                  entry.badgeClassName ?? "bg-white/90 text-black",
                ].join(" ")}
              >
                {entry.badgeParts ? (
                  <>
                    <span>{entry.badgeParts.left}</span>

                    {/* divider that DOESN'T touch bottom (fixed height) */}
                    <span className="inline-block h-[10px] w-px bg-black/80 rounded-full" />

                    <span>{entry.badgeParts.right}</span>
                  </>
                ) : (
                  <span>{entry.badge}</span>
                )}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
