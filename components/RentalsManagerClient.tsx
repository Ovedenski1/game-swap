"use client";

import { useState, useTransition } from "react";
import type React from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import type { RentalGame } from "@/lib/actions/rentals";

type Props = {
  initialGames: RentalGame[];
};

type UpdatePayload = {
  title: string;
  platform: string;
  total_copies: number;
  price_amount: number;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong.";
}

function getFormString(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function getFormNumber(fd: FormData, key: string): number {
  const raw = getFormString(fd, key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export default function RentalsManagerClient({ initialGames }: Props) {
  const [games, setGames] = useState<RentalGame[]>(initialGames);
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Delete this game?")) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/rentals/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete game");

        setGames((prev) => prev.filter((g) => g.id !== id));
        toast.success("Game deleted!");
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const next: UpdatePayload = {
      title: getFormString(formData, "title"),
      platform: getFormString(formData, "platform"),
      total_copies: getFormNumber(formData, "total_copies"),
      price_amount: getFormNumber(formData, "price_amount"),
    };

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/rentals/${id}`, {
          method: "PUT",
          body: formData,
        });
        if (!res.ok) throw new Error("Failed to update game");

        setGames((prev) =>
          prev.map((g) => (g.id === id ? { ...g, ...next } : g)),
        );

        toast.success("Game updated!");
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <div
          key={game.id}
          className="bg-black/30 border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-4">
            {game.cover_url && (
              <div className="relative w-16 h-20 overflow-hidden rounded-md bg-black/40">
                <Image
                  src={game.cover_url}
                  alt={game.title}
                  fill
                  className="object-contain"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-semibold">{game.title}</p>
              <p className="text-xs text-white/50">{game.platform}</p>
              <p className="text-xs text-white/40 mt-1">
                ${game.price_amount.toFixed(2)} — {game.total_copies} copies
              </p>
            </div>

            <GameEditor
              game={game}
              onDelete={handleDelete}
              onSave={handleSave}
              pending={pending}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type GameEditorProps = {
  game: RentalGame;
  onDelete: (id: string) => void;
  onSave: (e: React.FormEvent<HTMLFormElement>, id: string) => void;
  pending: boolean;
};

function GameEditor({ game, onDelete, onSave, pending }: GameEditorProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  return (
    <div>
      {!isEditing ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs border border-white/20 px-3 py-1 rounded-md hover:bg-white/10"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(game.id)}
            disabled={pending}
            className="text-xs border border-red-500/50 px-3 py-1 rounded-md text-red-300 hover:bg-red-500/10 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            onSave(e, game.id);
            setIsEditing(false); // ✅ close form after saving
          }}
          className="grid grid-cols-2 gap-2 text-xs bg-black/40 border border-white/10 p-3 rounded-md w-[260px]"
        >
          <input
            name="title"
            defaultValue={game.title}
            className="bg-black/40 border border-white/20 rounded-md px-2 py-1 text-white"
          />
          <input
            name="platform"
            defaultValue={game.platform}
            className="bg-black/40 border border-white/20 rounded-md px-2 py-1 text-white"
          />
          <input
            type="number"
            name="total_copies"
            defaultValue={game.total_copies}
            className="bg-black/40 border border-white/20 rounded-md px-2 py-1 text-white"
          />
          <input
            type="number"
            step="0.01"
            name="price_amount"
            defaultValue={game.price_amount}
            className="bg-black/40 border border-white/20 rounded-md px-2 py-1 text-white"
          />

          <div className="col-span-2 flex justify-end gap-2 mt-1">
            <button
              type="submit"
              disabled={pending}
              className="bg-lime-400 text-black font-semibold rounded-md px-3 py-1 hover:bg-lime-300 disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-white/70 text-xs underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
