"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // Suppresses the React warning about script tags in components.
      // next-themes injects a small inline script to prevent FOUC (flash of
      // unstyled content) — this is intentional and safe to suppress.
      scriptProps={{ suppressHydrationWarning: true } as any}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
