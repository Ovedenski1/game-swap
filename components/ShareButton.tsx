"use client";

import React, { useEffect, useState } from "react";

type ShareButtonsProps = {
  url: string;
  title: string;
};

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      setHasNativeShare(true);
    }
  }, []);

  async function handleShareClick() {
    try {
      if (
        hasNativeShare &&
        typeof navigator !== "undefined" &&
        "share" in navigator
      ) {
        await (navigator as any).share({ url, title });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch (err) {
      console.error("Share failed or was cancelled", err);
    }
  }

  async function handleCopyClick() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch (err) {
      console.error("Copy to clipboard failed", err);
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const iconClass =
    "flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/5 hover:bg-white/15";

  const svgClass = "h-4 w-4 fill-white";

  return (
    <div className="flex items-center gap-2">
      {/* Native Share Icon */}
      <button
        type="button"
        onClick={handleShareClick}
        aria-label="Share"
        className={iconClass}
      >
        <svg viewBox="0 0 24 24" className={svgClass}>
          <path d="M18 16a3 3 0 0 0-2.65 1.59L8.91 13.7a3.1 3.1 0 0 0 0-3.4l6.44-3.88A3 3 0 1 0 14 4a3 3 0 0 0 .07.61L7.65 8.49A3 3 0 1 0 8 15a3 3 0 0 0-.07-.61l6.44 3.88A3 3 0 1 0 18 16Z" />
        </svg>
      </button>

      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on Facebook"
        className={iconClass}
      >
        <svg viewBox="0 0 24 24" className={svgClass}>
          <path d="M13.5 9H15V6.5h-1.5C11.57 6.5 10 8.07 10 10v1.5H8v2h2V18h2.25v-4.5H15v-2h-2.75V10c0-.55.45-1 1-1Z" />
        </svg>
      </a>

      {/* X / Twitter */}
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on X"
        className={iconClass}
      >
        <svg viewBox="0 0 24 24" className={svgClass}>
          <path d="M16.98 4H19l-4.23 4.81L19.5 20h-4.1l-2.9-5.19L8.9 20H6.88l4.53-5.15L6.5 4h4.2l2.57 4.64L16.98 4Zm-1.39 13.37h1.14L8.5 5.56H7.27l8.32 11.81Z" />
        </svg>
      </a>

      {/* Copy Link */}
      <button
        type="button"
        onClick={handleCopyClick}
        aria-label="Copy link"
        className={iconClass}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 stroke-white"
          fill="none"
          strokeWidth="1.8"
        >
          <rect x="9" y="9" width="10" height="10" rx="2" />
          <rect x="5" y="5" width="10" height="10" rx="2" />
        </svg>
      </button>
    </div>
  );
}
