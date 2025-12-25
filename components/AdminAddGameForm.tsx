"use client";

import { useTransition, useState, useRef } from "react";
import { adminCreateRentalGame } from "@/lib/actions/rentals";
import toast from "react-hot-toast";

const PLATFORMS = [
  "PS5",
  "PS4",
  "Xbox One",
  "Xbox Series X",
  "PC",
  "Switch",
  "Other",
];

const GENRES = [
  "Action",
  "Adventure",
  "Sports",
  "RPG",
  "Shooter",
  "Racing",
  "Fighting",
  "Simulation",
  "Puzzle",
  "Horror",
  "Strategy",
  "Indie",
  "Platformer",
  "Stealth",
  "MMO",
  "Survival",
  "Sandbox",
  "Music",
  "Visual Novel",
  "Card Game",
  "Battle Royale",
  "Co-op",
  "Roguelike",
  "Tactical",
  "Metroidvania",
  "Casual",
  "Arcade",
];

export default function AdminAddGameForm() {
  const [pending, startTransition] = useTransition();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [priceEUR, setPriceEUR] = useState<number>(0);
  const [priceBGN, setPriceBGN] = useState<number>(0);
  const formRef = useRef<HTMLFormElement>(null);

  const EXCHANGE_RATE = 1.95583;

  function handleEURChange(e: React.ChangeEvent<HTMLInputElement>) {
    const eur = parseFloat(e.target.value) || 0;
    setPriceEUR(eur);
    setPriceBGN(parseFloat((eur * EXCHANGE_RATE).toFixed(2)));
  }

  function handleBGNChange(e: React.ChangeEvent<HTMLInputElement>) {
    const bgn = parseFloat(e.target.value) || 0;
    setPriceBGN(bgn);
    setPriceEUR(parseFloat((bgn / EXCHANGE_RATE).toFixed(2)));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setCoverFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (coverFile) formData.append("cover", coverFile);
    formData.set("price_amount", priceEUR.toString());

    startTransition(async () => {
      try {
        await adminCreateRentalGame(formData);
        toast.success("Game added successfully!");
        if (formRef.current) formRef.current.reset();
        setCoverFile(null);
        setPreviewUrl(null);
        setPriceEUR(0);
        setPriceBGN(0);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to add game");
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-black/40 border border-white/10 p-6 rounded-2xl space-y-5"
    >
      <h2 className="text-xl font-bold">Add New Rental Game</h2>

      {/* Cover Upload */}
      <div className="space-y-3">
        <label className="text-sm text-white/60">Cover image</label>
        <div className="flex flex-col items-center gap-3">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-40 aspect-[2/3] object-contain rounded-md"
            />
          )}
          <label className="inline-flex items-center justify-center px-4 py-1.5 text-sm font-semibold rounded-md bg-lime-400 hover:bg-lime-300 text-black cursor-pointer transition">
            Upload Cover
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Title & Platform */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-white/60">Title</label>
          <input
            required
            name="title"
            placeholder="Game title"
            className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="text-sm text-white/60">Platform</label>
          <select
            required
            name="platform"
            className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Copies & Price */}
      <div className="grid md:grid-cols-[100px_1fr] gap-4">
        <div>
          <label className="text-sm text-white/60">Total Copies</label>
          <input
            type="number"
            name="total_copies"
            required
            min="1"
            className="w-[80px] rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white text-center
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/60">Price</label>
          <div className="grid grid-cols-2 gap-3">
            {/* EUR */}
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={priceEUR}
                onChange={handleEURChange}
                className="w-full pr-8 rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-2 text-white/50 text-sm font-medium">€</span>
              <p className="text-xs text-white/50 mt-1">Price (EUR)</p>
            </div>

            {/* BGN */}
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={priceBGN}
                onChange={handleBGNChange}
                className="w-full pr-8 rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-2 text-white/50 text-sm font-medium">лв</span>
              <p className="text-xs text-white/50 mt-1">Price (BGN)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Genres */}
      <div>
        <label className="text-sm text-white/60 mb-2 block">Genres</label>
        <div className="flex flex-wrap gap-3">
          {GENRES.map((g) => (
            <label key={g} className="flex items-center gap-1 text-sm text-white/70">
              <input type="checkbox" name="genres" value={g} />
              {g}
            </label>
          ))}
        </div>
      </div>

      {/* ✅ Description */}
      <div>
        <label className="text-sm text-white/60 mb-2 block">Description</label>
        <textarea
          name="description"
          placeholder="Add a short description for this game..."
          rows={4}
          className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white resize-none"
        />
      </div>

      {/* Submit */}
      <button
        disabled={pending}
        type="submit"
        className="bg-lime-400 text-black font-bold px-6 py-2 rounded-xl disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add Game"}
      </button>
    </form>
  );
}
