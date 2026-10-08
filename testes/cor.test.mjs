/* TESTE DA MATEMÁTICA DE COR — duas referências independentes
   ─────────────────────────────────────────────────────────────────
   1. Pares publicados de Sharma, Wu & Dalal (2005), "The CIEDE2000
      Color-Difference Formula: Implementation Notes", tabela de teste —
      escolhidos os que exercitam os casos difíceis (hue wrap, croma ~0).
   2. scikit-image (deltaE_ciede2000 + rgb2lab), implementação de terceiros:
      se a minha e a deles discordarem, uma das duas está errada.
   3. WCAG: preto/branco = 21; #767676 em branco = 4,54 (o cinza mais claro
      que passa 4,5:1 — valor de referência amplamente publicado).

     node testes/cor.test.mjs
*/
import { spawnSync } from "node:child_process";
import { PY } from "../nucleo/ambiente.mjs";
import { contraste, deltaE00, hexParaRgb, rgbParaLab } from "../nucleo/cor.mjs";

let falhas = 0;
const conf = (rotulo, obtido, esperado, tol) => {
  const ok = Math.abs(obtido - esperado) <= tol;
  if (!ok) falhas++;
  console.log(`  ${ok ? "✓" : "✗"} ${rotulo.padEnd(44)} ${obtido.toFixed(4)}  (ref ${esperado})`);
};

console.log("  ΔE00 contra Sharma et al. (2005)");
const SHARMA = [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425, "par 1"],
  [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615, "par 2"],
  [[50, 2.8361, -74.0200], [50, 0, -82.7485], 3.4412, "par 3"],
  [[50, 0, 0], [50, -1, 2], 2.3669, "par 7 (croma ~0)"],
  [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792, "par 13 (hue wrap)"],
  [[50, 2.5, 0], [73, 25, -18], 27.1492, "par 17"],
  [[50, 2.5, 0], [61, -5, 29], 22.8977, "par 18"],
  [[50, 2.5, 0], [56, -27, -3], 31.9030, "par 19"],
  [[50, 2.5, 0], [58, 24, 15], 19.4535, "par 20"],
  [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644, "par 25"],
];
for (const [a, b, ref, r] of SHARMA) conf(r, deltaE00(a, b), ref, 0.0001);

console.log("\n  ΔE00 de sRGB contra scikit-image (independente)");
const PARES = [["#FFB700", "#CC9200"], ["#6100F9", "#4A3AA7"], ["#0D0D0D", "#1A1A1A"], ["#2F80ED", "#1FA35A"], ["#FFFFFF", "#FAFAFA"]];
const prog = [
  "import json,sys,numpy as np",
  "from skimage.color import rgb2lab, deltaE_ciede2000",
  "pares=json.loads(sys.argv[1]); out=[]",
  "for a,b in pares:",
  "  f=lambda h: np.array([[[int(h[i:i+2],16)/255 for i in (1,3,5)]]])",
  "  out.append(float(deltaE_ciede2000(rgb2lab(f(a)), rgb2lab(f(b)))[0,0]))",
  "print(json.dumps(out))",
].join("\n");
const r = spawnSync(PY.sistema, ["-c", prog, JSON.stringify(PARES)], { encoding: "utf8" });
let refs = []; try { refs = JSON.parse(r.stdout); } catch { console.log("  ? scikit-image não rodou:", r.stderr.slice(-120)); falhas++; }
PARES.forEach(([a, b], i) => {
  if (refs[i] === undefined) return;
  conf(`${a} × ${b}`, deltaE00(rgbParaLab(hexParaRgb(a)), rgbParaLab(hexParaRgb(b))), +refs[i].toFixed(4), 0.01);
});

console.log("\n  contraste WCAG");
conf("preto × branco", contraste([0, 0, 0], [255, 255, 255]), 21, 0.001);
conf("#767676 × branco", contraste(hexParaRgb("#767676"), [255, 255, 255]), 4.54, 0.005);
conf("#777777 × branco (reprova 4,5)", contraste(hexParaRgb("#777777"), [255, 255, 255]), 4.48, 0.005);

console.log(falhas ? `\n  ${falhas} falha(s)\n` : "\n  matemática de cor confere com as duas referências\n");
process.exit(falhas ? 1 : 0);
