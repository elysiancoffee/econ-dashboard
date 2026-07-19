"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { useApp } from "@/lib/store";
import { useEffect, useState } from "react";
import { LoaderTwo } from "@/components/ui/loader";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { realUser } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!realUser && !isLoginPage) {
      router.replace("/login");
    } else if (realUser && isLoginPage) {
      router.replace("/");
    }
  }, [realUser, isLoginPage, router]);

  // Close sidebar automatically on navigation (pathname changes)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // While redirecting unauthenticated users
  if (!realUser && !isLoginPage) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <LoaderTwo />
          <p className="text-sm text-neutral-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // While redirecting authenticated users from login page
  if (realUser && isLoginPage) {
    return null;
  }

  if (isLoginPage) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-6 md:p-8">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background/50 p-6 md:p-8">
          <div className="mx-auto h-full w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
