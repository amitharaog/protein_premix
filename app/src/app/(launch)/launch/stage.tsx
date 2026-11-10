import Image from "next/image";
import { memo } from "react";
import { storyAt, storyVars } from "@/lib/launch/timeline";
import dessert from "./img/dessert.webp";
import dust from "./img/dust.webp";
import microwave from "./img/microwave.webp";
import mug from "./img/mug.webp";
import pour from "./img/pour.webp";

// The launch page's stage, in the manner of the pinned design: real objects cut out and floating on cream.
// One real mug carries the story (img/CREDITS.md): the BRUKN kraft sachet pours into it, the jug pours milk into it, it bakes
// inside a real microwave behind the glass, and comes out with a golden top. mug, pour and dessert share one photo
// canvas (1024 x 683), so stacked they line up exactly. Every movement is CSS driven by a few custom properties
// (--tear, --tilt, --milkIn, …) that the page sets from the scroll position, so React never re-renders this.

const INITIAL = storyVars(storyAt(0));

// Fixed pseudo-random powder grains, so the server and the browser draw the same stream.
const GRAINS = (() => {
  let x = 11;
  const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: 30 }, (_, i) => ({
    x: Math.round((r() - 0.5) * 18), s: 1.6 + Math.round(r() * 22) / 10, d: 0.55 + Math.round(r() * 45) / 100,
    delay: -Math.round(r() * 110) / 100, c: ["#c9a77d", "#e0c9a6", "#ad8a5f"][i % 3],
  }));
})();

const SPARKLES = [
  { l: "18%", t: "20%", k: 1 }, { l: "80%", t: "14%", k: 0.8 }, { l: "12%", t: "62%", k: 0.7 }, { l: "86%", t: "56%", k: 1.1 }, { l: "58%", t: "4%", k: 0.75 },
];

/** The BRUKN sachet: a kraft-paper pouch with pinked seals, a tear strip and an original engraving-style line drawing
 *  (a steaming mug between wheat stalks on a hatched hill). No flavour on it. 180 x 248 units. `id` keeps the SVG
 *  gradient ids unique when the pack is drawn twice on one page. */
