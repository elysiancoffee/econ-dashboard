"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProvider } from "@/lib/store";
import { LayoutShell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delay={200}>
            <LayoutShell>{children}</LayoutShell>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </AppProvider>
    </SessionProvider>
  );
}
