import type { Metadata } from "next";
import "./globals.css";
import { LayoutShell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/lib/store";
import React from "react";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "ECON Inner Circle",
  description: "Together we rise, divided we fall.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <AppProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <LayoutShell>{children}</LayoutShell>
            <Toaster />
          </ThemeProvider>
        </AppProvider>
      </body>
    </html>
  );
}