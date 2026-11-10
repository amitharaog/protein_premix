import type { Viewport } from "next";
import localFont from "next/font/local";

// The launch page wears its own look: cream paper, espresso ink, big serif headlines (globals.css .theme-launch).
const serif = localFont({ src: "../../fonts/playfair-display.woff2", weight: "400 900", variable: "--font-launch-serif", display: "swap", adjustFontFallback: "Times New Roman" });

export const viewport: Viewport = { themeColor: "#eee3d1", colorScheme: "light" };

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return <div className={`theme-launch ${serif.variable} min-h-dvh`}>{children}</div>;
}
