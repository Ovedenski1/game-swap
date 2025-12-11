"use client";

import { useState } from "react";
import { uploadGameImage } from "@/lib/actions/games";

interface GameImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export default function GameImageUploader({
  images,
  onChange,
  maxImages = 4,
}: GameImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // reset input at the end of the function (even on errors)
    const resetInput = () => {
      // allow selecting the same file again
      e.target.value = "";
    };

    // limit number of images
    if (images.length >= maxImages) {
      setError(`You can upload up to ${maxImages} images per game.`);
      resetInput();
      return;
    }

    // ✅ TYPE CHECK – only JPG / PNG
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG and PNG images are allowed.");
      resetInput();
      return;
    }

    // ✅ SIZE CHECK – max ~5MB
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError("Image is too large. Maximum size is 5MB.");
      resetInput();
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const res = await uploadGameImage(file);
      if (!res.success || !res.url) {
        setError(res.error || "Failed to upload image.");
      } else {
        onChange([...images, res.url]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to upload image.");
    } finally {
      setUploading(false);
      resetInput();
    }
  }

  function handleRemove(url: string) {
    onChange(images.filter((img) => img !== url));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* existing previews */}
        {images.map((url) => (
          <div
            key={url}
            className="relative w-20 h-24 rounded-lg overflow-hidden border border-white/15 bg-black/40"
          >
            <img src={url} alt="Game" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(url)}
              className="absolute top-1 right-1 rounded-full bg-black/70 text-[10px] px-1.5 py-0.5 hover:bg-black"
            >
              ✕
            </button>
          </div>
        ))}

        {/* upload button */}
        {images.length < maxImages && (
          <label className="w-20 h-24 flex items-center justify-center rounded-lg border border-dashed border-white/25 bg-black/20 text-xs cursor-pointer hover:bg-black/30">
            {uploading ? "Uploading…" : "+ Add"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-[11px] text-white/40">
        Up to {maxImages} images. JPG / PNG, max ~5MB each (Supabase limit).
      </p>
    </div>
  );
}
