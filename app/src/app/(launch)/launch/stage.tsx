import Image from "next/image";
import { memo } from "react";
import { storyAt, storyVars } from "@/lib/launch/timeline";
import dust from "./img/dust.webp";
import microwave from "./img/microwave.webp";
import pour from "./img/pour.webp";

// The launch page's stage, in the manner of the pinned design: real objects cut out and floating on cream.
// One drawn mug carries the story (the speckled cream mug from the first version): the BRUKN kraft sachet pours into it, the jug pours milk into it, it bakes
// inside a real microwave behind the glass, and comes out with a golden top. the mug is drawn on the
// jug photo's canvas (1024 x 683), so stacked they line up exactly. Every movement is CSS driven by a few custom properties
// (--tear, --tilt, --milkIn, …) that the page sets from the scroll position, so React never re-renders this.

const INITIAL = storyVars(storyAt(0));

// Fixed pseudo-random powder grains, so the server and the browser draw the same stream.
const GRAINS = (() => {
  let x = 11;
  const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: 30 }, (_, i) => ({
    x: Math.round((r() - 0.5) * 18), s: 1.6 + Math.round(r() * 22) / 10, d: 0.55 + Math.round(r() * 45) / 100,
    delay: -Math.round(r() * 110) / 100, c: ["#8e5e3b", "#a87750", "#6f4529"][i % 3],
  }));
})();

const SPARKLES = [
  { l: "18%", t: "20%", k: 1 }, { l: "80%", t: "14%", k: 0.8 }, { l: "12%", t: "62%", k: 0.7 }, { l: "86%", t: "56%", k: 1.1 }, { l: "58%", t: "4%", k: 0.75 },
];

/** The BRUKN sachet: a kraft-paper pouch with pinked seals, a tear strip and an original engraving-style landscape
 *  (a windmill on a hatched hill, a barn, clouds, birds and wild grass), after the founder's rustic reference. No flavour
 *  on it. 180 x 248 units. `id` keeps the SVG ids unique when the pack is drawn twice on one page. */
