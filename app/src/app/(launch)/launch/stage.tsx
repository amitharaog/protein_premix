import Image from "next/image";
import { memo } from "react";
import { storyAt, storyVars } from "@/lib/launch/timeline";
import microwave from "./img/microwave.webp";
import milk from "./img/milk.jpg";
import mugcake from "./img/mugcake.jpg";

// The launch page's stage: the QIXO sachet (drawn here, no photo of the pack exists yet) over real photos of the mug,
// the microwave and the finished dessert (img/CREDITS.md). Every movement is CSS driven by a few custom properties
// (--tear, --tilt, --milkIn, …) that the page sets from the scroll position, so React never re-renders this.

const INITIAL = storyVars(storyAt(0));

// Fixed pseudo-random powder grains, so the server and the browser draw the same stream.
const GRAINS = (() => {
  let x = 11;
  const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: 36 }, (_, i) => ({
    x: Math.round((r() - 0.5) * 22), s: 2 + Math.round(r() * 30) / 10, d: 0.6 + Math.round(r() * 50) / 100,
    delay: -Math.round(r() * 110) / 100, c: ["#8e5e3b", "#a87750", "#6f4529"][i % 3],
  }));
})();

const SPARKLES = [
  { l: "6%", t: "22%", k: 1 }, { l: "88%", t: "16%", k: 0.8 }, { l: "4%", t: "70%", k: 0.7 }, { l: "92%", t: "62%", k: 1.1 }, { l: "50%", t: "3%", k: 0.75 },
];

/** The QIXO sachet: a matte espresso pouch with crimped seals and a tear strip. 180 x 248 units. */
function Sachet({ brand }: { brand: string }) {
  const serif = { fontFamily: "var(--font-launch-serif), Georgia, serif" };
  const sans = { fontFamily: "var(--font-figtree), system-ui, sans-serif" };
  // A pinked (zigzag) edge between x = 170 and x = 10, alternating between two heights.
  const pinked = (a: number, b: number) => Array.from({ length: 21 }, (_, i) => `L${170 - i * 8} ${i % 2 ? a : b}`).join(" ");
  const pinkedLtr = (a: number, b: number) => Array.from({ length: 21 }, (_, i) => `L${10 + i * 8} ${i % 2 ? a : b}`).join(" ");
  return (
    <svg viewBox="0 0 180 248" className="h-full w-full overflow-visible" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="q-body" x1="0" x2="1">
          <stop offset="0" stopColor="#4d2d1b" />
          <stop offset=".22" stopColor="#5b3622" />
          <stop offset=".55" stopColor="#3b2315" />
          <stop offset="1" stopColor="#1f120b" />
        </linearGradient>
        <linearGradient id="q-seal" x1="0" x2="1">
          <stop offset="0" stopColor="#3a2215" />
          <stop offset=".3" stopColor="#4a2c1b" />
          <stop offset="1" stopColor="#1c100a" />
        </linearGradient>
        <linearGradient id="q-sheen" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".12" />
          <stop offset=".35" stopColor="#fff" stopOpacity="0" />
          <stop offset=".7" stopColor="#fff" stopOpacity=".05" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* bottom seal with a pinked edge */}
      <path d={`M10 222 H170 V246 ${pinked(243, 246)} Z`} fill="url(#q-seal)" />
      <g stroke="#fff" strokeOpacity=".09" strokeWidth="1">
        {Array.from({ length: 31 }, (_, i) => <path key={i} d={`M${13 + i * 5} 225 V240`} />)}
      </g>
      {/* body */}
      <path d="M10 24 C 5 90, 5 156, 10 224 L 170 224 C 175 156, 175 90, 170 24 Z" fill="url(#q-body)" />
      <path d="M26 24 C 22 90, 22 156, 26 224 L 50 224 C 47 156, 47 90, 50 24 Z" fill="#fff" opacity=".07" />
      <path d="M10 24 C 5 90, 5 156, 10 224 L 170 224 C 175 156, 175 90, 170 24 Z" fill="url(#q-sheen)" />
      <path d="M20 40 C 40 46, 70 38, 100 44 M90 206 C 120 200, 150 208, 164 202" stroke="#fff" strokeOpacity=".06" strokeWidth="1.2" fill="none" />
      {/* print */}
      <text x="90" y="104" textAnchor="middle" fontSize="44" fontWeight="800" letterSpacing="3" fill="#f3e6d3" style={serif}>{brand}</text>
      <path d="M62 120 H118" stroke="#c68a52" strokeWidth="1.4" />
      <text x="90" y="139" textAnchor="middle" fontSize="10.5" fontWeight="600" letterSpacing="4.2" fill="#d9a46c" style={sans}>CHOCOLATE</text>
      <text x="90" y="155" textAnchor="middle" fontSize="7" letterSpacing="1.4" fill="#e8d5bd" fillOpacity=".85" style={sans}>PROTEIN-BASED DESSERT PREMIX</text>
      <circle cx="90" cy="186" r="13" fill="none" stroke="#c68a52" strokeWidth="1.2" strokeOpacity=".8" />
      <path d="M83 189 Q82 179 90 178 Q98 179 97 189 Z" fill="#d9a46c" fillOpacity=".9" />
      <rect x="82" y="188" width="16" height="6" rx="1.5" fill="#d9a46c" fillOpacity=".9" />
      {/* the open edge left behind once the strip is torn off */}
      <path className="lp-torn" d={`M10 24 ${pinkedLtr(21, 24)}`} fill="none" stroke="#e8d3b8" strokeWidth="2" strokeLinejoin="round" />
      {/* tear strip */}
      <g className="lp-tear">
        <path d={`M10 24 ${pinkedLtr(21, 24)} L170 4 ${pinked(1, 4)} Z`} fill="url(#q-seal)" />
        <g stroke="#fff" strokeOpacity=".09" strokeWidth="1">
          {Array.from({ length: 31 }, (_, i) => <path key={i} d={`M${13 + i * 5} 7 V19`} />)}
        </g>
        <path d="M170 15 L162 19 L170 23 Z" fill="#f3ebdf" />
        <path d="M20 21 H158" stroke="#e8d3b8" strokeWidth="0.9" strokeDasharray="3 3" opacity=".6" />
      </g>
    </svg>
  );
}

