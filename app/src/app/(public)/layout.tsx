import { Cinzel, Playfair_Display } from "next/font/google";

// Public pages wear the vintage royal theme (globals.css .theme-royal); /admin keeps the dark research look.
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700", "900"], style: ["normal", "italic"], variable: "--font-playfair" });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-cinzel" });

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className={`theme-royal ${playfair.variable} ${cinzel.variable} min-h-dvh`}>{children}</div>;
}
