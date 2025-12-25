"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Slide = { src: string; alt?: string; href?: string };

export default function Carousel16x9({
  slides,
  interval = 5000,
  className = "",
}: {
  slides: Slide[];
  interval?: number;
  className?: string;
}) {
  const len = slides.length;
  if (!len) return null;

  // build looped track: [last, ...slides, first]
  const looped = useMemo(() => {
    if (len === 1) return slides;
    return [slides[len - 1], ...slides, slides[0]];
  }, [slides, len]);

  // index on the looped track (start at 1 => first real slide)
  const [tIdx, setTIdx] = useState(len === 1 ? 0 : 1);

  // toggle animation off for the “snap”
  const [animate, setAnimate] = useState(true);

  // ---- NEW: queue rapid interactions (no blank, still spam-clickable)
  const isTransitioningRef = useRef(false);
  const queuedDeltaRef = useRef(0);
  const snapPendingRef = useRef<null | "toFirst" | "toLast">(null);

  const applyDelta = (delta: number) => {
    if (len <= 1 || delta === 0) return;

    // If already transitioning, just accumulate the request.
    if (isTransitioningRef.current) {
      queuedDeltaRef.current += delta;
      return;
    }

    isTransitioningRef.current = true;
    setTIdx((i) => i + delta);
  };

  const flushQueue = () => {
    if (len <= 1) return;
    if (isTransitioningRef.current) return;

    const q = queuedDeltaRef.current;
    if (!q) return;

    const step = q > 0 ? 1 : -1;
    queuedDeltaRef.current -= step;

    isTransitioningRef.current = true;
    setTIdx((i) => i + step);
  };

  // keep tIdx valid if slides change
  useEffect(() => {
    isTransitioningRef.current = false;
    queuedDeltaRef.current = 0;
    snapPendingRef.current = null;

    if (len === 1) {
      setTIdx(0);
      return;
    }
    setTIdx(1);
    setAnimate(true);
  }, [len]);

  // compute the "real" idx (0..len-1) for dots
  const realIdx = useMemo(() => {
    if (len === 1) return 0;
    // tIdx: 1..len are real slides
    let r = tIdx - 1;
    if (r < 0) r = len - 1;
    if (r >= len) r = 0;
    return r;
  }, [tIdx, len]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // autoplay (use queue so it never breaks)
  useEffect(() => {
    if (len <= 1) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      applyDelta(1);
    }, interval);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tIdx, interval, len]);

  // swipe support
  const startX = useRef<number | null>(null);
  const onStart = (x: number) => (startX.current = x);
  const onMove = (x: number) => {
    if (startX.current === null) return;
    const dx = x - startX.current;
    if (Math.abs(dx) > 60) {
      applyDelta(dx < 0 ? 1 : -1);
      startX.current = null;
    }
  };
  const onEnd = () => (startX.current = null);

  const goReal = (nReal: number) => {
    if (len === 1) return;

    // jump directly (still queue-safe)
    const targetTrackIdx = nReal + 1;
    const delta = targetTrackIdx - tIdx;

    // if we're mid-transition, queue the delta instead of forcing a jump
    if (isTransitioningRef.current) {
      queuedDeltaRef.current += delta;
      return;
    }

    isTransitioningRef.current = true;
    setTIdx(targetTrackIdx);
  };

  const trackTranslate = useMemo(
    () => `translate3d(${-tIdx * 100}%,0,0)`,
    [tIdx],
  );

  // after the animated move ends, snap if we're on the clones
  const handleTransitionEnd = () => {
    if (len <= 1) return;

    // If we ended on a clone, schedule a snap (no animation) then continue queue.
    if (tIdx === len + 1) {
      snapPendingRef.current = "toFirst";
      setAnimate(false);
      setTIdx(1); // snap to first real
      return;
    }

    if (tIdx === 0) {
      snapPendingRef.current = "toLast";
      setAnimate(false);
      setTIdx(len); // snap to last real
      return;
    }

    // Normal transition end: allow next queued step
    isTransitioningRef.current = false;
    flushQueue();
  };

  // re-enable animation immediately after snapping (next paint)
  useEffect(() => {
    if (!animate) {
      const id = requestAnimationFrame(() => {
        setAnimate(true);

        // snap happened; we are not transitioning anymore
        isTransitioningRef.current = false;
        snapPendingRef.current = null;

        // continue any queued clicks
        flushQueue();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [animate]);

  const isExternalUrl = (href: string) => /^https?:\/\//i.test(href);

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
        {/* TRACK */}
        <div
          className={[
            "flex h-full w-full transform-gpu will-change-transform",
            animate ? "transition-transform duration-700 ease-out" : "transition-none",
          ].join(" ")}
          style={{ transform: trackTranslate }}
          onTransitionEnd={handleTransitionEnd}
        >
          {looped.map((s, i) => {
            const href = s.href?.trim() || "";
            const clickable = !!href;

            const SlideInner = (
              <div className="relative h-full w-full">
                <div className="absolute inset-0 bg-black/25" />
                <Image
                  src={s.src}
                  alt={s.alt || ""}
                  fill
                  sizes="100vw"
                  priority={i === 1} // first real slide
                  className="object-cover select-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/10" />
                {clickable ? (
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition" />
                ) : null}
              </div>
            );

            return (
              <div key={`${s.src}-${i}`} className="relative h-full w-full shrink-0">
                {clickable ? (
                  isExternalUrl(href) ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={s.alt || "Open slide"}
                      className="block w-full h-full"
                    >
                      {SlideInner}
                    </a>
                  ) : (
                    <Link
                      href={href}
                      aria-label={s.alt || "Open slide"}
                      className="block w-full h-full"
                    >
                      {SlideInner}
                    </Link>
                  )
                ) : (
                  SlideInner
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goReal(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i === realIdx
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
            onClick={() => applyDelta(-1)}
            className="hidden sm:grid absolute left-2 top-1/2 -translate-y-1/2 z-20 place-items-center h-9 w-9 rounded-full bg-black/45 text-white hover:bg-black/65"
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            onClick={() => applyDelta(1)}
            className="hidden sm:grid absolute right-2 top-1/2 -translate-y-1/2 z-20 place-items-center h-9 w-9 rounded-full bg-black/45 text-white hover:bg-black/65"
            aria-label="Next slide"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
