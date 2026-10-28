// Original illustrations for muggoozz: a line-art molten mug cake, a chunky wordmark, chocolate doodles,
// a brownie-tray progress bar and the "goo" drip used on selected answers. Style follows playful
// doodle packaging; the name, lettering and drawings are our own.

const INK = "#2a1a3f";       // line art: purple-black, sits well on lavender
const CREAM = "#fff6ea";
const MUG_SHADE = "#ece2f6";
const CAKE = "#6b3418";
const CAKE_DARK = "#43200e";
const CAKE_HI = "#94532c";
const CHIP = "#d9a066";
const GOLD = "#e0b24f";

// Mug outline shared by the hero and the scale icons (viewBox 0 0 160 160).
const MUG_BODY = "M28,66 H124 L119,134 Q117,146 104,146 H48 Q35,146 33,134 Z";
const MUG_INSIDE = "M30,66 H122 L118,128 Q116,138 104,138 H48 Q36,138 34,128 Z";

function Handle() {
  return (
    <>
      <path d="M121,80 h8 a18,18 0 0 1 0,36 h-11" fill="none" stroke={INK} strokeWidth="14" strokeLinecap="round" />
      <path d="M121,80 h8 a18,18 0 0 1 0,36 h-11" fill="none" stroke={CREAM} strokeWidth="6" strokeLinecap="round" />
    </>
  );
}

function MugShell({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <Handle />
      <path d={MUG_BODY} fill={CREAM} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M104,72 L100,134 Q99,140 92,140 H104 Q114,140 115,132 L119,72 Z" fill={MUG_SHADE} />
      {/* a simple hand-drawn band, so it reads as a real mug */}
      <path d="M38,108 q9,-7 18,0 t18,0 t18,0 t18,0 t12,0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      {children}
      <path d={MUG_BODY} fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    </>
  );
}

/** The hero: a molten chocolate mug cake with chunks, a spoon and curly steam. Original line art. */
export function MugCake({ size = 160, steam = false, className = "" }: { size?: number; steam?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" className={className} role="img" aria-label="A chocolate mug cake">
      {steam && (
        <g fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round">
          <path className="anim-steam" d="M58,20 c-6,-6 6,-10 0,-16" />
          <path className="anim-steam" style={{ animationDelay: "0.9s" }} d="M80,16 c-6,-6 6,-10 0,-16" />
          <path className="anim-steam" style={{ animationDelay: "1.8s" }} d="M102,20 c-6,-6 6,-10 0,-16" />
        </g>
      )}
      {/* spoon, behind the cake */}
      <path d="M104,52 L138,14" stroke={INK} strokeWidth="11" strokeLinecap="round" />
      <path d="M104,52 L138,14" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
      <MugShell>
        {/* lava pouring down the front */}
        <path d="M34,66 H118 V74 C114,74 114,96 108,96 C102,96 103,74 96,74 C90,74 90,84 85,84 C80,84 81,74 70,74 C64,74 65,104 58,104 C51,104 53,74 46,74 C41,74 41,86 37,86 C33,86 33,74 30,74 Z" fill={CAKE_DARK} />
        <path d="M58,80 v16 M108,80 v8" stroke={CAKE_HI} strokeWidth="2.5" strokeLinecap="round" />
      </MugShell>
      {/* domed cake rising out of the mug */}
      <path d="M26,68 C24,40 54,28 80,28 C106,28 136,40 134,68 Z" fill={CAKE} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M44,46 C56,36 72,34 86,35" fill="none" stroke={CAKE_HI} strokeWidth="4" strokeLinecap="round" />
      {/* crumb texture */}
      <g fill={CAKE_DARK}>
        <circle cx="52" cy="58" r="2" /><circle cx="66" cy="52" r="1.6" /><circle cx="98" cy="56" r="2" /><circle cx="114" cy="60" r="1.6" /><circle cx="80" cy="60" r="1.8" />
      </g>
      {/* chunks and chips */}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M60,30 l14,-6 l6,12 l-14,6 z" fill={CAKE_DARK} />
        <path d="M60,30 l14,-6 l2,4 l-14,6 z" fill={CAKE_HI} />
        <path d="M96,36 l12,2 l-2,12 l-12,-2 z" fill={CAKE_DARK} />
        <path d="M40,52 c3,-6 9,-6 10,0 c-3,4 -7,4 -10,0 z" fill={CHIP} />
        <path d="M84,44 c3,-6 9,-6 10,0 c-3,4 -7,4 -10,0 z" fill={CHIP} />
        <path d="M112,50 c3,-6 9,-6 10,0 c-3,4 -7,4 -10,0 z" fill={CHIP} />
      </g>
    </svg>
  );
}

