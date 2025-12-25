// components/GalleryImageUpload.tsx
"use client";

import type React from "react";
import { useState } from "react";
import Image from "next/image";

import { uploadGameImage } from "@/lib/actions/games";

type GalleryImageUploadProps = {
  label?: string;
  value?: string; // current image URL (can be empty)
  onChange: (url: string) => void;
};

type UploadGameImageResult =
  | { success: true; url: string }
  | { success: false; error: string };

/* ---------------- helpers: load + downscale without cropping ---------------- */

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Downscale the image so that width <= maxWidth and height <= maxHeight,
 * keeping aspect ratio. No cropping, just scaling + JPEG compression.
 */
async function downscaleImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85,
): Promise<File> {
  const img = await loadImageFromFile(file);
  const { width, height } = img;

  let targetWidth = width;
  let targetHeight = height;

  if (width > maxWidth || height > maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height);
    targetWidth = Math.max(1, Math.round(width * scale));
    targetHeight = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot get 2D context");

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error("Canvas is empty"));
        resolve(b);
      },
      "image/jpeg",
      quality,
    );
  });

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

/* ---------------- component ---------------- */

export default function GalleryImageUpload({
  label = "Image",
  value,
  onChange,
}: GalleryImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // allow picking the same file again later
    e.target.value = "";

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WEBP are allowed.");
      return;
    }

    const hardMax = 20 * 1024 * 1024;
    if (file.size > hardMax) {
      setError("Image is too large. Max size is 20MB.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const compressed = await downscaleImage(file, 1600, 1600, 0.85);

      // Ensure TS understands the union shape (no any)
      const res = (await uploadGameImage(compressed)) as UploadGameImageResult;

      if (!res.success) {
        console.error("Gallery upload error:", res);
        setError(res.error || "Failed to upload image.");
        return;
      }

      onChange(res.url);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-[11px] text-white/60">{label}</p>}

      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20 bg-black border border-white/20 flex items-center justify-center overflow-hidden">
          {value ? (
            <Image src={value} alt={label} fill className="object-contain" />
          ) : (
            <span className="text-[10px] text-white/50 text-center px-1">
              No image
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/30 px-3 py-1 text-[11px] hover:bg-white/10">
            {isUploading ? "Uploading…" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>

          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="self-start text-[11px] text-red-300 hover:text-red-200"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-[11px] text-red-300">{error}</p>}
    </div>
  );
}
