"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  children: React.ReactNode;
  className?: string;
  compactMobile?: boolean;
};

function isInteractiveTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;

  // Ignore drag when starting on links, buttons, or elements
  // explicitly marked as interactive (like our NewsCard)
  return !!el.closest("a, button, [data-interactive='true']");
}

export default function HorizontalScroller({
  children,
  className = "",
  compactMobile = false,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null);

  const rafId = useRef<number | null>(null);
  const target = useRef(0);
  const easing = 0.22;

  const dragging = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const lastX = useRef(0);
  const v = useRef(0);

  const clamp = (x: number) => {
    const el = railRef.current;
    if (!el) return 0;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    return Math.min(Math.max(0, x), max);
  };

  const stop = () => {
    if (rafId.current != null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
  };

  const tick = () => {
    const el = railRef.current;
    if (!el) {
      stop();
      return;
    }

    const cur = el.scrollLeft;
    const next = cur + (target.current - cur) * easing;
    el.scrollLeft = next;

    if (Math.abs(target.current - next) < 0.4) {
      el.scrollLeft = target.current;
      stop();
      return;
    }

    rafId.current = requestAnimationFrame(tick);
  };

  const ensure = () => {
    if (rafId.current == null) rafId.current = requestAnimationFrame(tick);
  };

  const scrollByAmount = (amt: number) => {
    if (!railRef.current) return;
    target.current = clamp(target.current + amt);
    ensure();
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!railRef.current) return;
    if (e.ctrlKey) return;
    const intent =
      Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const speed = 2.0;
    target.current = clamp(railRef.current.scrollLeft + intent * speed);
    ensure();
    // We still preventDefault here to avoid page scroll while using the rail
    e.preventDefault();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // 👇 NEW: don't start drag if the pointer is on an interactive element (card)
    if (isInteractiveTarget(e.target)) return;

    if (!railRef.current) return;
    dragging.current = true;
    railRef.current.setPointerCapture(e.pointerId);
    stop();
    startX.current = e.clientX;
    startScroll.current = railRef.current.scrollLeft;
    lastX.current = e.clientX;
    v.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !railRef.current) return;
    const dx = e.clientX - startX.current;
    railRef.current.scrollLeft = clamp(startScroll.current - dx);
    const inst = e.clientX - lastX.current;
    v.current = v.current * 0.7 + inst * 0.3;
    lastX.current = e.clientX;
    e.preventDefault();
  };

  const onPointerUp = () => {
    const el = railRef.current;
    if (!el) {
      dragging.current = false;
      return;
    }

    dragging.current = false;
    let vel = -v.current * 0.95;
    const friction = 0.94;

    const fling = () => {
      if (!railRef.current) return;
      const next = clamp(el.scrollLeft + vel);
      if (next === el.scrollLeft) return;
      el.scrollLeft = next;
      vel *= friction;
      if (Math.abs(vel) < 0.2) return;
      requestAnimationFrame(fling);
    };

    requestAnimationFrame(fling);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!railRef.current) return;
    const page = railRef.current.clientWidth * 0.9;
    if (e.key === "ArrowLeft") {
      scrollByAmount(-Math.max(240, page * 0.5));
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      scrollByAmount(Math.max(240, page * 0.5));
      e.preventDefault();
    }
  };

  useEffect(() => {
    return () => {
      if (rafId.current != null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return (
    <div className={`relative py-1 ${className}`}>
      {/* arrows hidden on mobile */}
      <button
        aria-label="Previous"
        onClick={() => scrollByAmount(-360)}
        className="hidden sm:flex items-center justify-center absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#0B0F12] shadow hover:bg-white"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        aria-label="Next"
        onClick={() => scrollByAmount(360)}
        className="hidden sm:flex items-center justify-center absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#0B0F12] shadow hover:bg-white"
      >
        <ChevronRight size={18} />
      </button>

      <div
        ref={railRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        tabIndex={0}
        className={[
          "no-scrollbar flex gap-4 sm:gap-5 overflow-x-auto overflow-y-visible py-1",
          "overscroll-x-contain overscroll-y-none",
          "pr-6 pl-4 sm:pr-8 sm:pl-8",
          "select-none touch-pan-x",
          "[scroll-behavior:auto]",
          "cursor-grab active:cursor-grabbing",
          compactMobile
            ? "[&>*]:shrink-0 [&>*]:basis-[48%] [&>*]:min-w-[48%] " +
              "sm:[&>*]:basis-auto sm:[&>*]:min-w-0 sm:[&>*]:shrink sm:[&>*]:w-auto"
            : "",
        ].join(" ")}
        onLoadCapture={() => {
          if (!railRef.current) return;
          target.current = railRef.current.scrollLeft;
        }}
      >
        {children}
      </div>
    </div>
  );
}