export function Sachet({ brand, id = "q" }: { brand: string; id?: string }) {
  const serif = { fontFamily: "var(--font-launch-serif), Georgia, serif" };
  const sans = { fontFamily: "var(--font-figtree), system-ui, sans-serif" };
  const ink = "#3a2618";
  const u = (n: string) => `url(#${id}-${n})`;
  // A pinked (zigzag) edge, alternating between two heights, right to left or left to right.
  const pinked = (a: number, b: number) => Array.from({ length: 21 }, (_, i) => `L${170 - i * 8} ${i % 2 ? a : b}`).join(" ");
  const pinkedLtr = (a: number, b: number) => Array.from({ length: 21 }, (_, i) => `L${10 + i * 8} ${i % 2 ? a : b}`).join(" ");
  // A wheat stalk: a curved stem with paired grains, drawn in ink like an engraving.
  const wheat = (x: number, lean: number, flip: 1 | -1) => (
    <g transform={`translate(${x} 182) rotate(${lean})`} stroke={ink} fill="none" strokeLinecap="round">
      <path d="M0 0 C 1 -20, 0 -40, -1 -62" strokeWidth="1.1" />
      {Array.from({ length: 7 }, (_, i) => {
        const y = -24 - i * 6;
        return (
          <g key={i}>
            <path d={`M-0.5 ${y} q ${-5 * flip} -2 ${-6.5 * flip} -7 q ${4 * flip} 1 ${6.5 * flip} 6`} strokeWidth="0.8" fill={ink} fillOpacity=".18" />
            <path d={`M-0.5 ${y} q ${5 * flip} -2 ${6.5 * flip} -7 q ${-4 * flip} 1 ${-6.5 * flip} 6`} strokeWidth="0.8" fill={ink} fillOpacity=".18" />
          </g>
        );
      })}
      <path d="M-1 -62 l -1.5 -8 M-1 -62 l 2 -7.5" strokeWidth=".6" />
      <path d={`M0 -14 q ${9 * flip} -6 ${15 * flip} -3`} strokeWidth=".9" />
    </g>
  );
  return (
    <svg viewBox="0 0 180 248" className="h-full w-full overflow-visible" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" x2="1">
          <stop offset="0" stopColor="#b98f5e" />
          <stop offset=".22" stopColor="#d2ad7c" />
          <stop offset=".6" stopColor="#c39b6a" />
          <stop offset="1" stopColor="#a17548" />
        </linearGradient>
        <linearGradient id={`${id}-seal`} x1="0" x2="1">
          <stop offset="0" stopColor="#b48a5a" />
          <stop offset=".3" stopColor="#c9a372" />
          <stop offset="1" stopColor="#9c7145" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff6e6" stopOpacity=".22" />
          <stop offset=".4" stopColor="#fff6e6" stopOpacity="0" />
          <stop offset="1" stopColor="#3a2618" stopOpacity=".1" />
        </linearGradient>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.23  0 0 0 0 0.15  0 0 0 0 0.09  0 0 0 0.55 -0.12" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <pattern id={`${id}-hatch`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
          <path d="M0 0 V3" stroke={ink} strokeWidth=".55" />
        </pattern>
        <clipPath id={`${id}-clip`}><path d="M10 24 C 5 90, 5 156, 10 224 L 170 224 C 175 156, 175 90, 170 24 Z" /></clipPath>
      </defs>
      <path d={`M10 222 H170 V246 ${pinked(243, 246)} Z`} fill={u("seal")} />
      <g stroke={ink} strokeOpacity=".16" strokeWidth=".8">
        {Array.from({ length: 31 }, (_, i) => <path key={i} d={`M${13 + i * 5} 226 V241`} />)}
      </g>
      <path d="M10 24 C 5 90, 5 156, 10 224 L 170 224 C 175 156, 175 90, 170 24 Z" fill={u("body")} />
      <path d="M10 24 C 5 90, 5 156, 10 224 L 170 224 C 175 156, 175 90, 170 24 Z" fill="#000" filter={u("grain")} />
      <path d="M10 24 C 5 90, 5 156, 10 224 L 170 224 C 175 156, 175 90, 170 24 Z" fill={u("sheen")} />
      <path d="M22 60 C 60 66, 110 56, 158 63 M18 196 C 70 190, 120 199, 162 192" stroke="#fff6e6" strokeOpacity=".16" strokeWidth="1.4" fill="none" />

      {/* Brand, stamped in ink */}
      <text x="90" y="56" textAnchor="middle" fontSize="31" fontWeight="800" letterSpacing="5" fill={ink} style={serif}>{brand}</text>
      <path d="M58 64 H122" stroke={ink} strokeWidth=".8" />
      <text x="90" y="74" textAnchor="middle" fontSize="6.4" fontWeight="600" letterSpacing="1.8" fill={ink} style={sans}>PROTEIN-BASED DESSERT PREMIX</text>

      {/* The line drawing: a hatched hill, wheat either side, a steaming mug on top */}
      <g clipPath={u("clip")}>
        <path d="M0 196 C 40 176, 78 172, 104 175 C 132 178, 160 186, 180 196 V230 H0 Z" fill="none" />
        <path d="M14 194 C 44 178, 80 173, 104 176 C 130 179, 150 185, 168 194 L168 206 L14 206 Z" fill={u("hatch")} opacity=".55" />
        <path d="M14 194 C 44 178, 80 173, 104 176 C 130 179, 150 185, 168 194" stroke={ink} strokeWidth="1" fill="none" />
        {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${24 + i * 10} ${190 - Math.sin(i / 2) * 4} l -1.5 -4 M${26 + i * 10} ${190 - Math.sin(i / 2) * 4} l 1 -4.5`} stroke={ink} strokeWidth=".6" />)}
      </g>
      {wheat(40, -10, 1)}
      {wheat(140, 10, -1)}
      <g stroke={ink} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M70 136 L73 172 C 74 177, 106 177, 107 172 L110 136" strokeWidth="1.3" fill="#d9b98a" fillOpacity=".35" />
        <ellipse cx="90" cy="136" rx="20" ry="4.2" strokeWidth="1.2" fill="#e8d2ad" fillOpacity=".5" />
        <ellipse cx="90" cy="137" rx="15.5" ry="2.4" strokeWidth=".7" fill={ink} fillOpacity=".25" />
        <path d="M109.5 143 C 122 141, 123 162, 108 161" strokeWidth="1.3" />
        <path d="M109 147 C 117 147, 117 157, 108.5 157" strokeWidth=".8" />
        {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${98 + i * 1.2} ${141 + i * 0.4} L${99 + i * 1.2} ${172 - i * 0.2}`} strokeWidth=".5" />)}
        <path d="M80 128 C 76 120, 84 116, 80 106 M90 127 C 86 117, 95 112, 90 99 M100 128 C 96 120, 104 116, 100 107" strokeWidth="1" />
      </g>

      <text x="90" y="216" textAnchor="middle" fontSize="6" letterSpacing="2.4" fill={ink} style={sans}>SINGLE SERVE</text>
      <path className="lp-torn" d={`M10 24 ${pinkedLtr(21, 24)}`} fill="none" stroke="#f3e6cf" strokeWidth="2" strokeLinejoin="round" />
      <g className="lp-tear">
        <path d={`M10 24 ${pinkedLtr(21, 24)} L170 4 ${pinked(1, 4)} Z`} fill={u("seal")} />
        <g stroke={ink} strokeOpacity=".16" strokeWidth=".8">
          {Array.from({ length: 31 }, (_, i) => <path key={i} d={`M${13 + i * 5} 7 V19`} />)}
        </g>
        <path d="M170 15 L162 19 L170 23 Z" fill="#eee3d1" />
        <path d="M20 21 H158" stroke={ink} strokeWidth="0.8" strokeDasharray="3 3" opacity=".45" />
      </g>
    </svg>
  );
}

