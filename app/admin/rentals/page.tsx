import Link from "next/link";
import { adminGetRentalRequests } from "@/lib/actions/rentals";
import AdminRentalRequests from "@/components/AdminRentalRequests";
import { createClient } from "@/lib/supabase/server";

export default async function AdminRentalsPage() {
  const supabase = await createClient();

  // mark all admin notifications as seen when opening this page
  await supabase.from("notifications_admin").update({ seen: true }).eq("seen", false);

  const requests = await adminGetRentalRequests();

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-10 text-white">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">Rental requests</h1>
          <p className="text-white/60 text-sm">Approve → Ship → Returned</p>
        </div>
        <Link href="/admin" className="text-sm text-white/70 hover:text-white">
          ← Back to admin
        </Link>
      </div>
      <AdminRentalRequests initialRequests={requests} />
    </div>
  );
}
