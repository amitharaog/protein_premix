import { brand } from "@/config/brand";

// Original illustrations for the survey in a vintage royal style: a crowned wordmark crest, gold seals,
// checkerboard trim and the host, the Minister of Cravings: a gold spoon with a crown, a monocle and a
// handlebar moustache. The name, lettering and drawings are our own, and nothing here shows the product.

const INK = "#17205a";       // navy line art, matches the royal theme ink
const CREAM = "#f7eedb";
const CHIP = "#d9a066";
const GOLD = "#c9a23a";
const GOLD_LIGHT = "#e3c46a";
const GOLD_DARK = "#8a6212";
const BLUSH = "#e58a7a";

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

/** The host: a gold spoon wearing a crown, a monocle and a handlebar moustache. */
export function Minister({ size = 160, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" className={className} role="img" aria-label="The Minister of Cravings, a gold spoon with a crown and a monocle">
      {/* handle, behind the bowl */}
      <path d="M71,108 L73,148 Q80,158 87,148 L89,108 Z" fill={GOLD} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M77,122 L78,144" stroke={GOLD_LIGHT} strokeWidth="3" strokeLinecap="round" />
      {/* the bowl is the face */}
      <ellipse cx="80" cy="72" rx="42" ry="46" fill={GOLD} stroke={INK} strokeWidth="5" />
      <ellipse cx="80" cy="75" rx="33" ry="37" fill={GOLD_LIGHT} />
      <path d="M52,54 C55,43 64,36 75,34" fill="none" stroke={CREAM} strokeWidth="5" strokeLinecap="round" opacity="0.85" />
      {/* crown, a little tilted */}
      <g transform="translate(56 1) scale(0.48) rotate(-7 50 30)"><CrownShape /></g>
      {/* brows: one raised, very posh */}
      <path d="M54,55 q8,-5 16,0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M86,46 q10,-7 20,-1" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      {/* eyes and the monocle on its chain */}
      <circle cx="62" cy="65" r="4.5" fill={INK} />
      <circle cx="97" cy="64" r="4.5" fill={INK} />
      <circle cx="97" cy="64" r="12" fill={CREAM} fillOpacity="0.35" stroke={INK} strokeWidth="3.5" />
      <path d="M108,70 C117,86 112,102 93,111" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0.1 5" />
      {/* cheeks */}
      <circle cx="50" cy="77" r="6" fill={BLUSH} opacity="0.55" />
      <circle cx="111" cy="78" r="5" fill={BLUSH} opacity="0.55" />
      {/* handlebar moustache and a small smile */}
      <path d="M80,84 C73,78 62,78 56,86 C53,90 47,91 44,87 C45,95 55,98 61,93 C68,88 75,90 80,90 C85,90 92,88 99,93 C105,98 115,95 116,87 C113,91 107,90 104,86 C98,78 87,78 80,84 Z" fill={INK} />
      <path d="M72,99 q8,6 16,0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
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

const BIG_WORD = {
  textAnchor: "middle" as const, fontSize: 108, textLength: 384, lengthAdjust: "spacingAndGlyphs" as const,
  style: { fontFamily: "var(--font-playfair), Georgia, serif", fontStyle: "italic", fontWeight: 900 },
};

/**
 * The crest: "MINISTRY OF" in small caps over a navy italic "Cravings" with a gold offset print, optionally
 * under a crown flanked by sparkles. `compact` draws the big word alone, for the question header.
 */
export function Wordmark({ height = 56, crown = false, compact = false, className = "" }: { height?: number; crown?: boolean; compact?: boolean; className?: string }) {
  // textLength pins each line to a known width, so the italic and the gold offset always fit inside the canvas.
  if (compact) {
    return (
      <svg viewBox="0 0 440 136" height={height} className={className} role="img" aria-label={brand.name}>
        <text {...BIG_WORD} x={220} y={96} dx="5" dy="6" fill={GOLD}>{brand.short}</text>
        <text {...BIG_WORD} x={220} y={96} fill={INK}>{brand.short}</text>
      </svg>
    );
  }
  const lift = crown ? 40 : 0;
  const small = brand.name.slice(0, -brand.short.length).trim().toUpperCase(); // "MINISTRY OF"
  return (
    <svg viewBox={`0 0 440 ${172 + lift}`} height={height} className={className} role="img" aria-label={brand.name}>
      {crown && (
        <>
          <g transform="translate(176 2) scale(0.88)"><CrownShape /></g>
          {sparkle(146, 34, 1.1)}
          {sparkle(294, 34, 1.1)}
        </>
      )}
      <path d={`M40,${30 + lift} H104 M336,${30 + lift} H400`} stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
      <text x={220} y={41 + lift} textAnchor="middle" fontSize={30} textLength={210} lengthAdjust="spacingAndGlyphs" fill={INK}
        style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontWeight: 700 }}>
        {small}
      </text>
      <text {...BIG_WORD} x={220} y={136 + lift} dx="5" dy="6" fill={GOLD}>{brand.short}</text>
      <text {...BIG_WORD} x={220} y={136 + lift} fill={INK}>{brand.short}</text>
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