export const Stage = memo(function Stage({ brand, stageRef }: { brand: string; stageRef: React.Ref<HTMLDivElement> }) {
  const photo = "(min-width: 1024px) 50vw, 120vw";
  return (
    <div ref={stageRef} className="lp-stage h-full w-full" style={INITIAL as React.CSSProperties} data-idle="1" data-pour="0" data-steam="0" data-sparkle="0" aria-hidden="true">
      <div className="lp-swirl" />

      {/* Step 3: the microwave. The mug sits inside, behind the glass, and bakes. */}
      <div className="lp-layer">
        <div className="lp-oven">
          <div className="lp-cavity"><div className="lp-cavity-glow" /></div>
          <div className="lp-inside">
            <div className="lp-canvas lp-inmug">
              <Image src={mug} alt="" fill sizes="(min-width: 1024px) 34vw, 70vw" className="object-contain" />
              <Image src={dessert} alt="" fill sizes="(min-width: 1024px) 34vw, 70vw" className="lp-baked object-contain" />
            </div>
          </div>
          <Image src={microwave} alt="" fill sizes="(min-width: 1024px) 46vw, 96vw" className="object-contain" />
          <div className="lp-glass" />
          <div className="lp-ding">
            <svg viewBox="-80 -80 160 160" className="absolute inset-0 h-full w-full overflow-visible">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <path key={deg} d="M0 -58 L0 -74" stroke="#b06a3b" strokeWidth="5" strokeLinecap="round" transform={`rotate(${deg})`} />
              ))}
            </svg>
            <span className="lp-serif relative">Ding!</span>
          </div>
        </div>
      </div>

      {/* Steps 1 and 2: the mug, and the jug that slides in to pour the milk. */}
      <div className="lp-canvas lp-mugbox">
        <Image src={mug} alt="" fill sizes={photo} priority className="object-contain" />
        <Image src={pour} alt="" fill sizes={photo} className="lp-jug object-contain" />
      </div>

      {/* Step 4: the finished dessert. */}
      <div className="lp-canvas lp-finalbox">
        <Image src={dessert} alt="" fill sizes={photo} className="object-contain" />
        <svg className="lp-steam" viewBox="0 0 120 120" fill="none" stroke="#fffaf2" strokeWidth="5" strokeLinecap="round">
          <path d="M34 112 C 22 90, 46 74, 34 44" />
          <path d="M60 116 C 48 88, 72 70, 60 30" />
          <path d="M86 112 C 74 90, 98 74, 86 46" />
        </svg>
        <div className="lp-sparkles">
          {SPARKLES.map((s, i) => (
            <svg key={i} viewBox="-14 -14 28 28" className="lp-twinkle absolute" style={{ left: s.l, top: s.t, width: `${28 * s.k}px`, height: `${28 * s.k}px`, animationDelay: `${i * 0.3}s` }}>
              <path d="M0 -14 C 2 -3, 3 -2, 14 0 C 3 2, 2 3, 0 14 C -2 3, -3 2, -14 0 C -3 -2, -2 -3, 0 -14 Z" fill="#b06a3b" />
            </svg>
          ))}
        </div>
      </div>

      {/* Step 1, on top: the powder stream and the sachet. */}
      <div className="lp-pour" style={{ backgroundImage: `url(${dust.src})` }}>
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
