import Link from "next/link";
import Image from "next/image";
import { getRentalCatalog } from "@/lib/actions/rentals";



export default async function RentCatalogPage() {
  const games = await getRentalCatalog();

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-10 text-white">
      <h1 className="text-3xl font-extrabold mb-2">Rent a game</h1>
      <p className="text-white/70 mb-8">Pick a game, enter shipping address, and we’ll approve + ship it.</p>

      {games.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-white/70">
          No games available right now.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => (
            <Link
              key={g.id}
              href={`/rent/${g.id}`}
              className="group rounded-2xl border border-white/10 bg-black/35 overflow-hidden hover:border-white/20 transition"
            >
              <div className="relative aspect-[16/9] bg-black/40">
                {g.cover_url ? (
                  <Image src={g.cover_url} alt={g.title} fill className="object-cover group-hover:scale-[1.02] transition" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">No cover</div>
                )}
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold line-clamp-1">{g.title}</p>
                    <p className="text-xs text-white/60">{g.platform}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-white/60">Available</p>
                    <p className="text-sm font-bold">{g.available_copies}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-white/70">
                  <span>
                    {g.price_amount === 0 ? "Free" : `${g.price_amount}`}
                  </span>
                  <span className="text-white/50">30 days</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
