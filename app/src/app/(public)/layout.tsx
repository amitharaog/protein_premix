import localFont from "next/font/local";

// Public pages wear the vintage royal theme (globals.css .theme-royal); /admin keeps the dark research look.
const playfair = localFont({
  src: [
    { path: "../../fonts/playfair-display.woff2", weight: "400 900", style: "normal" },
    { path: "../../fonts/playfair-display-italic.woff2", weight: "400 900", style: "italic" },
  ],
  variable: "--font-playfair", display: "swap", adjustFontFallback: "Times New Roman",
});
const cinzel = localFont({ src: "../../fonts/cinzel.woff2", weight: "400 900", variable: "--font-cinzel", display: "swap", adjustFontFallback: "Times New Roman" });

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className={`theme-royal ${playfair.variable} ${cinzel.variable} min-h-dvh`}>{children}</div>;
}