export const Stage = memo(function Stage({ brand, stageRef }: { brand: string; stageRef: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={stageRef} className="lp-stage h-full w-full" style={INITIAL as React.CSSProperties} data-idle="1" data-pour="0" data-steam="0" data-sparkle="0" aria-hidden="true">
      <div className="lp-layer"><div className="lp-swirl" /></div>

      {/* Step 2: the mug that catches the mix, and the milk going in. */}
      <div className="lp-layer">
        <div className="lp-frame lp-milk">
          <Image src={milk} alt="" fill sizes="(min-width: 1024px) 34vw, 80vw" placeholder="blur" className="lp-milk-img object-cover" />
        </div>
      </div>

      {/* Step 3: the microwave, with the mug lit up behind the glass. */}
      <div className="lp-layer">
        <div className="lp-oven">
          <Image src={microwave} alt="" fill sizes="(min-width: 1024px) 40vw, 96vw" className="object-contain" />
          <div className="lp-window">
            <Image src={mugcake} alt="" fill sizes="(min-width: 1024px) 24vw, 56vw" className="lp-window-img object-cover" />
            <div className="lp-window-glow" />
            <div className="lp-window-glass" />
          </div>
          <div className="lp-ding">
            <svg viewBox="-80 -80 160 160" className="absolute inset-0 h-full w-full overflow-visible">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <path key={deg} d="M0 -58 L0 -74" stroke="#c68a52" strokeWidth="5" strokeLinecap="round" transform={`rotate(${deg})`} />
              ))}
            </svg>
            <span className="lp-serif relative">Ding!</span>
          </div>
        </div>
      </div>

      {/* Step 4: the finished dessert. */}
      <div className="lp-layer">
        <div className="lp-frame lp-arch lp-final">
          <Image src={mugcake} alt="" fill sizes="(min-width: 1024px) 32vw, 78vw" placeholder="blur" className="object-cover object-[50%_35%]" />
          <svg className="lp-steam" viewBox="0 0 120 120" fill="none" stroke="#fffaf2" strokeWidth="5" strokeLinecap="round">
            <path d="M34 112 C 22 90, 46 74, 34 44" />
            <path d="M60 116 C 48 88, 72 70, 60 30" />
            <path d="M86 112 C 74 90, 98 74, 86 46" />
          </svg>
        </div>
        <div className="lp-sparkles">
          {SPARKLES.map((s, i) => (
            <svg key={i} viewBox="-14 -14 28 28" className="lp-twinkle absolute" style={{ left: s.l, top: s.t, width: `${28 * s.k}px`, height: `${28 * s.k}px`, animationDelay: `${i * 0.3}s` }}>
              <path d="M0 -14 C 2 -3, 3 -2, 14 0 C 3 2, 2 3, 0 14 C -2 3, -3 2, -14 0 C -3 -2, -2 -3, 0 -14 Z" fill="#c68a52" />
            </svg>
          ))}
        </div>
      </div>

      {/* Step 1, on top: the sachet and the powder stream. */}
      <div className="lp-pour">
        {GRAINS.map((g, i) => (
          <i key={i} style={{ "--x": `${g.x}px`, "--s": `${g.s}px`, "--d": `${g.d}s`, "--delay": `${g.delay}s`, "--c": g.c } as React.CSSProperties} />
        ))}
      </div>
      <div className="lp-sachet">
        <div className="lp-bob h-full w-full"><Sachet brand={brand} /></div>
      </div>
    </div>
  );
});
