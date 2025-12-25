import Link from "next/link";
import {
  PLATFORM_ICONS,
  normalizePlatformKey,
  type PlatformKey,
} from "@/lib/platforms";

type HomeUpcomingItem = {
  id: string;
  title: string;
  day: number | null;
  studio: string | null;
  platforms: string[] | null;
  link_url: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isExternalUrl(href: string) {
  return /^https?:\/\//i.test(href);
}

function PlatformIconsInline({ platforms }: { platforms: string[] | null }) {
  const keys: PlatformKey[] =
    (platforms ?? [])
      .map((p) => normalizePlatformKey(p))
      .filter(Boolean) as PlatformKey[];

  if (!keys.length) return null;

  return (
    <span className="inline-flex items-center gap-1.5 ml-2 align-middle">
      {keys.map((k) => {
        const entry = PLATFORM_ICONS[k];
        const Icon = entry.Icon;

        return (
          <span
            key={k}
            title={entry.label}
            className="inline-flex items-center"
          >
            <Icon className={["h-4 w-4", entry.iconClassName].join(" ")} />
          </span>
        );
      })}
    </span>
  );
}

export default function UpcomingGamesHomeSection({
  year,
  month,
  items,
}: {
  year: number;
  month: number;
  items: HomeUpcomingItem[];
}) {
  return (
    <section className="w-full pt-10 pb-2">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Предстоящи игри този месец
          </h2>
          <div className="mt-1 text-white/60 text-sm font-semibold">
            {pad2(month)}.{year}
          </div>
        </div>

        <Link
          href="/upcoming"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-soft hover:border-white/25 hover:text-foreground transition"
        >
          Виж всички →
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 sm:px-6 py-4">
        {items.length === 0 ? (
          <div className="text-white/60 text-sm">
            Няма добавени игри за този месец.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((g) => {
              const dateLabel =
                g.day != null
                  ? `${pad2(g.day)}.${pad2(month)}.${year}`
                  : `${pad2(month)}.${year}`;

              const TitleWrap = ({ children }: { children: React.ReactNode }) => {
                if (!g.link_url) return <>{children}</>;

                if (isExternalUrl(g.link_url)) {
                  return (
                    <a
                      href={g.link_url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {children}
                    </a>
                  );
                }

                return (
                  <Link href={g.link_url} className="hover:underline">
                    {children}
                  </Link>
                );
              };

              return (
                <div key={g.id}>
                  <div className="text-lg sm:text-xl text-white/80">
                    <span className="font-semibold text-white">{dateLabel}</span>
                    <span className="mx-2 text-white/30">—</span>

                    <TitleWrap>
                      <span className="font-medium text-white">{g.title}</span>
                      <PlatformIconsInline platforms={g.platforms} />
                    </TitleWrap>
                  </div>

                  {g.studio ? (
                    <div className="mt-1 text-sm text-white/50">{g.studio}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
