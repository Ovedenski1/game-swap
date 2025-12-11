// components/StoryGallery.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

export type GalleryImage = {
  id: string;
  url: string;
  caption?: string;
};

type StoryGalleryProps = {
  images: GalleryImage[];
  /** If true, show the rounded dark box behind the strip */
  withBackground?: boolean;
};

export default function StoryGallery({
  images,
  withBackground = false, // default: no wrapper background
}: StoryGalleryProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const total = images.length;

  useEffect(() => {
    if (!open || total === 0) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % total);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + total) % total);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, total]);

  if (total === 0) return null;

  const hero = images[0];
  const thumbs = images.slice(1, 5);
  const overflow = Math.max(0, total - 5);
  const hasOverflow = overflow > 0;

  const firstRow = thumbs.slice(0, 2);
  const secondRow = thumbs.slice(2, 4);

  const openAt = (i: number) => {
    setActive(i);
    setOpen(true);
  };

  const wrapperClass = withBackground
    ? "mt-4 border border-white/10 bg-black/40 p-3 sm:p-4 rounded-xl"
    : "mt-4"; // keep spacing but no box

  return (
    <>
      {/* STRIP */}
      <div className={wrapperClass}>
        {/* Set total strip aspect */}
        <div className="relative w-full aspect-[16/9] md:aspect-[32/9]">
          <div className="absolute inset-0 flex flex-col gap-4 md:flex-row">
            {/* HERO (narrower: 60%) */}
            <button
              onClick={() => openAt(0)}
              className="relative w-full md:w-[60%] h-1/2 md:h-full overflow-hidden border border-white/10 cursor-pointer"
            >
              <Image
                src={hero.url}
                alt={hero.caption || ""}
                fill
                className="object-cover"
              />
            </button>

            {/* RIGHT COLUMN (2x2 grid) */}
            {thumbs.length > 0 && (
              <div className="w-full md:w-[40%] h-1/2 md:h-full flex flex-col gap-4">
                {/* TOP ROW */}
                <div className="flex flex-1 gap-4">
                  {firstRow.map((img, i) => {
                    const index = i + 1;
                    return (
                      <button
                        key={img.id ?? index}
                        onClick={() => openAt(index)}
                        className="relative flex-1 h-full overflow-hidden border border-white/10 cursor-pointer"
                      >
                        <Image
                          src={img.url}
                          alt={img.caption || ""}
                          fill
                          className="object-cover"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* BOTTOM ROW */}
                {secondRow.length > 0 && (
                  <div className="flex flex-1 gap-4">
                    {secondRow.map((img, i) => {
                      const index = i + 1 + firstRow.length;
                      const isLast =
                        hasOverflow && i === secondRow.length - 1;

                      return (
                        <button
                          key={img.id ?? index}
                          onClick={() => openAt(index)}
                          className="relative flex-1 h-full overflow-hidden border border-white/10 cursor-pointer"
                        >
                          <Image
                            src={img.url}
                            alt={img.caption || ""}
                            fill
                            className="object-cover"
                          />

                          {isLast && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="bg-black/80 text-white text-xs px-3 py-1 uppercase tracking-wide">
                                +{overflow} photos
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL VIEWER */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white bg-black/70 px-3 py-1 border border-white/40 rounded-full"
          >
            Close ✕
          </button>

          <div className="relative w-full max-w-4xl aspect-[16/9] bg-black border border-white/20 rounded-xl overflow-hidden">
            <Image
              src={images[active].url}
              alt={images[active].caption || ""}
              fill
              className="object-contain bg-black"
            />

            {total > 1 && (
              <>
                <button
                  onClick={() => setActive((i) => (i - 1 + total) % total)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 text-white px-2 py-1 rounded-full"
                >
                  ‹
                </button>

                <button
                  onClick={() => setActive((i) => (i + 1) % total)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 text-white px-2 py-1 rounded-full"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
