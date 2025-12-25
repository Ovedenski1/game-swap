"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRentalRequest } from "@/lib/actions/rentals";

export default function RentForm({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [city, setCity] = useState("");
  const [deliveryType, setDeliveryType] = useState<"home" | "office">("home");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const fn = firstName.trim();
    const ln = lastName.trim();
    const addr = shippingAddress.trim();
    const c = city.trim();
    const phone = phoneNumber.trim();
    const n = notes.trim();

    // ✅ Input validation
    if (!fn || !ln) {
      setError("Please enter your first and last name.");
      return;
    }

    if (fn.length < 2 || ln.length < 2) {
      setError("Names must be at least 2 characters long.");
      return;
    }

    if (!addr || !c) {
      setError("Please fill in your full address and city.");
      return;
    }

    const phoneRegex = /^\d{9,15}$/;
    if (!phoneRegex.test(phone)) {
      setError("Please enter a valid phone number (digits only).");
      return;
    }

    startTransition(async () => {
      try {
        await createRentalRequest(
          gameId,
          addr,
          deliveryType,
          phone,
          fn,
          ln,
          c,
          n || undefined,
        );

        setSuccess("Your rental request was successfully submitted!");
        setFirstName("");
        setLastName("");
        setShippingAddress("");
        setCity("");
        setDeliveryType("home");
        setPhoneNumber("");
        setNotes("");
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Failed to create request.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c0c0c]/90 p-6 shadow-lg backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-2 text-white">Request this rental</h2>
      <p className="text-xs text-white/60 mb-5">
        Fill out the form below to request shipping for this game.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/70">First name</label>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm outline-none"
              placeholder="Your first name"
            />
          </div>

          <div>
            <label className="text-xs text-white/70">Last name</label>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm outline-none"
              placeholder="Your last name"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="text-xs text-white/70">Shipping address</label>
          <textarea
            required
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm outline-none resize-none"
            rows={3}
            placeholder="Street, postal code, country..."
          />
        </div>

        {/* City */}
        <div>
          <label className="text-xs text-white/70">City</label>
          <input
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm outline-none"
            placeholder="Your city"
          />
        </div>

        {/* Delivery Type */}
        <div>
          <label className="text-xs text-white/70">Delivery type</label>
          <div className="flex items-center gap-4 mt-1 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="delivery_type"
                checked={deliveryType === "home"}
                onChange={() => setDeliveryType("home")}
              />
              Home
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="delivery_type"
                checked={deliveryType === "office"}
                onChange={() => setDeliveryType("office")}
              />
              Office
            </label>
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs text-white/70">Phone number</label>
          <input
            required
            type="tel"
            inputMode="numeric"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm outline-none"
            placeholder="Your phone number"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-white/70">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm outline-none resize-none"
            rows={2}
            placeholder="Any extra details?"
          />
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}
        {success && <div className="text-sm text-lime-400">{success}</div>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-lime-400 text-black font-bold py-3 hover:bg-lime-300 disabled:opacity-60 transition-all"
        >
          {pending ? "Sending..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
