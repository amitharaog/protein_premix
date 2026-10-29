import { brand } from "@/config/brand";

// Original illustrations for muggoozz in a vintage royal style: a crowned wordmark crest, gold seals,
// checkerboard trim and a molten mug cake with a checkered band. The name, lettering and drawings are our own.

const INK = "#17205a";       // navy line art, matches the royal theme ink
const CREAM = "#f7eedb";
const MUG_SHADE = "#e9dcbd";
const CAKE = "#6b3418";
const CAKE_DARK = "#43200e";
const CAKE_HI = "#94532c";
const CHIP = "#d9a066";
const GOLD = "#c9a23a";
const GOLD_DARK = "#8a6212";

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
      {children}
      <path d={MUG_BODY} fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    </>
  );
}

/** Two rows of checkerboard squares across the mug, inside its tapered sides. */
function MugBand() {
  return (
    <g>
      {Array.from({ length: 22 }, (_, i) => {
        const col = i % 11;
        const row = Math.floor(i / 11);
        return <rect key={i} x={32 + col * 8} y={100 + row * 8} width="8" height="8" fill={(col + row) % 2 ? CREAM : INK} />;
      })}
      <path d="M31,99 H121 M31,117 H120" stroke={GOLD} strokeWidth="2" />
    </g>
  );
}

/** The hero: a molten chocolate mug cake on a checkered mug, with chunks, a gold spoon and curly steam. */
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
        <MugBand />
        {/* lava pouring down the front, over the band */}
        <path d="M34,66 H118 V74 C114,74 114,96 108,96 C102,96 103,74 96,74 C90,74 90,84 85,84 C80,84 81,74 70,74 C64,74 65,104 58,104 C51,104 53,74 46,74 C41,74 41,86 37,86 C33,86 33,74 30,74 Z" fill={CAKE_DARK} />
        <path d="M58,80 v16 M108,80 v8" stroke={CAKE_HI} strokeWidth="2.5" strokeLinecap="round" />
      </MugShell>
      {/* domed cake rising out of the mug */}
      <path d="M26,68 C24,40 54,28 80,28 C106,28 136,40 134,68 Z" fill={CAKE} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M44,46 C56,36 72,34 86,35" fill="none" stroke={CAKE_HI} strokeWidth="4" strokeLinecap="round" />
      <g fill={CAKE_DARK}>
        <circle cx="52" cy="58" r="2" /><circle cx="66" cy="52" r="1.6" /><circle cx="98" cy="56" r="2" /><circle cx="114" cy="60" r="1.6" /><circle cx="80" cy="60" r="1.8" />
      </g>
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

function CrownShape() {
  return (
    <g strokeLinejoin="round">
      <path d="M16,46 L9,14 L32,31 L50,5 L68,31 L91,14 L84,46 Z" fill={GOLD} stroke={INK} strokeWidth="3.5" />
      <path d="M22,40 L18,24 L32,35 L50,16 L68,35 L82,24 L78,40" fill="none" stroke={GOLD_DARK} strokeWidth="1.5" />
      <rect x="15" y="45" width="70" height="13" rx="2.5" fill={GOLD} stroke={INK} strokeWidth="3.5" />
      <circle cx="9" cy="13" r="5" fill={CREAM} stroke={INK} strokeWidth="2.5" />
      <circle cx="50" cy="5" r="5" fill={CREAM} stroke={INK} strokeWidth="2.5" />
      <circle cx="91" cy="13" r="5" fill={CREAM} stroke={INK} strokeWidth="2.5" />
      <circle cx="33" cy="51.5" r="3" fill={INK} />
      <path d="M50,47.5 l4,4 l-4,4 l-4,-4 z" fill="#8c1d2b" stroke={INK} strokeWidth="1.5" />
      <circle cx="67" cy="51.5" r="3" fill={INK} />
    </g>
  );
}

/** A small gold crown. */
export function Crown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 62" className={className} aria-hidden>
      <g transform="translate(0 2)"><CrownShape /></g>
    </svg>
  );
}

