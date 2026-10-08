/* TESTE DA COBERTURA (HTML × PDF)
   ─────────────────────────────────────────────────────────────────
   Cada par é impresso agora pelo caminho da produção. O caso "defasado"
   imprime o HTML, DEPOIS corrige um número no HTML — o par que o build
   de documento gerado tem de recusar.

     node testes/cobertura.test.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { RAIZ, imprimirPdf, rodarPython } from "../nucleo/ambiente.mjs";

const DOM = path.join(RAIZ, "fixtures", "dom");
spawnSync("node", [path.join(RAIZ, "fixtures", "gerar-dom.mjs")], { stdio: "ignore" });
const TMP = path.join(RAIZ, "fixtures", "_tmp-cobertura");
fs.mkdirSync(TMP, { recursive: true });

function par(nome, depois = null) {
  const html = path.join(TMP, `${nome}.html`);
  fs.copyFileSync(path.join(DOM, `${nome}.html`), html);
  const pdf = path.join(TMP, `${nome}.pdf`);
  if (!imprimirPdf(html, pdf)) return { erro: "PDF não gerado" };
  if (depois) fs.writeFileSync(html, depois(fs.readFileSync(html, "utf8")), "utf8");
  const txt = path.join(TMP, `${nome}.txt`);
  spawnSync("node", [path.join(RAIZ, "instrumentos", "dom.mjs"), html, "--texto", txt], { stdio: "ignore" });
  return { ...rodarPython("sistema", "instrumentos/cobertura.py", [txt, pdf]), html: fs.readFileSync(html, "utf8") };
}

const CASOS = [
  { nome: "bom", espera: (m) => m.cobertura_pct === 100 && m.numeros_faltando_no_pdf === 0 },
  { nome: "espacamento-de-letras", espera: (m) => m.cobertura_pct === 100 },
  { nome: "folha-cortada", espera: (m) => m.cobertura_pct < 50 },
  // PDF defasado: o HTML ganhou um número novo depois da impressão
  { nome: "bom", rotulo: "pdf-defasado",
    depois: (h) => h.replace("Parágrafo 1:", "Parágrafo 1 (58,4% das paróquias):"),
    assinatura: (r) => r.html.includes("58,4%"),
    espera: (m) => m.numeros_faltando_no_pdf >= 1 },
];

let falhas = 0;
for (const c of CASOS) {
  const r = par(c.nome, c.depois);
  const assin = c.assinatura ? c.assinatura(r) : true;
  const ok = !r.erro && c.espera(r.medidas || {});
  if (!assin || !ok) falhas++;
  console.log(`  ${(!assin ? "✗ FIXTURE" : ok ? "✓" : "✗ INSTRUMENTO").padEnd(14)} ${c.rotulo || c.nome}` +
    `  (${r.medidas?.cobertura_pct}% · números faltando ${r.medidas?.numeros_faltando_no_pdf})${r.erro ? " " + r.erro : ""}`);
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(falhas ? `\n  ${falhas} falha(s)\n` : "\n  todos os pares julgados como deviam\n");
process.exit(falhas ? 1 : 0);
