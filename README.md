# contrast_ratio_tools

WCAG AA and AAA contrast checking with ratio results. Pure ESM, zero dependencies.

## Usage

```js
import {
  contrastRatio,
  evaluateContrast,
  meetsWCAG,
  relativeLuminance,
} from './src/index.js';

const fg = { r: 19, g: 92, b: 206 };
const bg = { r: 247, g: 247, b: 247 };

// Just the ratio (a number, 1..21).
const ratio = contrastRatio(fg, bg); // ~8.15

// A pass/fail verdict for a level.
meetsWCAG(fg, bg, 'AA');  // true
meetsWCAG(fg, bg, 'AAA'); // true
meetsWCAG(fg, bg);        // defaults to 'AA'

// A full result object: { ratio, level, threshold, passes }.
const verdict = evaluateContrast(fg, bg, 'AAA');

// Luminance on its own, for colour math of your own.
relativeLuminance([0, 0, 0]); // 0
relativeLuminance({ r: 255, g: 255, b: 255 }); // 1
```

Colours are accepted as `{ r, g, b }` objects or as `[r, g, b]` arrays, with
channels in the 0..255 sRGB range. Out-of-range values are clamped, so callers
may pass computed or rounded values without first coercing them.

## Why this exists

Colour-pickers and design tools usually give you a contrast ratio but rarely
tell you which WCAG level it satisfies or how far you are from the threshold.
This library gives you the raw ratio, a pass/fail verdict against AA or AAA,
and a result object containing all three numbers in one call. The thresholds
are for normal body text: 4.5 for AA, 7.0 for AAA. Large-text and non-text
thresholds are deliberately not included — they add flags without adding
clarity, and they invite callers to pass the wrong flag for their use case.

The ratio is computed per the WCAG 2.1 relative-luminance formula, using the
spec's sRGB transfer function with the 0.03928 threshold. This differs by one
microscopic constant from the IEC 61966-2-1 standard, but for every integer
8-bit channel value the two produce identical results.

## Edge cases you will hit

The spec's threshold of 4.5 is strict. A grey such as `#777777` on white has
a ratio of about 4.48, which is a *fail* for AA even though it looks fine to
most readers. `evaluateContrast` returns the unrounded ratio in its `ratio`
field precisely so the caller can see how close a near-miss is; the `passes`
field is computed from the unrounded ratio, never from a rounded display
value, so it stays consistent.

Identical colours produce a ratio of exactly 1, and pure black-on-white a
ratio of exactly 21. These are the two endpoints and both are exact.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

