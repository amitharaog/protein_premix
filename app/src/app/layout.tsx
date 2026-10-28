import type { Metadata, Viewport } from "next";
import { Anton, Figtree, Modak, Oswald } from "next/font/google";
import { brand } from "@/config/brand";
import "./globals.css";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" });
const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-oswald" });
const modak = Modak({ subsets: ["latin"], weight: "400", variable: "--font-modak" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-figtree" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
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
    <html lang="en-IN" className={`${anton.variable} ${oswald.variable} ${modak.variable} ${figtree.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
