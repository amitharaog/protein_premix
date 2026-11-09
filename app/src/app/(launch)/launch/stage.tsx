import Image from "next/image";
import { memo } from "react";
import { storyAt, storyVars } from "@/lib/launch/timeline";
import dessert from "./img/dessert.webp";
import dust from "./img/dust.webp";
import microwave from "./img/microwave.webp";
import mug from "./img/mug.webp";
import pour from "./img/pour.webp";

// The launch page's stage, in the manner of the pinned design: real objects cut out and floating on cream.
// One real mug carries the story (img/CREDITS.md): the QIXO sachet pours into it, the jug pours milk into it, it bakes
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
    delay: -Math.round(r() * 110) / 100, c: ["#cdb08a", "#e3cfb2", "#b8976e"][i % 3],
  }));
})();

const SPARKLES = [
  { l: "18%", t: "20%", k: 1 }, { l: "80%", t: "14%", k: 0.8 }, { l: "12%", t: "62%", k: 0.7 }, { l: "86%", t: "56%", k: 1.1 }, { l: "58%", t: "4%", k: 0.75 },
];

/** The QIXO sachet: a matte charcoal pouch with crimped seals and a tear strip. No flavour on it. 180 x 248 units. */
function Sachet({ brand }: { brand: string }) {
  const serif = { fontFamily: "var(--font-launch-serif), Georgia, serif" };
  const sans = { fontFamily: "var(--font-figtree), system-ui, sans-serif" };
  // A pinked (zigzag) edge, alternating between two heights, right to left or left to right.
  const pinked = (a: number, b: number) => Array.from({ length: 21 }, (_, i) => `L${170 - i * 8} ${i % 2 ? a : b}`).join(" ");
  const pinkedLtr = (a: number, b: number) => Array.from({ length: 21 }, (_, i) => `L${10 + i * 8} ${i % 2 ? a : b}`).join(" ");
  return (
    <svg viewBox="0 0 180 248" className="h-full w-full overflow-visible" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="q-body" x1="0" x2="1">
          <stop offset="0" stopColor="#2c2723" />
          <stop offset=".24" stopColor="#3a332d" />
          <stop offset=".58" stopColor="#24201c" />
          <stop offset="1" stopColor="#141210" />
        </linearGradient>
        <linearGradient id="q-seal" x1="0" x2="1">
          <stop offset="0" stopColor="#24201c" />
          <stop offset=".3" stopColor="#2f2925" />
          <stop offset="1" stopColor="#11100e" />
        </linearGradient>
        <linearGradient id="q-sheen" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".14" />
          <stop offset=".35" stopColor="#fff" stopOpacity="0" />
          <stop offset=".72" stopColor="#fff" stopOpacity=".05" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="q-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="3" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" />
          <feComponentTransfer><feFuncA type="table" tableValues="0 0.08" /></feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <path d={`M10 222 H170 V246 ${pinked(243, 246)} Z`} fill="url(#q-seal)" />
      <g stroke="#fff" strokeOpacity=".08" strokeWidth="1">
        {Array.from({ length: 31 }, (_, i) => <path key={i} d={`M${13 + i * 5} 225 V240`} />)}
      </g>
      <path d="M10 24 C 5 90, 5 156, 10 224 L 170 224 C 175 156, 175 90, 170 24 Z" fill="url(#q-body)" />
      <path d="M10 24 C 5 90, 5 156, 10 224 L 170 224 C 175 156, 175 90, 170 24 Z" fill="#fff" filter="url(#q-grain)" />
      <path d="M26 24 C 22 90, 22 156, 26 224 L 52 224 C 49 156, 49 90, 52 24 Z" fill="#fff" opacity=".07" />
      <path d="M10 24 C 5 90, 5 156, 10 224 L 170 224 C 175 156, 175 90, 170 24 Z" fill="url(#q-sheen)" />
      <path d="M20 40 C 40 46, 70 38, 100 44 M90 206 C 120 200, 150 208, 164 202" stroke="#fff" strokeOpacity=".07" strokeWidth="1.2" fill="none" />
      <text x="90" y="112" textAnchor="middle" fontSize="46" fontWeight="800" letterSpacing="3" fill="#f3e9da" style={serif}>{brand}</text>
      <path d="M64 128 H116" stroke="#c9a074" strokeWidth="1.3" />
      <text x="90" y="147" textAnchor="middle" fontSize="7.4" fontWeight="600" letterSpacing="1.9" fill="#e6d6c0" style={sans}>PROTEIN-BASED</text>
      <text x="90" y="159" textAnchor="middle" fontSize="7.4" fontWeight="600" letterSpacing="1.9" fill="#e6d6c0" style={sans}>DESSERT PREMIX</text>
      <text x="90" y="204" textAnchor="middle" fontSize="6.6" letterSpacing="2.2" fill="#c9a074" style={sans}>SINGLE SERVE</text>
      <path className="lp-torn" d={`M10 24 ${pinkedLtr(21, 24)}`} fill="none" stroke="#e8dccb" strokeWidth="2" strokeLinejoin="round" />
      <g className="lp-tear">
        <path d={`M10 24 ${pinkedLtr(21, 24)} L170 4 ${pinked(1, 4)} Z`} fill="url(#q-seal)" />
        <g stroke="#fff" strokeOpacity=".08" strokeWidth="1">
          {Array.from({ length: 31 }, (_, i) => <path key={i} d={`M${13 + i * 5} 7 V19`} />)}
        </g>
        <path d="M170 15 L162 19 L170 23 Z" fill="#f3ebdf" />
        <path d="M20 21 H158" stroke="#e8dccb" strokeWidth="0.9" strokeDasharray="3 3" opacity=".55" />
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
                <path key={deg} d="M0 -58 L0 -74" stroke="#c68a52" strokeWidth="5" strokeLinecap="round" transform={`rotate(${deg})`} />
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
              <path d="M0 -14 C 2 -3, 3 -2, 14 0 C 3 2, 2 3, 0 14 C -2 3, -3 2, -14 0 C -3 -2, -2 -3, 0 -14 Z" fill="#c68a52" />
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