/** Scale icon: the more likely, the fuller the mug (1 = crumbs, 5 = overflowing). */
export function MugLevel({ level, size = 44, className = "" }: { level: number; size?: number; className?: string }) {
  const top = [0, 128, 112, 92, 72, 66][level] ?? 128;
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" className={className} aria-hidden>
      <MugShell>
        <clipPath id={`lvl-${level}`}><path d={MUG_INSIDE} /></clipPath>
        <rect x="28" y={top} width="96" height={150 - top} fill={CAKE} clipPath={`url(#lvl-${level})`} />
        {level === 1 && <g fill={CAKE}><circle cx="62" cy="130" r="4" /><circle cx="80" cy="133" r="3" /><circle cx="96" cy="129" r="4" /></g>}
      </MugShell>
      {level >= 4 && <path d={`M26,68 C24,${level === 5 ? 34 : 52} 54,${level === 5 ? 24 : 44} 80,${level === 5 ? 24 : 44} C106,${level === 5 ? 24 : 44} 136,${level === 5 ? 34 : 52} 134,68 Z`} fill={CAKE} stroke={INK} strokeWidth="5" strokeLinejoin="round" />}
      {level === 5 && <path d="M34,66 H118 V74 C114,74 114,96 108,96 C102,96 103,74 96,74 C90,74 90,84 85,84 C80,84 81,74 70,74 C64,74 65,104 58,104 C51,104 53,74 46,74 C41,74 41,86 37,86 C33,86 33,74 30,74 Z" fill={CAKE_DARK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />}
    </svg>
  );
}

/** Retro sticker wordmark: cream letters, chocolate outline, chunky 3D drop. Drawn as SVG text so the outline renders everywhere. */
export function Wordmark({ height = 56, className = "" }: { height?: number; className?: string }) {
  // textLength pins the word to a known width, so the outline and 3D drop always fit inside the canvas.
  const text = { x: 220, y: 92, textAnchor: "middle" as const, fontSize: 92, textLength: 392, lengthAdjust: "spacingAndGlyphs" as const, style: { fontFamily: "var(--font-modak)" } };
  return (
    <svg viewBox="0 0 440 128" height={height} className={className} role="img" aria-label="muggoozz">
      <text {...text} dx="3" dy="7" fill="#2b140a" stroke="#2b140a" strokeWidth="10" strokeLinejoin="round">muggoozz</text>
      <text {...text} fill="#fff6ea" stroke="#3b1d0e" strokeWidth="9" strokeLinejoin="round" paintOrder="stroke">muggoozz</text>
    </svg>
  );
}

