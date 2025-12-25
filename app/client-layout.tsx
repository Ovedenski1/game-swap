"use client";

import { AuthProvider } from "@/contexts/auth-context";
import Navbar from "@/components/Navbar";
import { NotificationListener } from "@/contexts/notification-context";
import { Toaster } from "react-hot-toast";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-background text-white">
        <Navbar />
        <NotificationListener />

        {/* Fills space between navbar and footer */}
        <main className="flex-1 flex flex-col">
          {/* width container fills height (NO py here) */}
          <div className="max-w-[1200px] w-full mx-auto px-3 sm:px-6 lg:px-4 flex-1 flex flex-col">
            {/* ✅ Panel fills ALL remaining height */}
            <div className="bg-navbar/90 ring-1 ring-border shadow-[0_20px_60px_rgba(0,0,0,0.35)]  overflow-hidden flex-1 flex flex-col">
              {/* padding goes inside so panel can reach footer */}
              <div className="  flex-1 ">
                {children}
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-navbar border-t border-border text-foreground text-center py-4 text-xs sm:text-sm font-medium">
          © 2025 GameLink — Built with ❤️ using Next.js
        </footer>
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1a1a1a",
            color: "#fff",
            fontSize: "14px",
            padding: "10px 16px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            maxWidth: "480px",
            minWidth: "180px",
            whiteSpace: "nowrap",
          },
        }}
      />
    </AuthProvider>
  );
}
