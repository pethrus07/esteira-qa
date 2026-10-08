/* TESTE DO INSTRUMENTO DE PDF — ele enxerga cada defeito que diz enxergar?
   ─────────────────────────────────────────────────────────────────────
   Duas perguntas separadas, porque cada uma pega um erro diferente:

     1. ASSINATURA — o arquivo de defeito TEM o defeito? Conferido sem o
        instrumento (bytes crus, contagem de páginas contra o HTML-fonte).
        Se falha aqui, a fixture está quebrada: em 08/10, 3 de 6 fixtures
        saíram sem o defeito e o instrumento media 0 "corretamente".
     2. MEDIDA — o instrumento acusa? Se a assinatura passa e a medida não,
        o instrumento está cego.

     node testes/pdf.test.mjs        (gera as fixtures antes, se faltarem)
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PY, RAIZ, rodarPython } from "../nucleo/ambiente.mjs";

const DIR = path.join(RAIZ, "fixtures", "pdf");
if (!fs.existsSync(path.join(DIR, "bom.pdf"))) {
  spawnSync("node", [path.join(RAIZ, "fixtures", "gerar-pdf.mjs")], { stdio: "inherit" });
}
const bytes = (n) => fs.readFileSync(path.join(DIR, `${n}.pdf`)).toString("latin1");
const html = (n) => fs.readFileSync(path.join(DIR, "_fonte", `${n}.html`), "utf8");
const folhasNoHtml = (n) => (html(n).match(/class="page"/g) || []).length;
const paginasNoPdf = (n) => (bytes(n).match(/\/Type\s*\/Page[^s]/g) || []).length;

const CASOS = [
  { nome: "bom",
    assinatura: () => !/\/Subtype\s*\/Type3/.test(bytes("bom")) && paginasNoPdf("bom") === folhasNoHtml("bom"),
    espera: (m) => m.fontes_type3 === 0 && m.glifo_sem_mapeamento === 0 && m.texto_fora_da_pagina === 0
                && m.paginas_sem_tinta === 0 && m.fontes_nao_embutidas === 0 },
  { nome: "type3-fonte-variavel",
    assinatura: () => /\/Subtype\s*\/Type3/.test(bytes("type3-fonte-variavel")),
    espera: (m) => m.fontes_type3 > 0 && m.chars_texto_em_type3 > 20 },
  { nome: "folha-extra-transbordo",
    assinatura: () => paginasNoPdf("folha-extra-transbordo") > folhasNoHtml("folha-extra-transbordo"),
    espera: (m) => m.paginas_sem_tinta >= 1 },
  { nome: "glifo-uso-privado",
    assinatura: () => html("glifo-uso-privado").includes(""),
    espera: (m) => m.glifo_sem_mapeamento >= 2 },
  { nome: "texto-fora-da-pagina",
    assinatura: () => /left:190mm/.test(html("texto-fora-da-pagina")),
    espera: (m) => m.texto_fora_da_pagina >= 1 },
  { nome: "imagem-baixa-resolucao",
    assinatura: () => /\/Subtype\s*\/Image/.test(bytes("imagem-baixa-resolucao")),
    espera: (m) => m.ppi_efetivo_minimo !== null && m.ppi_efetivo_minimo < 10 },
  { nome: "emoji-respondente",
    assinatura: () => /\/Subtype\s*\/Type3/.test(bytes("emoji-respondente")),
    espera: (m) => m.fontes_type3_so_emoji >= 1 && m.fontes_type3_defeituosas === 0 && m.chars_texto_em_type3 === 0 },
  { nome: "truncado",
    assinatura: () => fs.statSync(path.join(DIR, "truncado.pdf")).size < 100,
    espera: (_m, r) => Boolean(r.ilegivel) },
];

let falhas = 0;
for (const c of CASOS) {
  const assin = (() => { try { return c.assinatura(); } catch { return false; } })();
  const r = rodarPython("sistema", "instrumentos/pdf.py", [path.join(DIR, `${c.nome}.pdf`)]);
  const ok = !r.erro && c.espera(r.medidas || {}, r);
  const marca = !assin ? "✗ FIXTURE" : ok ? "✓" : "✗ INSTRUMENTO";
  if (!assin || !ok) falhas++;
  console.log(`  ${marca.padEnd(14)} ${c.nome}${r.erro ? `  (${r.erro})` : ""}`);
  if (assin && !ok) console.log("                 medidas:", JSON.stringify(r.medidas));
}
/* SINTÉTICO — o mecanismo real (Type3 bitmap com texto) não foi reproduzido
   nesta máquina. Testa só a REGRA de decisão, e diz isso. */
{
  const prog = [
    "import sys,json; sys.path.insert(0,'instrumentos'); from pdf import classificar_type3 as c",
    "print(json.dumps([c([{'tounicode':True,'glifos_bitmap':3,'chars_texto':12}]),",
    "  c([{'tounicode':False,'glifos_bitmap':0,'chars_texto':5}]),",
    "  c([{'tounicode':True,'glifos_bitmap':2,'chars_texto':0}]),",
    "  c([{'tounicode':True,'glifos_bitmap':0,'chars_texto':80}])]))",
  ].join("\n");
  const r = spawnSync(PY.sistema, ["-c", prog], { cwd: RAIZ, encoding: "utf8" });
  let ok = false;
  try { ok = JSON.stringify(JSON.parse(r.stdout)) === JSON.stringify([[1, 0], [1, 0], [0, 1], [0, 0]]); } catch {}
  if (!ok) falhas++;
  console.log(`  ${(ok ? "✓" : "✗ REGRA").padEnd(14)} type3 bitmap/sem-ToUnicode com texto  [SINTÉTICO]`);
}
console.log(falhas ? `\n  ${falhas} falha(s)\n` : "\n  todas as fixtures reprovadas/aprovadas como deviam\n");
process.exit(falhas ? 1 : 0);
