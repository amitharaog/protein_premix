import { memo } from "react";
import type { Scene } from "@/lib/launch/timeline";

// The illustrated scene for the launch page: sachet, mug, milk jug, spoon, microwave, risen dessert.
// Drawn once; scroll moves it by rewriting a few attributes (applyScene), so React never re-renders it.
// World units: a 600 x 800 board. The mug is drawn with its bottom centre at (0, 0), its rim at y = -170.

const f = (n: number) => Math.round(n * 100) / 100;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, p: number) =>
  `rgb(${hex(a).map((v, i) => Math.round(lerp(v, hex(b)[i], p))).join(" ")})`;
const POWDER = "#a0714b";
const BATTER = "#4e2c1a";

type Attrs = Record<string, string | number>;

/** Every moving part's attributes for a moment of the story. Used for the first render and for every scroll frame. */
export function partAttrs(s: Scene): Record<string, Attrs> {
  const lv = s.fill / 0.8;
  const dingOn = s.ding > 0;
  return {
    swirl: { opacity: f(s.swirl), transform: `translate(305 498) scale(${f(0.82 + 0.18 * s.swirl)}) translate(-305 -498)` },
    ovenBack: { transform: `translate(0 ${f(s.oven.y)})`, opacity: f(s.oven.o) },
    ovenFront: { transform: `translate(0 ${f(s.oven.y)})`, opacity: f(s.oven.o) },
    door: { transform: `translate(62 0) scale(${f(lerp(0.08, 1, s.door))} 1) translate(-62 0)` },
    glow: { opacity: f(s.light) },
    cavityGlow: { opacity: f(s.light) },
    dispIdle: { opacity: s.cooking || dingOn ? 0 : 1 },
    dispCook: { opacity: s.cooking ? 1 : 0 },
    dispDing: { opacity: dingOn ? 1 : 0 },
    ding: { transform: `translate(300 262) scale(${f(0.6 + 0.4 * s.ding)})`, opacity: f(s.ding) },
    mug: { transform: `translate(${f(s.mug.x)} ${f(s.mug.y)}) scale(${f(s.mug.s)})` },
    content: {
      cy: f(lerp(-151, -165, lv)), rx: f(lerp(78, 88, lv)), ry: f(lerp(10, 13.5, lv)),
      fill: mix(POWDER, BATTER, s.batter), opacity: s.fill > 0.01 ? 1 : 0,
    },
    dome: { transform: `translate(0 -170) scale(1 ${f(Math.max(0.001, s.rise))}) translate(0 170)`, opacity: s.rise > 0 ? 1 : 0 },
    drip: { opacity: f(Math.min(1, Math.max(0, (s.rise - 0.85) / 0.15))) },
    steam: { opacity: f(s.steam) },
    powder: { opacity: f(s.powder) },
    milk: { opacity: f(s.milk) },
    spoon: { transform: `translate(${f(s.spoon.x)} ${f(s.spoon.y)}) rotate(${f(s.spoon.r)})`, opacity: f(s.spoon.o) },
    sachet: { transform: `translate(${f(s.sachet.x)} ${f(s.sachet.y)}) rotate(${f(s.sachet.r)})`, opacity: f(s.sachet.o) },
    tear: { transform: `translate(${f(s.tear.x)} ${f(s.tear.y)}) rotate(${f(s.tear.r)} 84 -106)`, opacity: f(s.tear.o) },
    torn: { opacity: f(s.torn) },
    jug: { transform: `translate(${f(s.jug.x)} ${f(s.jug.y)}) rotate(${f(s.jug.r)})`, opacity: f(s.jug.o) },
    sparkles: { opacity: f(s.sparkle) },
  };
}

/** Flags that switch the little looping animations (bob, falling powder, stir, turntable, steam) on and off. */
export function sceneFlags(s: Scene): Record<string, string> {
  return {
    "data-idle": s.idle ? "1" : "0",
    "data-pour": s.powder > 0 ? "1" : "0",
    "data-milk": s.milk > 0 ? "1" : "0",
    "data-stir": s.spoon.stir ? "1" : "0",
    "data-cook": s.cooking ? "1" : "0",
    "data-steam": s.steam > 0 ? "1" : "0",
    "data-sparkle": s.sparkle > 0 ? "1" : "0",
  };
}

