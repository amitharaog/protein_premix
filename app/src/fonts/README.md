# Fonts

The app's fonts, bundled so builds never download them (next/font/local in the three layouts). They are the latin
files Google Fonts serves, variable where the family has a variable version, downloaded 9 Nov 2026.

| File | Family | Used by |
|---|---|---|
| anton.woff2 | Anton | root layout (`--font-anton`) |
| oswald.woff2 | Oswald, 200-700 | root layout (`--font-oswald`) |
| figtree.woff2 | Figtree, 300-900 | root layout (`--font-figtree`), all pages |
| playfair-display.woff2, playfair-display-italic.woff2 | Playfair Display, 400-900 | survey (`--font-playfair`), launch page (`--font-launch-serif`) |
| cinzel.woff2 | Cinzel, 400-900 | survey (`--font-cinzel`) |

All are under the SIL Open Font Licence 1.1; each family's licence is in `OFL-<family>.txt` next to it.
