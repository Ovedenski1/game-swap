// components/SocialEmbed.tsx
"use client";

import React from "react";
import ReactPlayer from "react-player";
import { Tweet } from "react-tweet";

export type EmbedSize = "default" | "wide" | "compact";

export type SocialEmbedProps = {
  url: string;
  title?: string;
  size?: EmbedSize;
};

/**
 * react-player typings vary by version. To avoid `any` and TS errors,
 * we cast it to a generic React component.
 */
const TypedReactPlayer =
  ReactPlayer as unknown as React.ComponentType<Record<string, unknown>>;

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

    // Normal Twitter / X URL
    const match = u.pathname.match(/status\/(\d+)/);
    if (match?.[1]) return match[1];

    // Old embed format
    const id = u.searchParams.get("id");
    if (id) return id;
  } catch {
    return null;
  }
  return null;
}

function getYouTubeEmbedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }

    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;

      if (u.pathname.startsWith("/embed/")) return raw;
    }
  } catch {
    return null;
  }
  return null;
}

export const SocialEmbed: React.FC<SocialEmbedProps> = ({ url, title, size }) => {
  const host = getHost(url);
  if (!host) return null;

  let aspectClass = "aspect-[16/9]";
  let maxWidthClass = "w-full";

  if (size === "wide") {
    aspectClass = "aspect-[21/9]";
  } else if (size === "compact") {
    aspectClass = "aspect-[4/3]";
    maxWidthClass = "max-w-xl";
  }

  /* ---------- TWITTER / X ---------- */
  if (host === "twitter.com" || host === "x.com" || host === "platform.twitter.com") {
    const id = getTweetId(url);
    if (!id) return null;

    return (
      <figure className="mt-4 w-full max-w-xl">
        <Tweet id={id} />
        {title && (
          <figcaption className="mt-2 text-xs text-white/60 break-words whitespace-pre-wrap">
            {title}
          </figcaption>
        )}
      </figure>
    );
  }

  /* ---------- FACEBOOK ---------- */
  if (host.includes("facebook.com") || host === "fb.watch") {
    let src = url;

    try {
      const u = new URL(url);
      if (!u.pathname.startsWith("/plugins/post.php")) {
        src = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(
          url
        )}&show_text=true`;
      }
    } catch {
      // ignore
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
          <figcaption className="mt-2 text-xs text-white/60 break-words whitespace-pre-wrap">
            {title}
          </figcaption>
        )}
      </figure>
    );
  }

  /* ---------- YOUTUBE ---------- */
  const yt = getYouTubeEmbedUrl(url);
  if (yt) {
    return (
      <figure className={`mt-4 ${maxWidthClass}`}>
        <div
          className={`relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 ${aspectClass}`}
        >
          <iframe
            src={yt}
            title={title || "YouTube video"}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {title && (
          <figcaption className="mt-2 text-xs text-white/60 break-words whitespace-pre-wrap">
            {title}
          </figcaption>
        )}
      </figure>
    );
  }

  /* ---------- OTHER VIDEO / AUDIO ---------- */
  return (
    <figure className={`mt-4 ${maxWidthClass}`}>
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 ${aspectClass}`}
      >
        <TypedReactPlayer
          url={url}
          width="100%"
          height="100%"
          controls
          style={{ position: "absolute", inset: 0 }}
        />
      </div>

      {title && (
        <figcaption className="mt-2 text-xs text-white/60 break-words whitespace-pre-wrap">
          {title}
        </figcaption>
      )}
    </figure>
  );
};

export default SocialEmbed;
