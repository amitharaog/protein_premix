// Original SVG artwork for the survey: a chocolate hourglass poster, a mini hourglass progress,
// a brownie-tray progress bar and a frosting drip edge. No third-party brand imagery.

const HOURGLASS =
  "M24,0 H376 C376,170 236,250 222,330 C236,410 376,470 376,600 H24 C24,470 164,410 178,330 C164,250 24,170 24,0 Z";

// Teardrop pointing up, centred on 0,0. Scaled/rotated per instance.
const DROP = "M0,-42 C20,-14 30,6 0,30 C-30,6 -20,-14 0,-42 Z";
// A paisley-ish frosting curl.
const CURL = "M0,0 C30,-40 90,-30 80,10 C72,40 30,40 34,16 C38,0 58,4 56,14";

type Blob = { x: number; y: number; s: number; r: number; kind: "drop" | "dot" | "curl" | "chunk" };

const TOP: Blob[] = [
  { x: 60, y: 30, s: 1.4, r: -30, kind: "drop" }, { x: 130, y: 70, s: 1.1, r: 20, kind: "drop" },
  { x: 210, y: 30, s: 1.6, r: 160, kind: "drop" }, { x: 300, y: 50, s: 1.3, r: -150, kind: "drop" },
  { x: 350, y: 120, s: 1.0, r: 40, kind: "drop" }, { x: 90, y: 140, s: 1.2, r: 200, kind: "drop" },
  { x: 250, y: 140, s: 1.0, r: -20, kind: "drop" }, { x: 170, y: 150, s: 0.9, r: 120, kind: "drop" },
  { x: 120, y: 205, s: 0.8, r: 30, kind: "drop" }, { x: 280, y: 200, s: 0.8, r: -40, kind: "drop" },
  { x: 200, y: 230, s: 0.7, r: 180, kind: "drop" },
  { x: 30, y: 95, s: 0, r: 0, kind: "dot" }, { x: 335, y: 10, s: 0, r: 0, kind: "dot" }, { x: 190, y: 95, s: 0, r: 0, kind: "dot" },
  { x: 40, y: 0, s: 1, r: 10, kind: "curl" }, { x: 230, y: 75, s: 0.9, r: -25, kind: "curl" }, { x: 150, y: 190, s: 0.6, r: 15, kind: "curl" },
  { x: 165, y: 55, s: 1, r: 12, kind: "chunk" }, { x: 315, y: 160, s: 0.8, r: -18, kind: "chunk" }, { x: 70, y: 70, s: 0.7, r: 25, kind: "chunk" },
  { x: 235, y: 255, s: 0.55, r: -10, kind: "chunk" },
];

function BlobShape({ b }: { b: Blob }) {
  const t = `translate(${b.x} ${b.y}) rotate(${b.r}) scale(${b.s || 1})`;
  if (b.kind === "dot") return <circle cx={b.x} cy={b.y} r={22} fill="var(--frost)" filter="url(#speckle)" />;
  if (b.kind === "curl") return <path d={CURL} transform={t} fill="none" stroke="var(--frost)" strokeWidth={14} strokeLinecap="round" filter="url(#speckle)" />;
  if (b.kind === "chunk")
    return (
      <g transform={t}>
        <rect x={-22} y={-18} width={44} height={36} rx={7} fill="#3d2214" />
        <rect x={-22} y={-18} width={44} height={11} rx={5} fill="#5a3320" />
        <circle cx={-8} cy={4} r={2.5} fill="#2a160c" /><circle cx={9} cy={8} r={2} fill="#2a160c" />
      </g>
    );
  return <path d={DROP} transform={t} fill="var(--frost)" filter="url(#speckle)" />;
}

