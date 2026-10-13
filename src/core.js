/**
 * WCAG relative luminance and contrast ratio calculations.
 *
 * The linear-channel transform follows the WCAG 2.x formula in
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance. WCAG defines an
 * sRGB transfer function with a single threshold at 0.03928 (the value of
 * 0.04045 / 12.92), which differs slightly from the IEC 61966-2-1 standard
 * that uses 0.04045. The two give identical bit-rounded 8-bit results for
 * every integer channel value 0..255, so this implementation uses the WCAG
 * value to match the spec literally.
 */

/**
 * Normalised sRGB channel in [0, 1]. Out-of-range values are clamped so a
 * caller cannot produce a misleadingly large luminance from, say, 300.
 */
function normalizeChannel(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Channel value must be a finite number, got ${value}`);
  }
  if (value < 0) return 0;
  if (value > 255) return 1;
  return value / 255;
}

/**
 * Apply the WCAG sRGB-to-linear transfer function to a normalised channel.
 */
function linearChannel(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Compute the WCAG relative luminance of an sRGB colour.
 *
 * Accepts the colour as `{r, g, b}` or as `[r, g, b]`; each channel is an
 * integer 0..255. Fractional and out-of-range values are clamped, which lets
 * callers pass computed values without first rounding.
 */
export function relativeLuminance(color) {
  if (color == null) {
    throw new TypeError('color is required');
  }
  let r, g, b;
  if (Array.isArray(color)) {
    if (color.length < 3) {
      throw new TypeError('Array color must have at least 3 elements [r, g, b]');
    }
    [r, g, b] = color;
  } else {
    ({ r, g, b } = color);
  }
  if (
    typeof r !== 'number' ||
    typeof g !== 'number' ||
    typeof b !== 'number' ||
    !Number.isFinite(r) ||
    !Number.isFinite(g) ||
    !Number.isFinite(b)
  ) {
    throw new TypeError('r, g, b must be finite numbers');
  }
  const rl = linearChannel(normalizeChannel(r));
  const gl = linearChannel(normalizeChannel(g));
  const bl = linearChannel(normalizeChannel(b));
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/**
 * Contrast ratio between two sRGB colours, always in [1, 21]. The order of
 * the arguments does not matter: the lighter luminance is used as the
 * numerator.
 */
export function contrastRatio(foreground, background) {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG conformance levels.
 */
export const WCAG_LEVELS = Object.freeze({
  AA: 'AA',
  AAA: 'AAA',
});

/**
 * Required contrast ratios. The ratio is for normal text in each level.
 */
export const WCAG_THRESHOLDS = Object.freeze({
  AA: 4.5,
  AAA: 7.0,
});

/**
 * Test whether two colours meet the requested WCAG level for normal text.
 * `level` is case-insensitive and accepts either 'AA' or 'AAA'.
 */
export function meetsWCAG(foreground, background, level = WCAG_LEVELS.AA) {
  if (typeof level !== 'string') {
    throw new TypeError('level must be a string ("AA" or "AAA")');
  }
  const key = level.toUpperCase();
  if (key !== 'AA' && key !== 'AAA') {
    throw new TypeError(`Unsupported WCAG level "${level}", use "AA" or "AAA"`);
  }
  const ratio = contrastRatio(foreground, background);
  return ratio >= WCAG_THRESHOLDS[key];
}

/**
 * A full evaluation result. `ratio` is the unrounded value; `passes` reflects
 * the same comparison used by `meetsWCAG`, so it is always consistent with
 * `ratio` even when `ratio` is just below the threshold.
 */
export function evaluateContrast(foreground, background, level = WCAG_LEVELS.AA) {
  const ratio = contrastRatio(foreground, background);
  if (typeof level !== 'string') {
    throw new TypeError('level must be a string ("AA" or "AAA")');
  }
  const key = level.toUpperCase();
  if (key !== 'AA' && key !== 'AAA') {
    throw new TypeError(`Unsupported WCAG level "${level}", use "AA" or "AAA"`);
  }
  return {
    ratio,
    level: key,
    threshold: WCAG_THRESHOLDS[key],
    passes: ratio >= WCAG_THRESHOLDS[key],
  };
}
