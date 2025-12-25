import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminGetRentalRequests, getRentalCatalog } from "@/lib/actions/rentals";
import AdminRentalRequests from "@/components/AdminRentalRequests";
import AdminAddGameForm from "@/components/AdminAddGameForm";
import RentalsManagerClient from "@/components/RentalsManagerClient";

export default async function AdminRentalsPage() {
  const supabase = await createClient();

  await supabase
    .from("notifications_admin")
    .update({ seen: true })
    .eq("seen", false);

  const [requests, games] = await Promise.all([
    adminGetRentalRequests(),
    getRentalCatalog(),
  ]);

  return (
    <div className="min-h-screen  flex flex-col bg-background text-white">
      <main className="flex-1 flex">
        <div className="flex-1 max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-4 flex">
          <div className="flex-1 bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-b-3xl flex flex-col">
            <div className="p-6 sm:p-8 lg:p-10 flex-1 flex flex-col space-y-10">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-1">Rental Requests</h1>
                  {/* ✅ Removed helper text */}
                </div>
                <Link
                  href="/admin"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  ← Back to Admin Dashboard
                </Link>
              </div>

              {/* Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
                {/* Left: Rental Requests */}
                <section className="bg-surface-soft border border-border rounded-2xl p-6 shadow-[0_15px_45px_rgba(0,0,0,0.6)] backdrop-blur-md">
                  <h2 className="text-xl font-semibold mb-5 border-b border-white/10 pb-3">
                    Incoming Requests
                  </h2>
                  <AdminRentalRequests initialRequests={requests} />
                </section>

                {/* Right: Add + Manage Games */}
                <section className="bg-surface-soft border border-border rounded-2xl p-6 shadow-[0_15px_45px_rgba(0,0,0,0.6)] backdrop-blur-md h-fit space-y-8">
                  <h2 className="text-xl font-semibold mb-5 border-b border-white/10 pb-3">
                    Add New Rental Game
                  </h2>

                  <AdminAddGameForm />

                  <div className="border-t border-white/10 pt-5">
                    <h3 className="text-lg font-semibold mb-3">Manage Games</h3>
                    <RentalsManagerClient initialGames={games} />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>

      
    </div>
  );
}
