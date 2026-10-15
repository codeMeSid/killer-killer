import type { Metadata } from "next";
import { Geist_Mono, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["600", "700"],
  subsets: ["latin"],
});

// KILLER ASCII art only — Plex Mono lacks the box-drawing glyphs it needs.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "killer-killer",
  description: "Next.js + Supabase + Ably",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexMono.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col border border-orange motion-safe:animate-fade-in">{children}</body>
    </html>
  );
}
