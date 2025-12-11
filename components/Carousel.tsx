"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Slide = { src: string; alt?: string };

export default function Carousel16x9({
  slides,
  interval = 5000,
  className = "",
}: {
  slides: Slide[];
  interval?: number;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  const len = slides.length;

  // autoplay (typed safely; no red squiggles)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (len <= 1) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setIdx((i) => (i + 1) % len);
    }, interval);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idx, interval, len]);

  const go = (n: number) => {
    if (len === 0) return;
    setIdx(((n % len) + len) % len);
  };

  // swipe support
  const startX = useRef<number | null>(null);
  const onStart = (x: number) => (startX.current = x);
  const onMove = (x: number) => {
    if (startX.current === null) return;
    const dx = x - startX.current;
    if (Math.abs(dx) > 60) {
      go(idx + (dx < 0 ? 1 : -1));
      startX.current = null;
    }
  };
  const onEnd = () => (startX.current = null);

  if (!len) return null;

  return (
    <div
      className={[
        "relative w-full overflow-hidden rounded-2xl border border-white/10 shadow-[0_6px_40px_rgba(0,0,0,0.35)]",
        "aspect-[16/9]",
        className,
      ].join(" ")}
      onMouseLeave={onEnd}
      onTouchEnd={onEnd}
      onMouseUp={onEnd}
    >
      <div
        className="relative w-full h-full"
        onMouseDown={(e) => onStart(e.clientX)}
        onMouseMove={(e) => onMove(e.clientX)}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
      >
        {slides.map((s, i) => (
          <div
            key={`${s.src}-${i}`}
            className="absolute inset-0 transition-transform duration-700 ease-out will-change-transform"
            style={{ transform: `translate3d(${(i - idx) * 100}%,0,0)` }}
          >
            {/* Images are 16:9, so 'contain' guarantees no crop + no bars */}
            <Image
              src={s.src}
              alt={s.alt || ""}
              fill
              sizes="100vw"
              priority={i === 0}
              className="object-contain select-none"
            />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i === idx
                ? "bg-[#8A2BE2] shadow-[0_0_8px_#8A2BE2]"
                : "bg-white/60 hover:bg-white/80"
            }`}
          />
        ))}
      </div>

      {/* Arrows (hidden on xs) */}
      {len > 1 && (
        <>
          <button
            onClick={() => go(idx - 1)}
            className="hidden sm:grid absolute left-2 top-1/2 -translate-y-1/2 z-20 place-items-center h-9 w-9 rounded-full bg-black/45 text-white hover:bg-black/65"
          >
            ‹
          </button>
          <button
            onClick={() => go(idx + 1)}
            className="hidden sm:grid absolute right-2 top-1/2 -translate-y-1/2 z-20 place-items-center h-9 w-9 rounded-full bg-black/45 text-white hover:bg-black/65"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
