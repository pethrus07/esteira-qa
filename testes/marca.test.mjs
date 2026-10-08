/* TESTE DA CAMADA DE MARCA
   ─────────────────────────────────────────────────────────────────
   Cada defeito de marca numa fixture, e um caso BOM por marca. O bom
   é calibrado contra peças aprovadas (LICOES, "Marca"): se o bom
   reprovar, a régua está errada, não a peça.

     node testes/marca.test.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { RAIZ } from "../nucleo/ambiente.mjs";

const DIR = path.join(RAIZ, "fixtures", "marca");
fs.mkdirSync(DIR, { recursive: true });
const doc = (corpo, css = "") => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>marca</title>
<style>body{margin:0;padding:40px;background:#000;color:#FFF;font-family:Archivo,"Segoe UI",sans-serif;font-size:18px}
h1{font-family:Anton,Impact,sans-serif;font-size:48px}${css}</style></head><body>${corpo}</body></html>`;

const FIX = {
  // P&B estrito, só cinzas puros — como as 3 peças aprovadas
  "desbravando-bom": doc(`<h1>O PADRÃO DESBRAVANDO</h1><p>O Desbravando leva a expedição até o alto do morro.</p><p style="color:#C7C7C7">Isso não é passeio. É o padrão Desbravando.</p>`),
  // o "acento raro" usado como cor de texto num núcleo P&B
  "desbravando-com-cor": doc(`<h1>EXPEDIÇÃO</h1><p style="color:#2F80ED">Inscrições abertas.</p>`),
  // naming no feminino
  "desbravando-feminino": doc(`<h1>PARCERIAS</h1><p>Seja parceiro da Desbravando nesta temporada.</p>`),
};
for (const [n, h] of Object.entries(FIX)) fs.writeFileSync(path.join(DIR, `${n}.html`), h, "utf8");

const rodar = (arq, marca) => {
  const r = spawnSync("node", [path.join(RAIZ, "qa.mjs"), path.join(DIR, arq), "--marca", marca, "--json"], { encoding: "utf8", maxBuffer: 1 << 26 });
  try { return JSON.parse(r.stdout)[0]; } catch { return null; }
};
const estado = (b, id) => b?.checagens.find((c) => c.id === id)?.estado;

/* Fontes: Anton/Archivo não estão instaladas nesta máquina → o Chrome
   desenha Impact/Segoe. É EXATAMENTE o defeito "fonte da marca não
   carregou", e a fixture o exercita sem precisar fabricar nada. */
const CASOS = [
  { arq: "desbravando-com-cor.html", marca: "desbravando", espera: (b) => estado(b, "cores_em_peca_pb") === "reprova" },
  { arq: "desbravando-feminino.html", marca: "desbravando", espera: (b) => estado(b, "termos_proibidos") === "reprova" },
  { arq: "desbravando-bom.html", marca: "desbravando",
    espera: (b) => estado(b, "cores_em_peca_pb") === "passa" && estado(b, "termos_proibidos") === "passa" },
  { arq: "desbravando-bom.html", marca: "desbravando", rotulo: "fonte da marca ausente → acusa",
    espera: (b) => estado(b, "fontes_fora_da_marca") === "reprova" },
  { arq: "desbravando-bom.html", marca: "ryze", rotulo: "P&B não é regra da RYZE",
    espera: (b) => !b.checagens.some((c) => c.id === "cores_em_peca_pb") },
];

let falhas = 0;
for (const c of CASOS) {
  const b = rodar(c.arq, c.marca);
  const ok = Boolean(b) && c.espera(b);
  if (!ok) falhas++;
  console.log(`  ${ok ? "✓" : "✗"} ${(c.rotulo || c.arq).padEnd(36)} marca ${c.marca}`);
  if (!ok && b) console.log("      ", JSON.stringify(b.checagens.filter((x) => x.estado !== "passa").map((x) => [x.id, x.estado, x.valor])));
}
console.log(falhas ? `\n  ${falhas} falha(s)\n` : "\n  regras de marca acusam e poupam como deviam\n");
process.exit(falhas ? 1 : 0);
