import Link from "next/link";
import Image from "next/image";

export type PlayersGOTMItem = {
  rank: number; // 1..5
  title: string;
  image_url: string;
  href: string;
};

export default function PlayersGameOfMonthSection({
  items,
  totalVotesText,
  votesHref,
  monthLabel,
}: {
  items: PlayersGOTMItem[];
  totalVotesText: string; // e.g. "1276 Гласа"
  votesHref: string; // e.g. "/polls"
  monthLabel: string; // e.g. "DECEMBER 2025"
}) {
  const byRank = new Map(items.map((i) => [i.rank, i]));
  const first = byRank.get(1);

  const r2 = byRank.get(2);
  const r3 = byRank.get(3);
  const r4 = byRank.get(4);
  const r5 = byRank.get(5);

  return (
    <section className="w-full pt-8 ">
      {/* Centered header + month */}
      <div className="mb-6 flex flex-col items-center text-center gap-2">
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[0.95] uppercase">
          Избор на играчите
          <br />
          за игра на месеца
        </h2>

        <div className="text-white/60 font-semibold tracking-[0.35em] text-xs sm:text-sm uppercase">
          {monthLabel}
        </div>

        <div className="pt-2">
          <Link
            href="/polls"
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white/80 hover:border-white/40 hover:text-white transition"
          >
            Гласувания →
          </Link>
        </div>
      </div>

      {/* Main black block */}
      <div className="bg-background relative overflow-hidden">
       {/* ✅ SINGLE BIG GORO DOODLE */}
{/* ✅ BIG GORO – RIGHT SIDE ANCHOR */}
<div className="pointer-events-none absolute inset-0 z-0">
  <Image
    src="/doodles/goro.png"
    alt=""
    fill
    className="
      object-contain
      opacity-[0.4]
      translate-x-[37%]
      translate-y-[25%]
      scale-[0.9]
      select-none
    "
    priority={false}
  />
</div>




        {/* ✅ Your existing content unchanged, just placed above doodles */}
        <div className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* LEFT: #1 */}
            <div className="lg:col-span-7">
              {first ? (
                <div className="p-4 sm:p-5">
                  <Link href={first.href} className="block">
                    <div className="relative w-full aspect-[16/9] overflow-hidden bg-black">
                      {/* rank badge */}
                      <div className="absolute left-3 top-3 z-10 w-10 h-10 rounded-full bg-[#F7931E] flex items-center justify-center">
                        <span className="text-black font-extrabold">1</span>
                      </div>

                      <Image
                        src={first.image_url}
                        alt={first.title}
                        fill
                        className="object-cover"
                        priority
                      />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
                    </div>
                  </Link>

                  {/* ✅ Centered title for #1 */}
                  <div className="mt-4 text-center">
                    <Link
                      href={first.href}
                      className="inline-block font-semibold text-white/95 hover:text-white transition line-clamp-2"
                    >
                      {first.title}
                    </Link>
                  </div>

                  {/* Votes */}
                  <div className="mt-5">
                    <Link
                      href={votesHref}
                      className="block select-none text-center font-extrabold tracking-wider text-white/15 hover:text-white/25 transition"
                    >
                      <span className="text-4xl sm:text-5xl">
                        {totalVotesText}
                      </span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-white/60">
                  No #1 item yet (add from admin)
                </div>
              )}
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-5">
              {/* #2 and #3 (top row) */}
              <div className="grid grid-cols-2">
                {[r2, r3].map((it, idx) => {
                  const rank = idx + 2;
                  return (
                    <div key={rank} className="p-4 sm:p-5">
                      {it ? (
                        <>
                          <Link href={it.href} className="block">
                            <div className="relative w-full aspect-[16/9] overflow-hidden bg-black">
                              <div className="absolute left-2 top-2 z-10 w-9 h-9 rounded-full bg-[#F7931E] flex items-center justify-center">
                                <span className="text-black font-extrabold">
                                  {rank}
                                </span>
                              </div>

                              <Image
                                src={it.image_url}
                                alt={it.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          </Link>

                          {/* ✅ Centered title for #2/#3 */}
                          <div className="mt-3 text-center">
                            <Link
                              href={it.href}
                              className="inline-block font-semibold text-white/90 hover:text-white transition line-clamp-2"
                            >
                              {it.title}
                            </Link>
                          </div>
                        </>
                      ) : (
                        <div className="text-white/60">No #{rank} item yet</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* #4 and #5 (smaller list) */}
              <div className="divide-y divide-white/10">
                {[r4, r5].map((it, idx) => {
                  const rank = idx + 4;
                  return (
                    <div key={rank} className="p-4 sm:p-5">
                      {it ? (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#F7931E] flex items-center justify-center flex-shrink-0">
                            <span className="text-black font-extrabold">
                              {rank}
                            </span>
                          </div>

                          <Link href={it.href} className="block flex-shrink-0">
                            <div className="relative w-[120px] h-[68px] overflow-hidden bg-black">
                              <Image
                                src={it.image_url}
                                alt={it.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          </Link>

                          <div className="min-w-0 flex-1">
                            <Link
                              href={it.href}
                              className="block font-semibold text-white/90 hover:text-white transition line-clamp-2"
                            >
                              {it.title}
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="text-white/60">No #{rank} item yet</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
