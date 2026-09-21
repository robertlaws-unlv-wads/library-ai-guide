#!/usr/bin/env node
// Zero-dependency WCAG contrast checker.
// Usage: node tools/contrast.mjs "#1b1b1b" "#ffffff" [...more pairs]

function srgbToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const fg = args[i];
  const bg = args[i + 1];
  if (!bg) break;
  const r = ratio(fg, bg);
  const pass45 = r >= 4.5 ? 'PASS' : 'FAIL';
  const pass3 = r >= 3 ? 'PASS' : 'FAIL';
  console.log(`${fg} on ${bg}  ${r.toFixed(2)}:1   text(4.5) ${pass45}   ui(3.0) ${pass3}`);
}
