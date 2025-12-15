"use client";

import { AuthProvider } from "@/contexts/auth-context";
import Navbar from "@/components/Navbar";
import { NotificationListener } from "@/contexts/notification-context";
import { Toaster } from "react-hot-toast";

function LayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar />
      {/* 🔔 Simplified listener, no props needed */}
      <NotificationListener />
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto relative z-0">
        {children}
      </main>
    </div>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <LayoutInner>{children}</LayoutInner>
      <Toaster position="top-center" />
    </AuthProvider>
  );
}
