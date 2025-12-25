"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import PhotoUpload from "@/components/PhotoUpload";
import { getCurrentUserProfile, updateUserProfile } from "@/lib/actions/profile";
import { BULGARIAN_CITIES } from "@/app/data/cities";
import { useAuth } from "@/contexts/auth-context";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    city: "",
    avatar_url: "",
  });

  const [cityOpen, setCityOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/auth");
      return;
    }

    async function loadProfile() {
      try {
        const profileData = await getCurrentUserProfile();
        if (profileData) {
          setFormData({
            full_name: profileData.full_name || "",
            city: profileData.city || "",
            avatar_url: profileData.avatar_url || "",
          });
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [authLoading, user, router]);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const result = await updateUserProfile(formData);
      if (result.success) {
        router.push("/profile");
      } else {
        setError(result.error || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleCitySelect(city: string) {
    setFormData((prev) => ({ ...prev, city }));
    setCityOpen(false);
  }

  const filteredCities = useMemo(() => {
    const q = formData.city.trim().toLowerCase();
    if (!q) return BULGARIAN_CITIES;
    return BULGARIAN_CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [formData.city]);

  // loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6FF00] mx-auto" />
          <p className="mt-4 text-sm text-text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
      {/* Header (client style) */}
      <header className="text-center">
        <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/20 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-white/90 hover:bg-black/30 transition"
          >
            ← Back
          </button>

          <h1
            className={[
              "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
              "tracking-tight text-foreground leading-none",
              "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
            ].join(" ")}
          >
            Edit Profile
          </h1>

          {/* keeps title centered */}
          <div className="w-[72px] sm:w-[80px]" />
        </div>

        <p className="mt-3 text-xs sm:text-sm text-text-muted">
          Update your profile information
        </p>
      </header>

      <div className="mt-7 h-px w-full bg-border/40" />

      <div className="mt-6">
        <form
          onSubmit={handleFormSubmit}
          className="max-w-2xl mx-auto rounded-2xl border border-border bg-background/40 shadow-[0_18px_45px_rgba(0,0,0,0.35)] p-6 sm:p-8 space-y-8"
        >
          {/* Profile Picture */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wide text-white/70 mb-3">
              Profile Picture
            </label>

            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border border-white/10 bg-black/20">
                  <Image
                    src={formData.avatar_url || "/default.jpg"}
                    alt="Profile"
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>

                <PhotoUpload
                  onPhotoUploaded={(url) => {
                    setFormData((prev) => ({
                      ...prev,
                      avatar_url: url,
                    }));
                  }}
                />
              </div>

              <div>
                <p className="text-sm text-white/70 mb-1">
                  Upload a new profile picture
                </p>
                <p className="text-xs text-white/50">JPG, PNG or GIF. Max 5MB.</p>
              </div>
            </div>
          </div>

          {/* Full name + city */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="full_name"
                className="block text-[11px] font-extrabold uppercase tracking-wide text-white/70 mb-2"
              >
                Full Name *
              </label>

              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                required
                placeholder="Enter your full name"
                className="w-full px-4 py-2 rounded-lg border border-border bg-black/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C6FF00] focus:border-transparent"
              />
            </div>

            {/* City combobox */}
            <div className="relative">
              <label
                htmlFor="city"
                className="block text-[11px] font-extrabold uppercase tracking-wide text-white/70 mb-2"
              >
                City
              </label>

              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                onFocus={() => setCityOpen(true)}
                onBlur={() => {
                  setTimeout(() => setCityOpen(false), 120);
                }}
                placeholder="Where are you based?"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full px-4 py-2 rounded-lg border border-border bg-black/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C6FF00] focus:border-transparent"
              />

              {cityOpen && filteredCities.length > 0 && (
                <ul
                  className="
                    absolute z-20 mt-2 w-full max-h-60
                    overflow-y-auto rounded-lg border border-border
                    bg-background/90 backdrop-blur
                    shadow-[0_18px_45px_rgba(0,0,0,0.45)]
                  "
                >
                  {filteredCities.map((city) => (
                    <li key={city}>
                      <button
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        className="
                          w-full text-left px-3 py-2 text-sm
                          text-white/90 hover:bg-white/5
                          transition-colors
                        "
                      >
                        {city}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/20 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white/90 hover:bg-black/30 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md bg-[#C6FF00] px-5 py-2 text-xs font-extrabold uppercase tracking-wide text-black hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