/** The poster: milk-chocolate frame, dark-chocolate hourglass, frosting pouring through the neck. */
export function PosterArt() {
  return (
    <svg viewBox="0 0 400 600" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <clipPath id="glass"><path d={HOURGLASS} /></clipPath>
        <filter id="speckle" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="7" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 -2.2 1.25" result="dots" />
          <feComposite in="dots" in2="SourceGraphic" operator="in" result="speck" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="speck" /></feMerge>
        </filter>
        <linearGradient id="frame" x1="0" x2="1">
          <stop offset="0" stopColor="#7f4a2b" /><stop offset="0.5" stopColor="var(--milk)" /><stop offset="1" stopColor="#7f4a2b" />
        </linearGradient>
      </defs>
      <rect width="400" height="600" fill="url(#frame)" />
      {/* side notches, like the poster's frame */}
      <circle cx="0" cy="330" r="16" fill="var(--bg)" /><circle cx="400" cy="330" r="16" fill="var(--bg)" />
      <path d={HOURGLASS} fill="var(--bg)" />
      <g clipPath="url(#glass)">
        {TOP.map((b, i) => <BlobShape key={i} b={b} />)}
        {/* the pour through the neck */}
        <path d={DROP} transform="translate(200 300) rotate(180) scale(0.6)" fill="var(--frost)" filter="url(#speckle)" />
        <path d={DROP} transform="translate(204 340) rotate(170) scale(0.42)" fill="var(--frost)" filter="url(#speckle)" />
        <g className="anim-drip"><path d={DROP} transform="translate(198 372) rotate(185) scale(0.3)" fill="var(--frost)" /></g>
        <g className="anim-drip" style={{ animationDelay: "1.3s" }}><path d={DROP} transform="translate(206 392) rotate(175) scale(0.22)" fill="var(--frost)" /></g>
        {/* a brownie slab settling at the bottom of the glass */}
        <path d="M24,600 C70,560 140,548 200,548 C260,548 330,560 376,600 Z" fill="#2c180e" />
        <path d="M60,578 C110,560 160,556 200,556 C240,556 290,560 340,578" fill="none" stroke="var(--frost)" strokeWidth="7" strokeLinecap="round" opacity="0.9" />
      </g>
    </svg>
  );
}

/** Mini hourglass: frosting drains from the top bulb into the bottom as questions get answered. */
export function HourglassProgress({ fraction }: { fraction: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <svg width="40" height="56" viewBox="0 0 40 56" role="img" aria-label={`${Math.round(f * 100)}% done`}>
      <defs>
        <clipPath id="mini-glass"><path d="M4,3 H36 C36,18 23,23 21,28 C23,33 36,38 36,53 H4 C4,38 17,33 19,28 C17,23 4,18 4,3 Z" /></clipPath>
      </defs>
      <g clipPath="url(#mini-glass)">
        <rect x="0" y={3 + 25 * f} width="40" height={25 * (1 - f)} fill="var(--frost)" style={{ transition: "all 300ms ease-out" }} />
        <rect x="0" y={53 - 25 * f} width="40" height={25 * f} fill="var(--accent)" style={{ transition: "all 300ms ease-out" }} />
        {f > 0 && f < 1 && <rect x="19" y="26" width="2" height="27" fill="var(--frost)" opacity="0.8" />}
      </g>
      <path d="M4,3 H36 C36,18 23,23 21,28 C23,33 36,38 36,53 H4 C4,38 17,33 19,28 C17,23 4,18 4,3 Z" fill="none" stroke="var(--milk)" strokeWidth="2.5" />
      <path d="M1,2 H39 M1,54 H39" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
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

/** Frosting drip strip for the top edge of a card. */
export function Drip({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 14" preserveAspectRatio="none" className={`pointer-events-none absolute inset-x-0 -top-px h-3 w-full ${className}`} aria-hidden>
      <path
        d="M0,0 H120 V4 C116,4 115,12 111,12 C107,12 108,4 102,4 C96,4 97,9 93,9 C89,9 90,4 82,4 C76,4 77,13 72,13 C67,13 68,4 60,4 C54,4 55,8 51,8 C47,8 48,4 40,4 C34,4 35,12 30,12 C25,12 26,4 18,4 C13,4 14,9 10,9 C6,9 6,4 0,4 Z"
        fill="var(--frost)"
      />
    </svg>
  );
}
