// components/SocialEmbed.tsx
"use client";

import React from "react";
import ReactPlayer from "react-player";
import { Tweet } from "react-tweet";

export type EmbedSize = "default" | "wide" | "compact";

type SocialEmbedProps = {
  url: string;
  title?: string;
  size?: EmbedSize;
};

// super loose typing so TS doesn't complain about react-player props
const ReactPlayerAny =
  ReactPlayer as unknown as React.ComponentType<Record<string, any>>;

function getHost(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function getTweetId(url: string): string | null {
  try {
    const u = new URL(url);

    // Normal X/Twitter URL
    const pathMatch = u.pathname.match(/status\/(\d+)/);
    if (pathMatch?.[1]) return pathMatch[1];

    // Old iframe style: platform.twitter.com/embed/Tweet.html?id=...
    const idParam = u.searchParams.get("id");
    if (idParam) return idParam;
  } catch {
    return null;
  }
  return null;
}

// Build a clean YouTube embed URL from any YouTube link
function getYouTubeEmbedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    // youtu.be/VIDEO_ID
    if (host === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }

    if (host.endsWith("youtube.com")) {
      // watch?v=VIDEO_ID
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;

      // already an /embed/ URL
      if (u.pathname.startsWith("/embed/")) {
        return raw;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export const SocialEmbed: React.FC<SocialEmbedProps> = ({
  url,
  title,
  size,
}) => {
  const host = getHost(url);
  if (!host) return null;

  // Shared sizing for FB / YouTube / ReactPlayer
  let aspectClass = "aspect-[16/9]";
  let maxWidthClass = "w-full";

  if (size === "wide") {
    aspectClass = "aspect-[21/9]";
  } else if (size === "compact") {
    aspectClass = "aspect-[4/3]";
    maxWidthClass = "max-w-xl";
  }

  /* ---------- TWITTER / X ---------- */
  if (
    host === "twitter.com" ||
    host === "x.com" ||
    host === "platform.twitter.com"
  ) {
    const id = getTweetId(url);
    if (!id) return null;

    return (
      <figure className="mt-4 w-full max-w-xl">
        <Tweet id={id} />
        {title && (
          <figcaption className="mt-2 text-xs text-white/60 whitespace-pre-wrap break-words">
            {title}
          </figcaption>
        )}
      </figure>
    );
  }

  /* ---------- FACEBOOK POST ---------- */
  if (host.includes("facebook.com") || host === "fb.watch") {
    let src = url;
    try {
      const u = new URL(url);
      if (!u.pathname.startsWith("/plugins/post.php")) {
        const href = encodeURIComponent(url);
        src = `https://www.facebook.com/plugins/post.php?href=${href}&show_text=true`;
      }
    } catch {
      // ignore – fall back to original url
    }

    return (
      <figure className={`mt-4 ${maxWidthClass}`}>
        <div
          className={`relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 ${aspectClass}`}
        >
          <iframe
            src={src}
            title={title || "Facebook post"}
            className="absolute inset-0 h-full w-full border-0"
            scrolling="no"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        {title && (
          <figcaption className="mt-2 text-xs text-white/60 whitespace-pre-wrap break-words">
            {title}
          </figcaption>
        )}
      </figure>
    );
  }

  /* ---------- YOUTUBE (explicit iframe) ---------- */

  const ytEmbed = getYouTubeEmbedUrl(url);

  if (ytEmbed) {
    // Clean YouTube iframe – most robust
    return (
      <figure className={`mt-4 ${maxWidthClass}`}>
        <div
          className={`relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 ${aspectClass}`}
        >
          <iframe
            src={ytEmbed}
            title={title || "YouTube video"}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        {title && (
          <figcaption className="mt-2 text-xs text-white/60 whitespace-pre-wrap break-words">
            {title}
          </figcaption>
        )}
      </figure>
    );
  }

  /* ---------- OTHER VIDEO / AUDIO (ReactPlayer) ---------- */

  return (
    <figure className={`mt-4 ${maxWidthClass}`}>
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 ${aspectClass}`}
      >
        <ReactPlayerAny
          url={url}
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0 }}
          controls
        />
      </div>
      {title && (
        <figcaption className="mt-2 text-xs text-white/60 whitespace-pre-wrap break-words">
          {title}
        </figcaption>
      )}
    </figure>
  );
};