/** Writes a moment of the story into the drawn scene. */
export const viewBoxOf = (s: Scene) => `${f(s.cam.x)} ${f(s.cam.y)} ${f(s.cam.w)} ${f(s.cam.h)}`;

export function applyScene(svg: SVGSVGElement, s: Scene) {
  svg.setAttribute("viewBox", viewBoxOf(s));
  const attrs = partAttrs(s);
  for (const [part, a] of Object.entries(attrs)) {
    const el = svg.querySelector(`[data-part="${part}"]`);
    if (!el) continue;
    for (const [k, v] of Object.entries(a)) el.setAttribute(k, String(v));
  }
  for (const [k, v] of Object.entries(sceneFlags(s))) svg.setAttribute(k, v);
}

// Fixed pseudo-random dots, so the server and the browser draw the same speckles and powder.
function dots(n: number, seed: number) {
  let x = seed;
  const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => [r(), r(), r(), r()] as const);
}
const SPECKS = dots(30, 7).map(([a, b, c]) => ({ x: lerp(-86, 86, a), y: lerp(-158, -34, b), r: lerp(0.8, 2.1, c) }));
const POWDER_BITS = dots(44, 11).map(([a, b, c, d], i) => ({
  x: 297 + lerp(-13, 13, a), r: lerp(1.6, 3.8, b), dur: lerp(0.7, 1.15, c), delay: -lerp(0, 1.1, d),
  fill: ["#8e5e3b", "#a87750", "#6f4529"][i % 3],
}));
const CRUMBS = dots(16, 23).map(([a, b, c]) => ({ x: lerp(-70, 70, a), y: lerp(-236, -186, b), r: lerp(1.2, 3, c) }));

const attrsOf = (all: Record<string, Attrs>, part: string) => ({ "data-part": part, ...all[part] });

