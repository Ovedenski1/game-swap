import { notFound } from "next/navigation";
import { getRentalGame } from "@/lib/actions/rentals";
import RentForm from "@/components/RentForm";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const EXCHANGE_RATE = 1.95583;

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RentGamePage({ params }: Props) {
  const { id } = await params;

  if (looksLikeUuid(id)) notFound();

  const game = await getRentalGame(id);
  if (!game) notFound();

  game.genres = game.genres ?? [];

  return (
    // ✅ fills the whole <main> height with the same background
    <div className="min-h-full flex flex-col bg-background text-white">
      {/* MAIN CONTENT */}
      <div className="flex-1 flex">
        <div className="flex-1 max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 flex">
          <div className="flex-1 bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-b-3xl flex flex-col backdrop-blur-sm">
            <div className="p-6 sm:p-8 lg:p-10 flex-1 flex flex-col">
              {/* Back button */}
              <div className="mb-6">
                <Link
                  href="/rent"
                  className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium group"
                >
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  <span>Обратно в каталога</span>
                </Link>
              </div>

              {/* Header */}
              <header className="text-center mb-8">
                <h1 className="text-4xl font-extrabold mb-2">Наеми за 30 дни</h1>
              </header>

              {/* GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 max-w-5xl mx-auto w-full">
                {/* LEFT: Game Details */}
                <section className="bg-[#0E111B]/80 rounded-2xl border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.7)] overflow-hidden backdrop-blur-md flex flex-col">
                  {/* Cover */}
                  <div className="relative border-b border-border p-8 flex justify-center items-center overflow-hidden rounded-t-2xl min-h-[420px]">
                    {game.cover_url && (
                      <Image
                        src={game.cover_url}
                        alt={`${game.title} background`}
                        fill
                        className="object-cover blur-[28px] brightness-[0.35] scale-150"
                      />
                    )}

                    {game.cover_url ? (
                      <Image
                        src={game.cover_url}
                        alt={game.title}
                        width={290}
                        height={420}
                        className="relative z-10 rounded-xl object-contain drop-shadow-[0_0_40px_rgba(0,0,0,0.8)]"
                      />
                    ) : (
                      <div className="relative z-10 flex h-96 w-72 items-center justify-center rounded-xl border border-border bg-black/40 text-xs text-white/40">
                        No cover
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
                  </div>

                  {/* Info */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="text-center mb-4">
                      <h2 className="text-2xl font-bold leading-tight text-white">
                        {game.title}
                      </h2>
                      <p className="mt-1 text-sm text-white/60">{game.platform}</p>
                    </div>

                    {game.genres.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mb-4">
                        {game.genres.map((genre) => (
                          <span
                            key={genre}
                            className="px-3 py-1 rounded-full border border-white/20 text-white/80 text-xs bg-white/5 backdrop-blur-sm"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3 items-center border-b border-white/10 pb-4 mb-4">
                      <div className="text-center">
                        <p className="text-[11px] uppercase tracking-wide text-white/50">
                          Налични бройки
                        </p>
                        <p className="text-sm font-semibold text-white mt-1">
                          {game.available_copies}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-[11px] uppercase tracking-wide text-white/50">
                          Цена
                        </p>
                        <p className="text-base font-semibold text-white mt-1">
                          {game.price_amount === 0
                            ? "Безплатно"
                            : `${game.price_amount.toFixed(2)} € / ${(
                                game.price_amount * EXCHANGE_RATE
                              ).toFixed(2)} лв`}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-[11px] uppercase tracking-wide text-white/50">
                          Наем до
                        </p>
                        <p className="text-sm font-semibold text-white mt-1">30 дни</p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="flex-1 overflow-auto max-h-[350px] pr-2 description-scroll rounded-md">
                      <h3 className="text-sm text-center font-semibold mb-3 text-white/70 uppercase tracking-wide">
                        Описание
                      </h3>
                      {game.description ? (
                        <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line text-justify mx-auto max-w-[95%]">
                          {game.description}
                        </p>
                      ) : (
                        <p className="text-white/40 text-sm italic text-center">
                          Няма описание за тази игра.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* RIGHT: Rent Form */}
                <section className="bg-[#0E111B]/80 rounded-2xl border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.7)] p-6 lg:p-8 backdrop-blur-md flex flex-col">
                  <h3 className="mb-4 text-lg font-semibold text-white">
                    Заяви този наем
                  </h3>
                  <p className="mb-6 text-sm text-white/60">
                    Попълни формата по-долу, за да заявиш доставка на тази игра.
                  </p>
                  <RentForm gameId={game.id} />
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
     
    </div>
  );
}
