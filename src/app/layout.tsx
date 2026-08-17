import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import React from "react";

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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}