export const SceneArt = memo(function SceneArt({ initial, brandTop, brandMain, flavour, kind, svgRef }: {
  initial: Scene; brandTop: string; brandMain: string; flavour: string; kind: string;
  svgRef: React.Ref<SVGSVGElement>;
}) {
  const a = partAttrs(initial);
  const serif = { fontFamily: "var(--font-launch-serif), Georgia, serif" };
  const sans = { fontFamily: "var(--font-figtree), system-ui, sans-serif" };
  return (
    <svg ref={svgRef} viewBox={viewBoxOf(initial)} className="lp-scene h-full w-full" preserveAspectRatio="xMidYMid meet"
      aria-hidden="true" focusable="false" {...sceneFlags(initial)}>
      <defs>
        <radialGradient id="lp-spot" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fbf5ec" />
          <stop offset="1" stopColor="#fbf5ec" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lp-sachet" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#5a341f" />
          <stop offset=".55" stopColor="#3d2416" />
          <stop offset="1" stopColor="#24150d" />
        </linearGradient>
        <linearGradient id="lp-mug" x1="0" x2="1">
          <stop offset="0" stopColor="#e3d7c7" />
          <stop offset=".3" stopColor="#fbf6ef" />
          <stop offset=".7" stopColor="#efe5d8" />
          <stop offset="1" stopColor="#cdbda9" />
        </linearGradient>
        <radialGradient id="lp-inner" cx="50%" cy="20%" r="80%">
          <stop offset="0" stopColor="#4a2e1d" />
          <stop offset="1" stopColor="#1d120b" />
        </radialGradient>
        <radialGradient id="lp-cake" cx="38%" cy="22%" r="85%">
          <stop offset="0" stopColor="#8a5131" />
          <stop offset=".5" stopColor="#5a321e" />
          <stop offset="1" stopColor="#331c10" />
        </radialGradient>
        <radialGradient id="lp-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#2b1b12" stopOpacity=".28" />
          <stop offset="1" stopColor="#2b1b12" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lp-oven" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#efe6da" />
          <stop offset="1" stopColor="#d6c8b6" />
        </linearGradient>
        <radialGradient id="lp-glow" cx="50%" cy="70%" r="55%">
          <stop offset="0" stopColor="#ffcf86" stopOpacity=".95" />
          <stop offset=".55" stopColor="#e9963f" stopOpacity=".5" />
          <stop offset="1" stopColor="#7a3f17" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lp-lamp" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffd796" stopOpacity=".6" />
          <stop offset=".45" stopColor="#ffb860" stopOpacity=".16" />
          <stop offset="1" stopColor="#ffb860" stopOpacity=".05" />
        </linearGradient>
        <linearGradient id="lp-jug" x1="0" x2="1">
          <stop offset="0" stopColor="#f6f1e9" />
          <stop offset=".4" stopColor="#fffdf9" />
          <stop offset="1" stopColor="#ddd3c6" />
        </linearGradient>
        <clipPath id="lp-opening">
          <ellipse cx="0" cy="-169" rx="90" ry="15" />
        </clipPath>
        {/* Things that go into the mug (powder, milk, spoon) vanish behind its front wall. World units. */}
        <clipPath id="lp-intomug">
          <rect x="-200" y="-200" width="1000" height="670" />
          <ellipse cx="300" cy="470" rx="90" ry="15" />
        </clipPath>
      </defs>

      <circle cx="300" cy="440" r="290" fill="url(#lp-spot)" />

      <g {...attrsOf(a, "swirl")}>
        <circle cx="305" cy="498" r="188" fill="#ecd4b3" />
        <circle cx="305" cy="498" r="188" fill="none" stroke="#e2c29a" strokeWidth="10" />
        <path d="M305 340 C 420 340, 470 450, 430 540 C 395 618, 290 640, 228 590 C 170 545, 186 455, 250 430 C 306 408, 362 446, 356 500 C 351 546, 296 560, 270 532"
          fill="none" stroke="#d6a873" strokeWidth="22" strokeLinecap="round" opacity=".75" />
        <path d="M188 410 C 160 470, 170 560, 222 616" fill="none" stroke="#f6e7d2" strokeWidth="9" strokeLinecap="round" opacity=".8" />
        <circle cx="470" cy="360" r="9" fill="#d6a873" />
        <circle cx="140" cy="600" r="6" fill="#d6a873" />
        <circle cx="492" cy="610" r="5" fill="#e2c29a" />
      </g>

      {/* Microwave, back half: body, cavity, light, turntable. */}
      <g {...attrsOf(a, "ovenBack")}>
        <rect x="36" y="296" width="528" height="378" rx="28" fill="url(#lp-oven)" stroke="#cbbba6" strokeWidth="2" />
        <rect x="74" y="672" width="44" height="12" rx="5" fill="#b9a890" />
        <rect x="482" y="672" width="44" height="12" rx="5" fill="#b9a890" />
        <rect x="70" y="328" width="340" height="318" rx="12" fill="#231912" />
        <rect {...attrsOf(a, "cavityGlow")} x="70" y="328" width="340" height="318" rx="12" fill="url(#lp-glow)" />
        <ellipse cx="239" cy="607" rx="126" ry="17" fill="#3a2c22" />
        <ellipse cx="239" cy="604" rx="118" ry="13" fill="#4d3c30" />
      </g>

      {/* The mug. */}
      <g {...attrsOf(a, "mug")}>
        <ellipse cx="0" cy="4" rx="122" ry="14" fill="url(#lp-shadow)" />
        <g className="lp-sway">
          <path d="M86 -146 C 152 -150, 160 -56, 84 -52" fill="none" stroke="#d8cab8" strokeWidth="22" strokeLinecap="round" />
          <path d="M88 -144 C 146 -146, 152 -62, 86 -58" fill="none" stroke="#f5ede2" strokeWidth="8" strokeLinecap="round" opacity=".75" />
          <path d="M-100 -170 L100 -170 L93 -22 Q91 0 68 0 L-68 0 Q-91 0 -93 -22 Z" fill="url(#lp-mug)" />
          <g fill="#a38c73" opacity=".55">
            {SPECKS.map((p, i) => <circle key={i} cx={f(p.x)} cy={f(p.y)} r={f(p.r)} />)}
          </g>
          <path d="M-93.4 -28 L93.4 -28 L93 -22 Q91 0 68 0 L-68 0 Q-91 0 -93 -22 Z" fill="#c4ae93" opacity=".6" />
          <ellipse cx="0" cy="-170" rx="100" ry="20" fill="#f7f0e7" stroke="#d6c7b4" strokeWidth="2" />
          <ellipse cx="0" cy="-169" rx="90" ry="15" fill="url(#lp-inner)" />
          <g clipPath="url(#lp-opening)">
            <ellipse {...attrsOf(a, "content")} cx="0" />
          </g>
          <g {...attrsOf(a, "dome")}>
            <path d="M-97 -170 C -101 -206, -66 -244, 0 -246 C 66 -244, 101 -206, 97 -170 Z" fill="url(#lp-cake)" />
            {CRUMBS.map((p, i) => <circle key={i} cx={f(p.x)} cy={f(p.y)} r={f(p.r)} fill={i % 3 ? "#2c170c" : "#a0653b"} opacity={i % 3 ? 0.45 : 0.6} />)}
            <path d="M-46 -226 C -30 -220, -16 -232, 2 -225" fill="none" stroke="#28140a" strokeWidth="3" strokeLinecap="round" />
            <path d="M16 -236 C 30 -229, 44 -239, 60 -228" fill="none" stroke="#28140a" strokeWidth="3" strokeLinecap="round" />
            <path d="M-14 -204 C 2 -198, 16 -207, 32 -199" fill="none" stroke="#28140a" strokeWidth="2.5" strokeLinecap="round" opacity=".8" />
            <ellipse cx="-36" cy="-231" rx="28" ry="8" fill="#fff" opacity=".13" transform="rotate(-12 -36 -231)" />
          </g>
          <path d="M-100 -170 A100 20 0 0 0 100 -170" fill="none" stroke="#f7f0e7" strokeWidth="5" />
          <path {...attrsOf(a, "drip")} d="M34 -172 C 34 -160, 41 -150, 39 -138 C 38 -129, 29 -129, 29 -138 C 29 -150, 24 -160, 24 -172 Z" fill="#3e2214" />
        </g>
        <g {...attrsOf(a, "steam")} className="lp-steam" fill="none" stroke="#fffaf2" strokeWidth="7" strokeLinecap="round">
          <path d="M-34 -258 C -50 -282, -18 -300, -34 -330" />
          <path d="M4 -262 C -12 -290, 20 -308, 4 -344" />
          <path d="M40 -256 C 26 -280, 56 -298, 40 -326" />
        </g>
      </g>

      {/* Powder, milk and spoon, which disappear into the mug. */}
      <g clipPath="url(#lp-intomug)">
        <g {...attrsOf(a, "powder")}>
          <path d="M288 364 L306 364 L318 474 L282 474 Z" fill="#8e5e3b" opacity=".42" />
          <path d="M293 364 L301 364 L305 474 L289 474 Z" fill="#6f4529" opacity=".35" />
          {POWDER_BITS.map((p, i) => (
            <circle key={i} className="lp-fall" cx={f(p.x)} cy="366" r={f(p.r)} fill={p.fill}
              style={{ "--d": `${f(p.dur)}s`, "--delay": `${f(p.delay)}s` } as React.CSSProperties} />
          ))}
        </g>
        <g {...attrsOf(a, "milk")} fill="none" strokeLinecap="round">
          <path d="M380 336 C 372 352, 336 380, 318 410 C 309 428, 306 448, 306 474" stroke="#e7ddd0" strokeWidth="11" />
          <path className="lp-flow" d="M380 336 C 372 352, 336 380, 318 410 C 309 428, 306 448, 306 474" stroke="#fffdf8" strokeWidth="7" />
        </g>
        <g {...attrsOf(a, "spoon")}>
          <g className="lp-stir">
            <path d="M-3 -168 L4 -168 L5 -26 L-3 -26 Z" fill="#cbc2b6" />
            <path d="M-1 -168 L1.5 -168 L2 -30 L-1 -30 Z" fill="#f2ede6" opacity=".7" />
            <ellipse cx="1" cy="-12" rx="13" ry="19" fill="#d8d0c5" stroke="#b5ab9e" strokeWidth="1.5" />
          </g>
        </g>
      </g>

      {/* Microwave, front half: the door (which swings on its left hinge) and the control panel. */}
      <g {...attrsOf(a, "ovenFront")}>
        <g {...attrsOf(a, "door")}>
          {/* Door frame with the window cut out, so the mug shows through the glass. */}
          <path fillRule="evenodd" fill="#d9ccbb" stroke="#c2b29d" strokeWidth="2"
            d="M78 320 H402 Q418 320 418 336 V638 Q418 654 402 654 H78 Q62 654 62 638 V336 Q62 320 78 320 Z M98 346 H382 Q392 346 392 356 V618 Q392 628 382 628 H98 Q88 628 88 618 V356 Q88 346 98 346 Z" />
          <rect x="88" y="346" width="304" height="282" rx="10" fill="#1e1611" opacity=".32" />
          <g {...attrsOf(a, "glow")}>
            <rect x="88" y="346" width="304" height="282" rx="10" fill="url(#lp-lamp)" />
            <ellipse cx="240" cy="352" rx="70" ry="5" fill="#fff1d2" opacity=".9" />
          </g>
          <path d="M112 346 L176 346 L124 628 L88 628 L88 430 Z" fill="#fff" opacity=".07" />
          <rect x="88" y="346" width="304" height="282" rx="10" fill="none" stroke="#b6a58e" strokeWidth="3" />
          <rect x="398" y="384" width="10" height="206" rx="5" fill="#b6a58e" />
        </g>
        <rect x="430" y="320" width="122" height="334" rx="12" fill="#e5dacb" stroke="#cbbba6" strokeWidth="2" />
        <rect x="444" y="342" width="94" height="44" rx="8" fill="#1b1511" />
        <text {...attrsOf(a, "dispIdle")} x="491" y="371" textAnchor="middle" fontSize="18" fill="#ffb25b" style={sans} letterSpacing="2">– – : – –</text>
        <g {...attrsOf(a, "dispCook")} fill="#ffb25b">
          <circle className="lp-dot" cx="475" cy="364" r="4.5" />
          <circle className="lp-dot" cx="491" cy="364" r="4.5" style={{ animationDelay: ".2s" }} />
          <circle className="lp-dot" cx="507" cy="364" r="4.5" style={{ animationDelay: ".4s" }} />
        </g>
        <text {...attrsOf(a, "dispDing")} x="491" y="372" textAnchor="middle" fontSize="19" fontWeight="700" fill="#ffb25b" style={sans} letterSpacing="3">DING</text>
        <circle cx="491" cy="450" r="29" fill="#d6c9b7" stroke="#bcae99" strokeWidth="2" />
        <path d="M491 430 L491 446" stroke="#6b5a49" strokeWidth="4" strokeLinecap="round" />
        <circle cx="491" cy="530" r="21" fill="#d6c9b7" stroke="#bcae99" strokeWidth="2" />
        <path d="M491 516 L499 526" stroke="#6b5a49" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="451" y="590" width="80" height="32" rx="16" fill="#2b1b12" />
        <text x="491" y="611" textAnchor="middle" fontSize="12" fontWeight="600" fill="#f3ebdf" style={sans} letterSpacing="2">OPEN</text>
      </g>

      <g {...attrsOf(a, "ding")}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <path key={deg} d="M0 -58 L0 -76" stroke="#c68a52" strokeWidth="5" strokeLinecap="round" transform={`rotate(${deg})`} />
        ))}
        <text x="0" y="14" textAnchor="middle" fontSize="44" fontWeight="800" fill="#2a1a11" style={serif}>Ding!</text>
      </g>

      {/* The sachet. Local units: centre at (0, 0), 170 x 232. */}
      <g {...attrsOf(a, "sachet")}>
        <g className="lp-bob">
          <path d="M-84 94 H84 V114 Q84 116 82 116 H-82 Q-84 116 -84 114 Z" fill="#2b190f" />
          <g stroke="#fff" strokeOpacity=".12" strokeWidth="1.5">
            {Array.from({ length: 27 }, (_, i) => <path key={i} d={`M${-78 + i * 6} 98 V112`} />)}
          </g>
          <path d="M-82 -94 C -88 -40, -88 40, -82 94 L 82 94 C 88 40, 88 -40, 82 -94 Z" fill="url(#lp-sachet)" />
          <path d="M-62 -94 C -66 -40, -66 40, -62 94 L -36 94 C -39 40, -39 -40, -36 -94 Z" fill="#fff" opacity=".07" />
          <rect x="-60" y="-66" width="120" height="136" rx="12" fill="#f3e6d3" />
          <path d="M-60 34 C -30 22, 10 44, 60 28 L60 58 Q60 70 48 70 L-48 70 Q-60 70 -60 58 Z" fill="#c68a52" />
          <text x="0" y="-42" textAnchor="middle" fontSize="9.5" letterSpacing="2.4" fill="#5a341f" style={sans}>{brandTop.toUpperCase()}</text>
          <text x="0" y="-20" textAnchor="middle" fontSize="23" fontWeight="800" fill="#2a1a11" style={serif}>{brandMain}</text>
          <path d="M-22 4 Q-24 -14 0 -16 Q24 -14 22 4 Z" fill="#5a321e" />
          <rect x="-24" y="2" width="48" height="16" rx="3" fill="#2a1a11" />
          <text x="0" y="50" textAnchor="middle" fontSize="13" fontWeight="700" letterSpacing="1.5" fill="#fbf5ec" style={serif}>{flavour.toUpperCase()}</text>
          <text x="0" y="63" textAnchor="middle" fontSize="8.5" letterSpacing="1" fill="#fbf5ec" style={sans}>{kind}</text>
          <path {...attrsOf(a, "torn")} d="M-84 -94 L-76 -98 L-68 -94 L-60 -98 L-52 -94 L-44 -98 L-36 -94 L-28 -98 L-20 -94 L-12 -98 L-4 -94 L4 -98 L12 -94 L20 -98 L28 -94 L36 -98 L44 -94 L52 -98 L60 -94 L68 -98 L76 -94 L84 -98" fill="none" stroke="#e8d3b8" strokeWidth="2.5" strokeLinejoin="round" />
          <g {...attrsOf(a, "tear")}>
            <path d="M-84 -114 Q-84 -116 -82 -116 H82 Q84 -116 84 -114 V-98 L76 -94 L68 -98 L60 -94 L52 -98 L44 -94 L36 -98 L28 -94 L20 -98 L12 -94 L4 -98 L-4 -94 L-12 -98 L-20 -94 L-28 -98 L-36 -94 L-44 -98 L-52 -94 L-60 -98 L-68 -94 L-76 -98 L-84 -94 Z" fill="#2b190f" />
            <g stroke="#fff" strokeOpacity=".12" strokeWidth="1.5">
              {Array.from({ length: 27 }, (_, i) => <path key={i} d={`M${-78 + i * 6} -113 V-101`} />)}
            </g>
            <path d="M-84 -100 L-76 -96 L-84 -92 Z" fill="#f3ebdf" />
            <path d="M-72 -96 H80" stroke="#e8d3b8" strokeWidth="1.2" strokeDasharray="4 4" opacity=".7" />
          </g>
        </g>
      </g>

      {/* The milk jug. Local units: centre at (0, 0), spout top left. */}
      <g {...attrsOf(a, "jug")}>
        <path d="M30 -36 C 60 -36, 60 26, 34 26" fill="none" stroke="#e8e0d4" strokeWidth="11" strokeLinecap="round" />
        <path d="M-34 -50 L30 -50 C 32 -20, 40 20, 36 46 Q 34 56 22 56 L -22 56 Q -34 56 -36 46 C -40 20, -32 -20, -34 -50 Z" fill="url(#lp-jug)" stroke="#ddd2c4" strokeWidth="1.5" />
        <path d="M-34 -50 L-48 -58 L-30 -43 Z" fill="#f8f3eb" stroke="#ddd2c4" strokeWidth="1.2" />
        <ellipse cx="-2" cy="-50" rx="33" ry="6" fill="#fffdf9" stroke="#ddd2c4" strokeWidth="1.5" />
        <ellipse cx="-2" cy="-49" rx="27" ry="4" fill="#ffffff" />
        <path d="M-26 -30 C -28 0, -26 24, -24 40" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".7" fill="none" />
      </g>

      <g {...attrsOf(a, "sparkles")} fill="#c68a52">
        {[[176, 420, 1], [430, 392, 0.8], [150, 556, 0.7], [462, 520, 1.1], [300, 318, 0.75]].map(([x, y, k], i) => (
          <path key={i} className="lp-twinkle" style={{ animationDelay: `${i * 0.3}s` }}
            d={`M${x} ${y - 14 * k} C ${x + 2 * k} ${y - 3 * k}, ${x + 3 * k} ${y - 2 * k}, ${x + 14 * k} ${y} C ${x + 3 * k} ${y + 2 * k}, ${x + 2 * k} ${y + 3 * k}, ${x} ${y + 14 * k} C ${x - 2 * k} ${y + 3 * k}, ${x - 3 * k} ${y + 2 * k}, ${x - 14 * k} ${y} C ${x - 3 * k} ${y - 2 * k}, ${x - 2 * k} ${y - 3 * k}, ${x} ${y - 14 * k} Z`} />
        ))}
      </g>
    </svg>
  );
});
