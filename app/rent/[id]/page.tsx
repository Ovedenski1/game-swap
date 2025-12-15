import { notFound } from "next/navigation";
import Image from "next/image";
import RentForm from "@/components/RentForm";
import { getRentalGame } from "@/lib/actions/rentals";

type Props = { params: { id: string } };

export default async function RentGamePage({ params }: Props) {
  const game = await getRentalGame(params.id);
  if (!game) notFound();

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-10 text-white">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          <div className="relative aspect-[16/9] bg-black/40">
            {game.cover_url ? (
              <Image src={game.cover_url} alt={game.title} fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">No cover</div>
            )}
          </div>

          <div className="p-5 space-y-2">
            <h1 className="text-2xl font-extrabold">{game.title}</h1>
            <p className="text-sm text-white/70">{game.platform}</p>
            {game.description && <p className="text-sm text-white/80 leading-relaxed">{game.description}</p>}

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-white/70">Available copies</span>
              <span className="font-bold">{game.available_copies}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Price</span>
              <span className="font-bold">{game.price_amount === 0 ? "Free" : `${game.price_amount}`}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Rental duration</span>
              <span className="font-bold">30 days</span>
            </div>
          </div>
        </div>

        <RentForm gameId={game.id} />
      </div>
    </div>
  );
}
