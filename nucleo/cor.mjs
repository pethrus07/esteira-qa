/* COR — a matemática que contraste e fidelidade de marca compartilham
   ─────────────────────────────────────────────────────────────────
   Duas perguntas diferentes, mesma base (sRGB → luminância / Lab):

   · CONTRASTE (WCAG 2.x, SC 1.4.3): razão de luminância relativa. Norma
     publicada, limites 4,5:1 texto normal e 3:1 texto grande. Os scripts
     antigos usavam 2,2 · 3 · 4,5 para a mesma pergunta — aqui só a norma.

   · FIDELIDADE À MARCA (CIEDE2000, ΔE00): distância perceptual entre a cor
     usada e a cor do guia. ΔE00 < 1 imperceptível; ~2 "só notável"; a ISO
     12647-2 (2013) adotou ΔE00 como métrica de tolerância em impressão.

   Fórmula de cor escrita à mão é instrumento — e instrumento se valida
   antes de usar: testes/cor.test.mjs confere contra os pares publicados de
   Sharma, Wu & Dalal (2005) e contra o scikit-image, independentemente.
*/

export function hexParaRgb(h) {
  let s = String(h).trim().replace(/^#/, "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(s)) return null;
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}

/** "rgb(1, 2, 3)" / "rgba(1,2,3,0.5)" → {rgb:[r,g,b], a} */
export function cssParaRgba(c) {
  const m = String(c).match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/);
  if (!m) return null;
  let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4];
  return { rgb: [+m[1], +m[2], +m[3]], a };
}

export const rgbParaHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

const linear = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };

/** Luminância relativa WCAG. (O limiar 0,03928 da WCAG 2.0 e o 0,04045 do
    sRGB diferem só abaixo de 1/255 — sem efeito em cor de 8 bits.) */
export function luminancia(rgb) {
  const [r, g, b] = rgb.map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(rgb1, rgb2) {
  const [a, b] = [luminancia(rgb1), luminancia(rgb2)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

/** Compõe cor semitransparente sobre um fundo opaco. */
export function compor({ rgb, a }, fundo) {
  return rgb.map((v, i) => v * a + fundo[i] * (1 - a));
}

/** sRGB (D65) → CIELAB */
export function rgbParaLab(rgb) {
  const [r, g, b] = rgb.map(linear);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / 1.0;
  const z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIEDE2000 (Sharma, Wu & Dalal 2005), kL=kC=kH=1. */
export function deltaE00([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (b, a) => { if (a === 0 && b === 0) return 0; const v = Math.atan2(b, a) * deg; return v < 0 ? v + 360 : v; };
  const h1p = h(b1, a1p), h2p = h(b2, a2p);
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lpm = (L1 + L2) / 2, Cpm = (C1p + C2p) / 2;
  let hpm = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hpm += h1p + h2p < 360 ? 360 : -360;
    hpm /= 2;
  }
  const T = 1 - 0.17 * Math.cos((hpm - 30) * rad) + 0.24 * Math.cos(2 * hpm * rad)
          + 0.32 * Math.cos((3 * hpm + 6) * rad) - 0.20 * Math.cos((4 * hpm - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hpm - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lpm - 50) ** 2) / Math.sqrt(20 + (Lpm - 50) ** 2);
  const SC = 1 + 0.045 * Cpm, SH = 1 + 0.015 * Cpm * T;
  const RT = -Math.sin(2 * dTheta * rad) * RC;
  return Math.sqrt((dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH));
}

/** Croma (C*ab) — 0 é cinza. Serve à regra "P&B estrito" do Desbravando. */
export const croma = (rgb) => { const [, a, b] = rgbParaLab(rgb); return Math.hypot(a, b); };

/** A cor de paleta mais próxima e a distância. */
export function maisProxima(rgb, paleta) {
  const lab = rgbParaLab(rgb);
  let melhor = null;
  for (const p of paleta) {
    const prgb = hexParaRgb(p);
    if (!prgb) continue;
    const d = deltaE00(lab, rgbParaLab(prgb));
    if (!melhor || d < melhor.de) melhor = { hex: p.toUpperCase(), de: d };
  }
  return melhor;
}
