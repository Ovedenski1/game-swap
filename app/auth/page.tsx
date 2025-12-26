// app/auth/page.tsx
import { Suspense } from "react";
import AuthClient from "./AuthClient";

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-64px)] w-full px-3 sm:px-6 lg:px-4 py-10 flex items-center justify-center text-sm text-white/60">
          Loading…
        </div>
      }
    >
      <AuthClient />
    </Suspense>
  );
}
