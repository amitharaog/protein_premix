/** Progress as batter rising in a mug; it domes and steams when the survey is done. Original SVG. */
export function MugProgress({ fraction, done }: { fraction: number; done: boolean }) {
  const top = 26;
  const bottom = 92;
  const level = bottom - Math.max(0, Math.min(1, fraction)) * (bottom - top);
  return (
    <svg width="56" height="56" viewBox="0 0 110 110" role="img" aria-label={`${Math.round(fraction * 100)}% done`}>
      <defs>
        <clipPath id="mug-inside">
          <path d="M22 24 h56 v58 a10 10 0 0 1 -10 10 h-36 a10 10 0 0 1 -10 -10 z" />
        </clipPath>
        <linearGradient id="batter" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#a0522d" />
          <stop offset="1" stopColor="#5c2c14" />
        </linearGradient>
      </defs>
      {done && (
        <g stroke="var(--muted)" strokeWidth="3" strokeLinecap="round" fill="none">
          <path className="anim-steam" d="M38 14 q-4 -5 0 -10" />
          <path className="anim-steam" style={{ animationDelay: "0.8s" }} d="M52 14 q-4 -5 0 -10" />
          <path className="anim-steam" style={{ animationDelay: "1.6s" }} d="M66 14 q-4 -5 0 -10" />
        </g>
      )}
      <g clipPath="url(#mug-inside)">
        <rect x="18" y={level} width="64" height={bottom - level + 2} fill="url(#batter)" style={{ transition: "y 300ms ease-out, height 300ms ease-out" }} />
      </g>
      {done && <path d="M22 26 q28 -22 56 0 z" fill="url(#batter)" />}
      <path d="M22 24 h56 v58 a10 10 0 0 1 -10 10 h-36 a10 10 0 0 1 -10 -10 z" fill="none" stroke="var(--fg)" strokeWidth="5" strokeLinejoin="round" />
      <path d="M78 38 h8 a12 12 0 0 1 0 24 h-8" fill="none" stroke="var(--fg)" strokeWidth="5" />
    </svg>
  );
}
