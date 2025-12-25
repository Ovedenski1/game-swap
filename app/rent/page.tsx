import Link from "next/link";
import Image from "next/image";
import { getRentalCatalog } from "@/lib/actions/rentals";

const EXCHANGE_RATE = 1.95583;

export default async function RentCatalogPage() {
  const games = await getRentalCatalog();

  return (
    <div className="min-h-screen flex flex-col bg-background text-white">
      <main className="flex-1 flex">
        <div className="flex-1 max-w-[1300px] mx-auto px-3 sm:px-6 lg:px-4 flex">
          <div className="flex-1 bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-b-3xl flex flex-col">
            <div className="p-6 sm:p-8 lg:p-10 flex-1 flex flex-col">
              {/* Header */}
              <header className="text-center mb-10">
                <h1 className="text-3xl font-bold mb-2">Rent a Game</h1>
                <p className="text-white/60 text-sm max-w-xl mx-auto">
                  Pick a game from our rental catalog and request shipping.
                </p>
              </header>

              {/* Empty State */}
              {games.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-block bg-surface-soft rounded-2xl border border-border shadow-[0_18px_45px_rgba(0,0,0,0.8)] px-8 py-10">
                    <p className="text-white/70 mb-3">
                      No games available right now.
                    </p>
                    <p className="text-sm text-white/50">
                      Please check back later.
                    </p>
                  </div>
                </div>
              ) : (
                /* Responsive Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 justify-items-center">
                  {games.map((g) => (
                    <Link
                      key={g.id}
                      href={`/rent/${g.slug}`}
                      className="group bg-surface-soft w-full max-w-[230px] rounded-2xl shadow-[0_8px_25px_rgba(0,0,0,0.4)] overflow-hidden transition-transform duration-300 hover:scale-[1.02] flex flex-col"
                    >
                      {/* Cover */}
                      <div className="relative w-full aspect-[2/3] flex items-center justify-center overflow-hidden">
                        {g.cover_url ? (
                          <Image
                            src={g.cover_url}
                            alt={g.title}
                            width={230}
                            height={345}
                            className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 230px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                            No cover
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 flex flex-col justify-between flex-1">
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm sm:text-base leading-tight text-white truncate">
                            {g.title}
                          </p>
                          <p className="text-xs text-white/60">{g.platform}</p>

                          {g.genres.length > 0 && (
                            <p className="text-[11px] text-white/70 mt-1 leading-snug line-clamp-2">
                              {g.genres.join(", ")}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-white border-t border-white/10 pt-2 mt-2">
                          <div className="flex flex-col">
                            <span className="text-[11px] text-white/50 uppercase">
                              Available
                            </span>
                            <span className="text-sm font-bold">
                              {g.available_copies}
                            </span>
                          </div>

                          <div className="text-right">
                            {g.price_amount === 0 || g.price_amount === null ? (
                              <span className="text-green-400 font-semibold text-sm">
                                Free
                              </span>
                            ) : (
                              <>
                                <span className="block text-sm font-medium">
                                  {`${g.price_amount.toFixed(2)} €`}
                                </span>
                                <span className="text-white/50 text-[11px]">
                                  {(g.price_amount * EXCHANGE_RATE).toFixed(2)}{" "}
                                  лв
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      
    </div>
  );
}
