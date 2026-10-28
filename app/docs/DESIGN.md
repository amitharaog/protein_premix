# Design tokens & UI rules

The survey Amitha already shared uses a palette and type pairing that look good. Carry them over.

## Tokens (`src/app/globals.css`, Tailwind v4 `@theme`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#fbf6f1` | `#1a1310` | page background (cream) |
| `--panel` | `#ffffff` | `#241b17` | cards |
| `--fg` | `#2b1d16` | `#f3e9e1` | text (cocoa) |
| `--muted` | `#7a6558` | `#b9a698` | secondary text |
| `--line` | `#eadfd5` | `#3a2d26` | borders |
| `--accent` | `#8a3f1d` | `#e59a6c` | primary buttons, selected chips |
| `--accent-soft` | `#f3e3d8` | `#3a271d` | chip and bar backgrounds |
| `--ok` | `#2f7a4b` | `#7cc79a` | in stock, claim passes |
| `--warn` | `#a86a00` | `#f0b45a` | variant mismatch, stale |
| `--bad` | `#b3261e` | `#f2948c` | out of stock, dead link |

- **Type**: Fraunces (display, 500/700) and Figtree (body, 400/500/600) via `next/font/google`.
  Use tabular numbers for prices and stats.
- **Radius**: cards 14 px; pills 999 px.
- **Spacing**: 4 px scale; mobile gutter 16 px.
- **Charts** (Recharts):
  - Bars use `--accent`, with a single-hue ramp for ordinal data such as price bands or Q9 1–5.
  - Categorical series use at most 6 colours from a validated palette.
  - Tooltips stay inside the viewport.
  - Every chart has a table fallback.
- **Motion**: 150 ms ease-out; respect `prefers-reduced-motion`.
- **Imagery**:
  - Product shots come later. Until then use simple illustrated mugs (original SVG), never stock photos of other brands.
  - Don't imitate BĀK Goods' or any other brand's packaging.

## Public site feel
Warm, a little playful, honest. One clear CTA per screen. Large tap targets (≥ 44 px). The survey runs one question per screen on mobile.

## Admin feel
Dense, calm and data-first. Tables with sticky headers. Status badges use ok/warn/bad. Keyboard shortcuts: `/` focuses search, `g i` opens ingredients, `g l` opens the lab.