/** Chocolate poured over the top edge of the page. */
export function TopDrip({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 46" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M0,0 H400 V18 C390,18 392,40 380,40 C368,40 372,20 352,20 C338,20 342,32 330,32 C318,32 322,18 300,18 C286,18 290,44 274,44 C258,44 264,20 240,20 C226,20 230,30 218,30 C206,30 210,18 186,18 C172,18 176,38 160,38 C144,38 150,20 128,20 C114,20 118,28 106,28 C94,28 98,18 76,18 C62,18 66,42 50,42 C34,42 40,20 20,20 C10,20 8,26 0,26 Z" fill="#5b2d14" />
      <path d="M14,8 h40 M120,9 h28 M250,8 h52 M340,9 h24" stroke="#8a4a26" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Cream starburst badge with purple text, like a sticker on the pack. */
export function Starburst({ lines, rotate = 0, className = "" }: { lines: string[]; rotate?: number; className?: string }) {
  const pts = Array.from({ length: 28 }, (_, i) => {
    const r = i % 2 ? 44 : 52;
    const a = (i / 28) * Math.PI * 2;
    return `${(55 + r * Math.cos(a)).toFixed(1)},${(55 + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 110 110" className={className} style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      <polygon points={pts} fill="#fff6ea" stroke="#2b2170" strokeWidth="2.5" strokeLinejoin="round" />
      {lines.map((l, i) => (
        <text key={l} x="55" y={55 + (i - (lines.length - 1) / 2) * 15 + 5} textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#2b2170" style={{ fontFamily: "var(--font-figtree)" }}>
          {l}
        </text>
      ))}
    </svg>
  );
}

/** Scattered chocolate chunks, chips, swirls and sparkles around the hero mascot. */
export function Doodles({ className = "" }: { className?: string }) {
  const chunk = (x: number, y: number, r: number, s = 1) => (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <rect x="-14" y="-11" width="28" height="22" rx="4" fill={CAKE} stroke={INK} strokeWidth="2.5" />
      <path d="M-9,-6 h18" stroke={CAKE_HI} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
  const chip = (x: number, y: number, r: number) => (
    <path transform={`translate(${x} ${y}) rotate(${r})`} d="M0,-9 C5,-3 8,4 0,7 C-8,4 -5,-3 0,-9 Z" fill={CHIP} stroke={INK} strokeWidth="2" />
  );
  const sparkle = (x: number, y: number, s: number, c: string) => (
    <path transform={`translate(${x} ${y}) scale(${s})`} d="M0,-10 C1,-2 2,-1 10,0 C2,1 1,2 0,10 C-1,2 -2,1 -10,0 C-2,-1 -1,-2 0,-10 Z" fill={c} />
  );
  return (
    <svg viewBox="0 0 360 260" className={className} aria-hidden>
      <g fill="none" stroke="#5b2d14" strokeWidth="3.5" strokeLinecap="round" opacity="0.8">
        <path d="M30,70 c10,-14 26,-6 18,6 c-6,9 -18,2 -10,-6" />
        <path d="M318,190 c-10,14 -26,6 -18,-6 c6,-9 18,-2 10,6" />
        <path d="M300,48 q12,8 4,18" />
        <path d="M58,206 q-10,-10 -2,-20" />
      </g>
      {chunk(62, 128, -14)}
      {chunk(300, 112, 18, 0.9)}
      {chunk(36, 196, 10, 0.7)}
      {chip(96, 48, 20)}
      {chip(276, 64, -30)}
      {chip(318, 150, 12)}
      {chip(84, 236, -15)}
      {chip(262, 232, 30)}
      {sparkle(250, 26, 1, "#fff6ea")}
      {sparkle(124, 222, 0.8, "#fff6ea")}
      {sparkle(28, 30, 0.7, "#5b2d14")}
      {sparkle(338, 236, 0.7, "#fff6ea")}
    </svg>
  );
}

/** Progress as a tray of brownie squares: answered ones are baked and frosted. */
export function BrownieTray({ total, answered, current }: { total: number; answered: boolean[]; current: number }) {
  return (
    <div className="flex gap-1 rounded-md border-2 border-milk bg-[#0d0704] p-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={[
            "relative h-4 flex-1 rounded-[3px] transition-colors duration-300",
            answered[i] ? "bg-[#4a2a18]" : "bg-[#1c110b]",
            i === current ? "outline-2 outline-accent" : "",
          ].join(" ")}
        >
          {answered[i] && <span className="absolute inset-x-0.5 top-0 h-1.5 rounded-b-full bg-frost" />}
        </span>
      ))}
    </div>
  );
}

/** Chocolate goo strip for the top edge of a selected card. */
export function Drip({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 14" preserveAspectRatio="none" className={`pointer-events-none absolute inset-x-0 -top-px h-3 w-full ${className}`} aria-hidden>
      <path
        d="M0,0 H120 V4 C116,4 115,12 111,12 C107,12 108,4 102,4 C96,4 97,9 93,9 C89,9 90,4 82,4 C76,4 77,13 72,13 C67,13 68,4 60,4 C54,4 55,8 51,8 C47,8 48,4 40,4 C34,4 35,12 30,12 C25,12 26,4 18,4 C13,4 14,9 10,9 C6,9 6,4 0,4 Z"
        fill="#6b3418"
      />
    </svg>
  );
}
