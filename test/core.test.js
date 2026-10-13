import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  relativeLuminance,
  contrastRatio,
  meetsWCAG,
  evaluateContrast,
  WCAG_LEVELS,
  WCAG_THRESHOLDS,
} from '../src/index.js';

/**
 * Helper: assert two numbers are equal within a tolerance chosen to absorb
 * IEEE-754 rounding error without masking real regressions.
 */
function approxEqual(t, actual, expected, message) {
  const tol = 1e-10;
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${message || ''} expected ${expected}, got ${actual}`,
  );
  t?.snapshot; // no-op for parity with other runners; node:test ignores this
}

test('relativeLuminance of black is 0', () => {
  approxEqual(null, relativeLuminance({ r: 0, g: 0, b: 0 }), 0, 'black luminance');
});

test('relativeLuminance of white is 1', () => {
  approxEqual(null, relativeLuminance({ r: 255, g: 255, b: 255 }), 1, 'white luminance');
});

test('relativeLuminance of {r,g,b} and [r,g,b] are equal', () => {
  const obj = relativeLuminance({ r: 117, g: 117, b: 117 });
  const arr = relativeLuminance([117, 117, 117]);
  approxEqual(null, obj, arr, 'object vs array');
});

test('relativeLuminance clamps out-of-range channels', () => {
  const high = relativeLuminance({ r: 999, g: 999, b: 999 });
  const low = relativeLuminance({ r: -50, g: -50, b: -50 });
  approxEqual(null, high, 1, 'overflow');
  approxEqual(null, low, 0, 'underflow');
});

test('relativeLuminance throws on non-finite channel', () => {
  assert.throws(() => relativeLuminance({ r: NaN, g: 0, b: 0 }), TypeError);
});

test('relativeLuminance throws on missing color', () => {
  assert.throws(() => relativeLuminance(null), TypeError);
  assert.throws(() => relativeLuminance(undefined), TypeError);
});

test('contrastRatio of identical colours is exactly 1', () => {
  // Identical colours share a luminance, so (L+0.05)/(L+0.05) is exactly 1
  // with no floating-point ambiguity.
  assert.equal(contrastRatio({ r: 123, g: 45, b: 67 }, { r: 123, g: 45, b: 67 }), 1);
});

test('contrastRatio of black and white is exactly 21', () => {
  assert.equal(contrastRatio([0, 0, 0], [255, 255, 255]), 21);
});

test('contrastRatio is symmetric in argument order', () => {
  const fg = { r: 19, g: 92, b: 206 };
  const bg = { r: 247, g: 247, b: 247 };
  approxEqual(null, contrastRatio(fg, bg), contrastRatio(bg, fg), 'symmetric');
});

test('meetsWCAG passes white-on-black at both levels', () => {
  assert.equal(meetsWCAG([255, 255, 255], [0, 0, 0], 'AA'), true);
  assert.equal(meetsWCAG([255, 255, 255], [0, 0, 0], 'AAA'), true);
});

test('meetsWCAG fails grey-on-white at AAA but passes at AA', () => {
  const grey = [117, 117, 117];
  const white = [255, 255, 255];
  assert.equal(meetsWCAG(grey, white, 'AA'), true);
  assert.equal(meetsWCAG(grey, white, 'AAA'), false);
});

test('meetsWCAG defaults to AA when level is omitted', () => {
  // #777777 on #fff has a ratio of ~4.48, just under AA's 4.5.
  const justUnder = [119, 119, 119];
  assert.equal(meetsWCAG(justUnder, [255, 255, 255]), false);
});

test('meetsWCAG is case-insensitive', () => {
  const fg = [0, 0, 0];
  const bg = [255, 255, 255];
  assert.equal(meetsWCAG(fg, bg, 'aa'), true);
  assert.equal(meetsWCAG(fg, bg, 'aaa'), true);
});

test('meetsWCAG rejects an unsupported level', () => {
  assert.throws(
    () => meetsWCAG([0, 0, 0], [255, 255, 255], 'XYZ'),
    /Unsupported WCAG level/,
  );
});

test('evaluateContrast returns ratio, level, threshold, and passes', () => {
  const result = evaluateContrast([0, 0, 0], [255, 255, 255], 'AA');
  assert.equal(result.ratio, 21);
  assert.equal(result.level, 'AA');
  assert.equal(result.threshold, WCAG_THRESHOLDS.AA);
  assert.equal(result.passes, true);
});

test('evaluateContrast passes field is consistent with ratio', () => {
  // Ratio just below 4.5 must yield passes=false even though it is close.
  const justUnderGrey = [119, 119, 119]; // ratio ~4.48 on white
  const r = evaluateContrast(justUnderGrey, [255, 255, 255], 'AA');
  assert.equal(r.passes, r.ratio >= WCAG_THRESHOLDS.AA);
  assert.equal(r.passes, false);
});

test('WCAG_LEVELS and WCAG_THRESHOLDS are the expected constants', () => {
  assert.equal(WCAG_LEVELS.AA, 'AA');
  assert.equal(WCAG_LEVELS.AAA, 'AAA');
  assert.equal(WCAG_THRESHOLDS.AA, 4.5);
  assert.equal(WCAG_THRESHOLDS.AAA, 7.0);
});
