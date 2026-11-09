import type { Viewport } from "next";
import { Playfair_Display } from "next/font/google";

// The launch page wears its own look: cream paper, espresso ink, big serif headlines (globals.css .theme-launch).
const serif = Playfair_Display({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-launch-serif" });

export const viewport: Viewport = { themeColor: "#f3ebdf", colorScheme: "light" };

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return <div className={`theme-launch ${serif.variable} min-h-dvh`}>{children}</div>;
}
