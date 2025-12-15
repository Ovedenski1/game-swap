"use client";

import { useState, useTransition } from "react";
import { createRentalRequest } from "@/lib/actions/rentals";
import { useRouter } from "next/navigation";

export default function RentForm({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    router.refresh();
    startTransition(async () => {
      try {
        const id = await createRentalRequest(gameId, shippingAddress.trim(), notes.trim() || undefined);
        setSuccess(`Request sent! (id: ${id})`);
        setShippingAddress("");
        setNotes("");
        router.refresh();
      } catch (err: any) {
        setError(err?.message || "Failed to create request.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <h2 className="text-lg font-bold mb-2">Request this rental</h2>
      <p className="text-xs text-white/60 mb-4">
  Your request reserves a copy until an admin approves or rejects it.
</p>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-white/70">Shipping address</label>
          <textarea
            required
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm outline-none"
            rows={4}
            placeholder="Full name, street, city, zip, country, phone..."
          />
        </div>

        <div>
          <label className="text-xs text-white/70">Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm outline-none"
            placeholder="Anything we should know?"
          />
        </div>

        {error && <div className="text-sm text-red-300">{error}</div>}
        {success && <div className="text-sm text-lime-300">{success}</div>}

        <button
          disabled={pending}
          className="w-full rounded-xl bg-lime-400/90 text-black font-bold py-3 disabled:opacity-60"
        >
          {pending ? "Sending..." : "Rent"}
        </button>
      </form>
    </div>
  );
}
