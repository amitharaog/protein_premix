import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { brand } from "@/config/brand";
import "./globals.css";

// Fonts ship with the app (src/fonts, SIL Open Font Licence), so builds never fetch from Google Fonts, which failed
// intermittently on CI on 9 Nov 2026. Same files Google serves (latin), variable where the family has it.
const anton = localFont({ src: "../fonts/anton.woff2", weight: "400", variable: "--font-anton", display: "swap" });
const oswald = localFont({ src: "../fonts/oswald.woff2", weight: "200 700", variable: "--font-oswald", display: "swap" });
const figtree = localFont({ src: "../fonts/figtree.woff2", weight: "300 900", variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: { default: brand.siteTitle, template: `%s · ${brand.siteTitle}` },
  description: brand.description,
  alternates: { languages: { "en-IN": "/" } },
};

export const viewport: Viewport = {
  themeColor: "#140b07",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${anton.variable} ${oswald.variable} ${figtree.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
