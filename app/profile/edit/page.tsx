"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import PhotoUpload from "@/components/PhotoUpload";
import {
  getCurrentUserProfile,
  updateUserProfile,
} from "@/lib/actions/profile";
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
      <div className="flex-1 flex items-center justify-center bg-background text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6FF00] mx-auto" />
          <p className="mt-4 text-white/70">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col bg-background text-white">
      <main className="flex-1 flex">
        <div className="flex-1 max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 flex">
          <div className="flex-1 bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-b-3xl flex flex-col">
            <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
              <div className="max-w-2xl mx-auto">
                {/* Header with back button */}
                <header className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="text-xs sm:text-sm text-white/70 hover:text-white underline underline-offset-4"
                    >
                      ← Back to Profile
                    </button>
                    
                  </div>
                  <div className="text-center">
                    <h1 className="text-3xl font-bold mb-2">Edit Profile</h1>
                    <p className="text-white/60 text-sm">
                      Update your profile information
                    </p>
                  </div>
                </header>

                {/* form card */}
                <form
                  onSubmit={handleFormSubmit}
                  className="bg-surface-soft rounded-2xl border border-border shadow-[0_18px_45px_rgba(0,0,0,0.8)] p-6 sm:p-8 space-y-8"
                >
                  {/* Profile Picture */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-4">
                      Profile Picture
                    </label>
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-black/60">
                          <img
                            src={formData.avatar_url || "/default.jpg"}
                            alt="Profile"
                            className="w-full h-full object-cover"
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
                        <p className="text-xs text-white/50">
                          JPG, PNG or GIF. Max 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Full name + city */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="full_name"
                        className="block text-sm font-medium text-white/80 mb-2"
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
                        className="w-full px-4 py-2 rounded-lg border border-border bg-[#101426] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C6FF00] focus:border-transparent"
                      />
                    </div>

                    {/* City combobox */}
                    <div className="relative">
                      <label
                        htmlFor="city"
                        className="block text-sm font-medium text-white/80 mb-2"
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
                        className="w-full px-4 py-2 rounded-lg border border-border bg-[#101426] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C6FF00] focus:border-transparent"
                      />

                      {cityOpen && filteredCities.length > 0 && (
                        <ul
                          className="
                            absolute z-20 mt-1 w-full max-h-60
                            overflow-y-auto rounded-lg border border-border
                            bg-[#101426] shadow-lg
                          "
                        >
                          {filteredCities.map((city) => (
                            <li key={city}>
                              <button
                                type="button"
                                onClick={() => handleCitySelect(city)}
                                className="
                                  w-full text-left px-3 py-1.5 text-sm
                                  text-white hover:bg-white/5
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
                    <div className="p-4 rounded-lg border border-red-500/70 bg-red-500/10 text-red-300 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-6 border-t border-border">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="px-6 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#D946EF] to-[#8B5CF6] hover:from-[#EC4899] hover:to-[#6366F1] text-white shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-navbar border-t border-border text-foreground text-center py-4 text-xs sm:text-sm font-medium">
        © {new Date().getFullYear()} GameLink — Built with ❤️ using Next.js
      </footer>
    </div>
  );
}
