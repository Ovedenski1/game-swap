// components/NewsImageUpload.tsx
"use client";

import { useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { uploadGameImage } from "@/lib/actions/games"; // same action you already use

type Props = {
  label?: string;
  value: string;               // current image URL
  onChange: (url: string) => void;
};

/* ---------- helpers for cropping ---------- */

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

async function getCroppedBlob(
  imageSrc: string,
  cropPixels: Area,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not get canvas context");

  const { width, height, x, y } = cropPixels;

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    image,
    x,
    y,
    width,
    height,
    0,
    0,
    width,
    height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Canvas is empty"));
      resolve(blob);
    }, "image/jpeg");
  });
}

/* ---------- component ---------- */

export default function NewsImageUpload({ label, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal / cropper state
  const [modalOpen, setModalOpen] = useState(false);
  const [localSrc, setLocalSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);

  function onCropComplete(_: Area, croppedPixels: Area) {
    setCroppedAreaPixels(croppedPixels);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // allow selecting the same file again later
    e.target.value = "";

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WEBP are allowed.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Image is too large. Max size is 5MB.");
      return;
    }

    setError(null);

    const objectUrl = URL.createObjectURL(file);
    setLocalSrc(objectUrl);
    setPendingFileName(file.name);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setModalOpen(true);
  }

  async function handleConfirmCrop() {
    if (!localSrc || !croppedAreaPixels) return;

    try {
      setUploading(true);
      setError(null);

      const blob = await getCroppedBlob(localSrc, croppedAreaPixels);
      const fileName = pendingFileName || "news-image.jpg";
      const file = new File([blob], fileName, { type: "image/jpeg" });

      const res = await uploadGameImage(file);
      if (!res.success || !res.url) {
        setError(res.error || "Failed to upload image.");
        return;
      }

      onChange(res.url);

      setModalOpen(false);
      URL.revokeObjectURL(localSrc);
      setLocalSrc(null);
      setPendingFileName(null);
    } catch (err) {
      console.error(err);
      setError("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  function handleCancelModal() {
    if (localSrc) URL.revokeObjectURL(localSrc);
    setLocalSrc(null);
    setPendingFileName(null);
    setModalOpen(false);
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs text-white/60 block mb-1">{label}</label>
      )}

      {/* small inline preview + button */}
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-28 overflow-hidden rounded-md border border-white/15 bg-black/40">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-white/40">
              No image
            </div>
          )}
        </div>

        <label className="inline-flex items-center justify-center rounded-md border border-white/30 bg-black/30 px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-black/50">
          {uploading ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      <p className="text-[11px] text-white/40">
        JPG / PNG / WEBP, max ~5MB. You can drag to reposition and zoom before
        saving.
      </p>

      {/* ---------- MODAL WITH CROPPER ---------- */}
      {modalOpen && localSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-2xl rounded-xl bg-[#050814] border border-white/15 shadow-2xl p-4 sm:p-6">
            <h2 className="text-sm font-semibold mb-3">Crop image</h2>

            <div className="relative h-[320px] w-full rounded-md overflow-hidden bg-black/60">
              <Cropper
                image={localSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid={false}
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-[11px] text-white/50 w-12 text-right">
                {zoom.toFixed(1)}x
              </span>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelModal}
                className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCrop}
                className="rounded-md bg-lime-400 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
                disabled={uploading}
              >
                {uploading ? "Saving…" : "Save image"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
