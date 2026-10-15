import type { Metadata } from "next";
import { Geist_Mono, IBM_Plex_Mono, Pixelify_Sans, Press_Start_2P, Silkscreen, VT323 } from "next/font/google";
import "./globals.css";

// Body text: anything read closely (options, clues, epilogues).
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

// Pixel display faces, one per machine (CLAUDE.md §14): TV, phone terminal, home computer, arcade labels.
const pixelify = Pixelify_Sans({ variable: "--font-pixelify", weight: ["500", "700"], subsets: ["latin"] });
const vt323 = VT323({ variable: "--font-vt323", weight: "400", subsets: ["latin"] });
const silkscreen = Silkscreen({ variable: "--font-silkscreen", weight: ["400", "700"], subsets: ["latin"] });
const pressStart = Press_Start_2P({ variable: "--font-press-start", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "killer-killer",
  description: "A murder mystery for one TV and a room full of phones.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexMono.variable} ${geistMono.variable} ${pixelify.variable} ${vt323.variable} ${silkscreen.variable} ${pressStart.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col border border-orange">{children}</body>
    </html>
  );
}