const sparkle = (x: number, y: number, s: number, c = GOLD) => (
  <path key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`} d="M0,-10 C1,-2 2,-1 10,0 C2,1 1,2 0,10 C-1,2 -2,1 -10,0 C-2,-1 -1,-2 0,-10 Z" fill={c} />
);

/** The crest: navy italic wordmark with a gold offset print, optionally under a crown flanked by sparkles. */
export function Wordmark({ height = 56, crown = false, className = "" }: { height?: number; crown?: boolean; className?: string }) {
  const lift = crown ? 40 : 0;
  // textLength pins the word to a known width, so the italic and the gold offset always fit inside the canvas.
  const text = {
    x: 220, y: 90 + lift, textAnchor: "middle" as const, fontSize: 104, textLength: 384, lengthAdjust: "spacingAndGlyphs" as const,
    style: { fontFamily: "var(--font-playfair), Georgia, serif", fontStyle: "italic", fontWeight: 900 },
  };
  return (
    <svg viewBox={`0 0 440 ${128 + lift}`} height={height} className={className} role="img" aria-label={brand.name}>
      {crown && (
        <>
          <g transform="translate(176 2) scale(0.88)"><CrownShape /></g>
          {sparkle(146, 34, 1.1)}
          {sparkle(294, 34, 1.1)}
        </>
      )}
      <text {...text} dx="5" dy="6" fill={GOLD}>{brand.name}</text>
      <text {...text} fill={INK}>{brand.name}</text>
    </svg>
  );
}

/** A gold seal with a scalloped edge, like a medal on an old label. */
export function Seal({ lines, rotate = 0, className = "" }: { lines: string[]; rotate?: number; className?: string }) {
  const scallops = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    return <circle key={i} cx={(60 + 47 * Math.cos(a)).toFixed(1)} cy={(60 + 47 * Math.sin(a)).toFixed(1)} r="9" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2" />;
  });
  return (
    <svg viewBox="0 0 120 120" className={className} style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      {scallops}
      <circle cx="60" cy="60" r="47" fill={GOLD} />
      <circle cx="60" cy="60" r="40" fill={CREAM} stroke={INK} strokeWidth="2.5" />
      <circle cx="60" cy="60" r="35" fill="none" stroke={GOLD} strokeWidth="1.5" />
      {lines.map((l, i) => (
        <text key={l} x="60" y={60 + (i - (lines.length - 1) / 2) * 15 + 5} textAnchor="middle" fontSize={Math.max(...lines.map((x) => x.length)) > 10 ? 11.5 : 13} fontWeight="700" fill={INK} style={{ fontFamily: "var(--font-figtree)" }}>
          {l}
        </text>
      ))}
    </svg>
  );
}

/** Gold sparkles and a few chocolate chips around the hero medallion. */
export function Ornaments({ className = "" }: { className?: string }) {
  const chip = (x: number, y: number, r: number) => (
    <path key={`c${x}`} transform={`translate(${x} ${y}) rotate(${r})`} d="M0,-9 C5,-3 8,4 0,7 C-8,4 -5,-3 0,-9 Z" fill={CHIP} stroke={INK} strokeWidth="2" />
  );
  return (
    <svg viewBox="0 0 360 260" className={className} aria-hidden>
      {[sparkle(40, 40, 1), sparkle(318, 92, 0.9), sparkle(60, 150, 0.7), sparkle(300, 206, 0.8), sparkle(126, 236, 0.6), sparkle(244, 22, 0.7)]}
      {[chip(92, 52, 20), chip(270, 58, -30), chip(332, 150, 12), chip(30, 108, -15)]}
    </svg>
  );
}

/** Progress as a row of checkerboard tiles: answered ones are navy with a gold star. */
export function TileTray({ total, answered, current }: { total: number; answered: boolean[]; current: number }) {
  return (
    <div className="flex gap-1 rounded-[6px] border-2 border-line bg-panel p-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={[
            "grid h-4 flex-1 place-items-center rounded-[2px] text-[9px] leading-none transition-colors duration-300",
            answered[i] ? "bg-accent text-gold" : "bg-gold-soft",
            i === current ? "outline-2 outline-offset-1 outline-gold" : "",
          ].join(" ")}
        >
          {answered[i] ? "✦" : ""}
        </span>
      ))}
    </div>
  );
}

/** Checkerboard trim along the top edge of a selected card or the certificate. */
export function CheckerStrip({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`checker pointer-events-none absolute inset-x-0 top-0 h-2 ${className}`} style={{ "--sq": "8px" } as React.CSSProperties} />;
}
