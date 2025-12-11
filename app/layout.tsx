import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StreamMatch",
  description: "Find matches, chat instantly — built with Next.js & Supabase.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
      >
        <AuthProvider>
          {/* Whole app: fixed to viewport height */}
          <div className="h-screen flex flex-col bg-background ">
            <Navbar />

            {/* Main can scroll INTERNALLY for normal pages */}
            <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {children}
            </main>

            
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