export function Sachet({ brand, id = "q" }: { brand: string; id?: string }) {
  const serif = { fontFamily: "var(--font-launch-serif), Georgia, serif" };
  const sans = { fontFamily: "var(--font-figtree), system-ui, sans-serif" };
  const ink = "#2f1f14";
  const u = (n: string) => `url(#${id}-${n})`;
  const pinked = (a: number, b: number) => Array.from({ length: 21 }, (_, i) => `L${170 - i * 8} ${i % 2 ? a : b}`).join(" ");
  const pinkedLtr = (a: number, b: number) => Array.from({ length: 21 }, (_, i) => `L${10 + i * 8} ${i % 2 ? a : b}`).join(" ");
  const body = "M10 24 C 5 90, 5 156, 10 224 L 170 224 C 175 156, 175 90, 170 24 Z";
  // One lattice sail: a stock from the hub with a framed grid on one side.
  const sail = (deg: number) => (
    <g key={deg} transform={`rotate(${deg})`} stroke={ink} fill="none">
      <path d="M0 -3 V-50" strokeWidth="1.4" />
      <rect x="1.5" y="-50" width="9" height="36" strokeWidth=".8" fill="#e9d3ac" fillOpacity=".35" />
      {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M1.5 ${-46 + i * 4.3} H10.5`} strokeWidth=".45" />)}
      <path d="M6 -50 V-14" strokeWidth=".45" />
    </g>
  );
  const cloud = (x: number, y: number, k: number) => (
    <path transform={`translate(${x} ${y}) scale(${k})`} d="M0 0 C -2 -6, 6 -9, 9 -5 C 11 -11, 21 -11, 22 -4 C 27 -7, 32 -2, 29 1 Z"
      stroke={ink} strokeWidth=".7" fill="none" />
  );
  return (
    <svg viewBox="0 0 180 248" className="h-full w-full overflow-visible" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" x2="1">
          <stop offset="0" stopColor="#b88d5c" />
          <stop offset=".2" stopColor="#d1ab7a" />
          <stop offset=".62" stopColor="#c7a06e" />
          <stop offset="1" stopColor="#a4794b" />
        </linearGradient>
        <linearGradient id={`${id}-seal`} x1="0" x2="1">
          <stop offset="0" stopColor="#b48a5a" />
          <stop offset=".3" stopColor="#cfa977" />
          <stop offset="1" stopColor="#9e7346" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff6e6" stopOpacity=".18" />
          <stop offset=".5" stopColor="#fff6e6" stopOpacity="0" />
          <stop offset=".86" stopColor="#3a2618" stopOpacity="0" />
          <stop offset="1" stopColor="#3a2618" stopOpacity=".14" />
        </linearGradient>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.23  0 0 0 0 0.15  0 0 0 0 0.09  0 0 0 0.5 -0.12" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <pattern id={`${id}-hatch`} width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
          <path d="M0 0 V2.6" stroke={ink} strokeWidth=".5" />
        </pattern>
        <pattern id={`${id}-planks`} width="4" height="3.2" patternUnits="userSpaceOnUse">
          <path d="M0 3 H4" stroke={ink} strokeWidth=".45" />
        </pattern>
        <clipPath id={`${id}-clip`}><path d={body} /></clipPath>
      </defs>

      <path d={`M10 222 H170 V246 ${pinked(243, 246)} Z`} fill={u("seal")} />
      <path d={body} fill={u("body")} />
      <path d={body} fill="#000" filter={u("grain")} />

      <text x="90" y="46" textAnchor="middle" fontSize="20" fontWeight="800" letterSpacing="5" fill={ink} style={serif}>{brand}</text>

      <g clipPath={u("clip")}>
        {/* Sky: clouds and two birds */}
        {cloud(26, 112, 0.9)}
        {cloud(124, 96, 1.1)}
        {cloud(30, 160, 0.6)}
        <path d="M44 74 q 4 -4 8 0 q 4 -5 9 -1" stroke={ink} strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M126 70 q 3 -3 6 0 q 3 -4 7 -1" stroke={ink} strokeWidth=".9" fill="none" strokeLinecap="round" />

        {/* The windmill tower: tapered, planked, with a door and a window */}
        <path d="M74 182 L80 112 L100 112 L106 182 Z" fill="#d8b98c" fillOpacity=".4" />
        <path d="M74 182 L80 112 L100 112 L106 182 Z" fill={u("planks")} />
        <path d="M93 112 L98 182 L106 182 L100 112 Z" fill={u("hatch")} opacity=".7" />
        <path d="M74 182 L80 112 L100 112 L106 182 Z" stroke={ink} strokeWidth="1" fill="none" />
        <path d="M86 182 V172 a4 4 0 0 1 8 0 V182" stroke={ink} strokeWidth=".8" fill="#2f1f14" fillOpacity=".25" />
        <rect x="95" y="140" width="3.5" height="5" stroke={ink} strokeWidth=".6" fill="#2f1f14" fillOpacity=".35" />
        <path d="M77 112 Q 90 96 103 112 Z" stroke={ink} strokeWidth="1" fill="#d8b98c" fillOpacity=".5" />
        <path d="M84 106 Q 90 100 96 106" stroke={ink} strokeWidth=".5" fill="none" />

        {/* A small barn to the right */}
        <path d="M114 186 V174 L123 167 L132 174 V186 Z" stroke={ink} strokeWidth=".8" fill={u("planks")} />
        <path d="M112 175 L123 166 L134 175" stroke={ink} strokeWidth="1" fill="none" />
        <rect x="120" y="178" width="5" height="8" stroke={ink} strokeWidth=".6" fill="none" />
        <path d="M128 168 V163 H130 V170" stroke={ink} strokeWidth=".6" fill="none" />

        {/* The hill, hatched, with wild grass in front */}
        <path d="M0 192 C 34 178, 70 178, 98 181 C 128 184, 152 182, 180 176 V232 H0 Z" fill="#c9a272" />
        <path d="M0 192 C 34 178, 70 178, 98 181 C 128 184, 152 182, 180 176 V232 H0 Z" fill={u("hatch")} opacity=".35" />
        <path d="M0 192 C 34 178, 70 178, 98 181 C 128 184, 152 182, 180 176" stroke={ink} strokeWidth="1" fill="none" />
        <path d="M112 192 C 130 189, 148 190, 166 195 M106 199 C 126 196, 146 198, 162 202" stroke={ink} strokeWidth=".5" fill="none" />
        {Array.from({ length: 26 }, (_, i) => {
          const x = 16 + i * 2.6, y = 194 - Math.sin(i / 3) * 3;
          return <path key={i} d={`M${x} ${y + 8} q ${-1 - (i % 3)} -7 ${-2 + (i % 2) * 3} -${10 + (i % 4) * 2}`} stroke={ink} strokeWidth=".55" fill="none" />;
        })}
        {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={15 + i * 5.5} cy={190 - Math.sin(i / 2) * 3} r=".9" fill={ink} />)}
      </g>

      {/* The sails, turning slowly, on top of the tower */}
      <g transform="translate(90 108)">
        <g className="lp-sails">{[18, 108, 198, 288].map(sail)}</g>
        <circle r="3" fill="#d8b98c" stroke={ink} strokeWidth=".9" />
      </g>

      <path d={body} fill={u("sheen")} />
      <path d="M10 205 C 60 203, 120 203, 170 205 V224 H10 Z" fill="#c69d6b" />
      <path d="M10 205 C 60 203, 120 203, 170 205" stroke={ink} strokeWidth=".6" fill="none" />
      <text x="90" y="213" textAnchor="middle" fontSize="5.2" fontWeight="700" letterSpacing="1.3" fill={ink} style={sans}>PROTEIN-BASED DESSERT PREMIX</text>
      <text x="90" y="220" textAnchor="middle" fontSize="4.4" letterSpacing="1.8" fill={ink} style={sans}>SINGLE SERVE</text>

      <path className="lp-torn" d={`M10 24 ${pinkedLtr(21, 24)}`} fill="none" stroke="#f3e6cf" strokeWidth="2" strokeLinejoin="round" />
      <g className="lp-tear">
        <path d={`M10 24 ${pinkedLtr(21, 24)} L170 4 ${pinked(1, 4)} Z`} fill={u("seal")} />
        <path d="M170 15 L162 19 L170 23 Z" fill="#eee3d1" />
        <path d="M20 21 H158" stroke={ink} strokeWidth="0.8" strokeDasharray="3 3" opacity=".4" />
      </g>
    </svg>
  );
}

// Fixed specks on the mug's glaze, so the server and the browser draw the same ones.
const SPECKS = (() => {
  let x = 7;
  const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: 34 }, () => ({ x: 420 + r() * 220, y: 300 + r() * 150, r: 1.1 + r() * 1.8 }));
})();
const CRUMBS = (() => {
  let x = 23;
  const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: 18 }, () => ({ x: 440 + r() * 180, y: 190 + r() * 62, r: 1.4 + r() * 2.4 }));
})();

/** The drawn mug from the first version: cream glaze with brown specks, a darker unglazed foot, a looped handle.
 *  Drawn on the same 1024 x 683 canvas as the photo layers, with its mouth at (530, 263) so the milk stream lands in it.
 *  `top`: "batter" (chocolate batter inside), "rise" (the chocolate top fades in with --rise) or "baked". */
function Mug({ id, top }: { id: string; top: "batter" | "rise" | "baked" }) {
  const u = (n: string) => `url(#${id}-${n})`;
  const dome = "M403 263 C 398 214, 446 166, 530 163 C 614 166, 662 214, 657 263 A127 40 0 0 1 403 263 Z";
  return (
    <svg viewBox="0 0 1024 683" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-glaze`} x1="0" x2="1">
          <stop offset="0" stopColor="#e3d7c7" />
          <stop offset=".3" stopColor="#fbf6ef" />
          <stop offset=".7" stopColor="#efe5d8" />
          <stop offset="1" stopColor="#cdbda9" />
        </linearGradient>
        <radialGradient id={`${id}-batter`} cx="45%" cy="35%" r="75%">
          <stop offset="0" stopColor="#7a4a2c" />
          <stop offset="1" stopColor="#3e2416" />
        </radialGradient>
        <radialGradient id={`${id}-cake`} cx="40%" cy="24%" r="85%">
          <stop offset="0" stopColor="#8a5131" />
          <stop offset=".5" stopColor="#5a321e" />
          <stop offset="1" stopColor="#2e190d" />
        </radialGradient>
        <radialGradient id={`${id}-shadow`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#2b1b12" stopOpacity=".3" />
          <stop offset="1" stopColor="#2b1b12" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="530" cy="484" rx="160" ry="17" fill={u("shadow")} />
      <path d="M639 296 C 726 290, 736 412, 636 418" fill="none" stroke="#d8cab8" strokeWidth="28" strokeLinecap="round" />
      <path d="M641 298 C 718 296, 726 404, 638 410" fill="none" stroke="#f5ede2" strokeWidth="10" strokeLinecap="round" opacity=".75" />
      <path d="M403 263 L657 263 L648 452 Q645 480 616 480 L444 480 Q415 480 412 452 Z" fill={u("glaze")} />
      <g fill="#a38c73" opacity=".55">{SPECKS.map((p, i) => <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.r.toFixed(2)} />)}</g>
      <path d="M411.5 444 L648.5 444 L648 452 Q645 480 616 480 L444 480 Q415 480 412 452 Z" fill="#c4ae93" opacity=".6" />
      <ellipse cx="530" cy="263" rx="127" ry="40" fill="#f7f0e7" stroke="#d6c7b4" strokeWidth="2.5" />
      <ellipse cx="530" cy="265" rx="114" ry="32" fill={u("batter")} />
      {top !== "batter" && (
        <g className={top === "rise" ? "lp-baked" : undefined}>
          <path d={dome} fill={u("cake")} />
          {CRUMBS.map((p, i) => <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.r.toFixed(2)} fill={i % 3 ? "#1f0f07" : "#a0653b"} opacity={i % 3 ? 0.5 : 0.6} />)}
          <path d="M470 212 C 490 220, 508 205, 530 214 M548 199 C 566 208, 584 196, 604 210 M498 238 C 518 245, 536 234, 556 243"
            fill="none" stroke="#1f0f07" strokeWidth="3.5" strokeLinecap="round" opacity=".85" />
          <ellipse cx="482" cy="200" rx="36" ry="10" fill="#fff" opacity=".13" transform="rotate(-12 482 200)" />
          <path d="M574 262 C 574 280, 583 293, 580 310 C 578 322, 566 322, 566 310 C 566 293, 560 280, 560 262 Z" fill="#3e2214" />
        </g>
      )}
      <path d="M403 263 A127 40 0 0 0 657 263" fill="none" stroke="#f7f0e7" strokeWidth="6" />
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
              <Mug id="m-oven" top="rise" />
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
        <Mug id="m-start" top="batter" />
        <Image src={pour} alt="" fill sizes={photo} priority className="lp-jug object-contain" />
      </div>

      {/* Step 4: the finished dessert. */}
      <div className="lp-canvas lp-finalbox">
        <Mug id="m-final" top="baked" />
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
