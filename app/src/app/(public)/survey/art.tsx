// Original illustrations for muggoozz: a mug-cake mascot whose face reacts, a chunky wordmark,
// chocolate doodles, a brownie-tray progress bar and the "goo" drip used on selected answers.
// Inspired by playful doodle packaging in general; deliberately not any other brand's colours or marks.

export type Mood = "neutral" | "happy" | "wow" | "love" | "meh" | "sad" | "wink";

const INK = "#1f0f07";
const CREAM = "#f6ead9";
const CAKE = "#5b2d14";
const CAKE_TOP = "#7a3d1c";
const CHIP = "#e8a15c";

function Face({ mood }: { mood: Mood }) {
  const eye = (cx: number) => {
    switch (mood) {
      case "happy":
      case "love":
        return <path d={`M${cx - 5},62 q5,-6 10,0`} fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />;
      case "wink":
        return cx < 60 ? <path d={`M${cx - 5},61 h10`} stroke={INK} strokeWidth="3.2" strokeLinecap="round" /> : <circle cx={cx} cy="60" r="3.6" fill={INK} />;
      case "wow":
        return <><circle cx={cx} cy="60" r="5.5" fill={INK} /><circle cx={cx + 1.8} cy="58" r="1.6" fill={CREAM} /></>;
      case "meh":
        return <><circle cx={cx} cy="61" r="3.4" fill={INK} /><path d={`M${cx - 6},56 h12`} stroke={INK} strokeWidth="2.6" strokeLinecap="round" /></>;
      case "sad":
        return <><circle cx={cx} cy="61" r="3.4" fill={INK} /><path d={`M${cx - 5},${cx < 60 ? 54 : 56} l10,${cx < 60 ? 2 : -2}`} stroke={INK} strokeWidth="2.6" strokeLinecap="round" /></>;
      default:
        return <><circle cx={cx} cy="60" r="3.8" fill={INK} /><circle cx={cx + 1.3} cy="58.7" r="1.2" fill={CREAM} /></>;
    }
  };
  const mouth = {
    neutral: <path d="M53,71 q7,6 14,0" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />,
    happy: <path d="M50,69 q10,13 20,0 z" fill={INK} />,
    wow: <ellipse cx="60" cy="73" rx="5" ry="6" fill={INK} />,
    love: <><path d="M50,69 q10,13 20,0 z" fill={INK} /><path d="M58,74 q4,8 8,0" fill="#e46f6f" /></>,
    meh: <path d="M53,73 h14" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />,
    sad: <path d="M53,75 q7,-6 14,0" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />,
    wink: <path d="M52,70 q8,9 16,0" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />,
  }[mood];
  return (
    <g>
      {eye(48)}
      {eye(72)}
      {mouth}
      {mood !== "sad" && mood !== "meh" && (
        <>
          <ellipse cx="40" cy="70" rx="5" ry="3" fill="#e9967a" opacity="0.45" />
          <ellipse cx="80" cy="70" rx="5" ry="3" fill="#e9967a" opacity="0.45" />
        </>
      )}
    </g>
  );
}

/** The host: a mug with a domed chocolate cake oozing over the rim. */
export function MugMascot({ mood = "neutral", size = 56, steam = false, className = "" }: { mood?: Mood; size?: number; steam?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label={`Mug cake looking ${mood}`}>
      {steam && (
        <g stroke={CREAM} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55">
          <path className="anim-steam" d="M48,14 q-4,-5 0,-10" />
          <path className="anim-steam" style={{ animationDelay: "1.1s" }} d="M66,14 q-4,-5 0,-10" />
        </g>
      )}
      {/* cake dome */}
      <path d="M22,40 C22,18 98,18 98,40 Z" fill={CAKE_TOP} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M38,27 l5,-3 l3,5 z M62,22 l5,-2 l2,5 z M76,30 l5,-1 l0,5 z" fill={CHIP} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      {/* handle */}
      <path d="M99,52 h6 a12,12 0 0 1 0,26 h-8" fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" />
      <path d="M99,52 h6 a12,12 0 0 1 0,26 h-8" fill="none" stroke={CREAM} strokeWidth="4.5" strokeLinecap="round" />
      {/* mug body */}
      <path d="M20,40 H100 L95,100 Q94,108 86,108 H34 Q26,108 25,100 Z" fill={CREAM} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      {/* the goo: chocolate oozing over the rim */}
      <path d="M20,38 H100 V44 C96,44 96,54 92,54 C88,54 88,44 82,44 C76,44 77,49 73,49 C69,49 70,44 58,44 C52,44 53,57 48,57 C43,57 44,44 36,44 C31,44 31,50 27,50 C23,50 23,44 20,44 Z" fill={CAKE} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <Face mood={mood} />
    </svg>
  );
}

/** Retro sticker wordmark: cream letters, chocolate outline, chunky 3D drop. Drawn as SVG text so the outline renders everywhere. */
export function Wordmark({ height = 56, className = "" }: { height?: number; className?: string }) {
  const text = { x: 200, y: 82, textAnchor: "middle" as const, fontSize: 92, style: { fontFamily: "var(--font-modak)" } };
  return (
    <svg viewBox="0 0 400 112" height={height} className={className} role="img" aria-label="muggoozz">
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
      <path d="M-9,-6 h18" stroke={CAKE_TOP} strokeWidth="3" strokeLinecap="round" />
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
