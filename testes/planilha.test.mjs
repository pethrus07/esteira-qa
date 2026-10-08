/* TESTE DO INSTRUMENTO DE PLANILHA
   ─────────────────────────────────────────────────────────────────
   Cada fixture tem UM defeito da lista da skill planilha-premium e tem de
   falhar só nele. A do erro em cache é produzida pelo próprio Excel (COM):
   se o Excel não estiver na máquina, o caso sai PULADO, não "passou".

     node testes/planilha.test.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PY, RAIZ } from "../nucleo/ambiente.mjs";

const DIR = path.join(RAIZ, "fixtures", "planilha");
if (!fs.existsSync(path.join(DIR, "bom.xlsx"))) spawnSync(PY.sistema, [path.join(RAIZ, "fixtures", "gerar-planilha.py")], { stdio: "ignore" });
const qa = (arq) => {
  const r = spawnSync("node", [path.join(RAIZ, "qa.mjs"), path.join(DIR, arq), "--json"], { encoding: "utf8" });
  try { return JSON.parse(r.stdout)[0]; } catch { return null; }
};
const naoPassa = (b) => b.checagens.filter((c) => !["passa", "informa"].includes(c.estado)).map((c) => c.id).sort().join(",");

const CASOS = [
  ["bom.xlsx", ""],
  ["grade-visivel.xlsx", "abas_com_grade"],
  ["abre-no-meio.xlsx", "abre_na_primeira_aba"],
  ["sem-congelar.xlsx", "abas_dados_sem_congelar"],
  ["supressao-no-filtro.xlsx", "rotulo_suprimido_no_filtro"],
  ["texto-cortado.xlsx", "texto_cortado"],
  ["grade-serrada.xlsx", "abas_com_grade_serrada"],
  // fórmula sem cache: erro NÃO MEDIDO (não "zero erros")
  ["formula-sem-cache.xlsx", "erros_de_formula"],
  ["formula-fora-do-padrao.xlsx", "erros_de_formula,formulas_fora_do_padrao"],
  ["formula-com-erro.xlsx", "erros_de_formula,formulas_fora_do_padrao"],
];

let falhas = 0;
for (const [arq, esperado] of CASOS) {
  if (!fs.existsSync(path.join(DIR, arq))) { console.log(`  · ${arq}  PULADO (fixture não gerada — Excel ausente?)`); continue; }
  const b = qa(arq);
  let ok = Boolean(b) && naoPassa(b) === esperado;
  if (ok && arq === "formula-sem-cache.xlsx") ok = b.checagens.find((c) => c.id === "erros_de_formula").estado === "nao_medido" && b.veredito === "INCOMPLETO";
  if (ok && arq === "formula-com-erro.xlsx") ok = b.medidas.erros_de_formula === 1 && b.veredito === "REPROVADO";
  if (!ok) falhas++;
  console.log(`  ${ok ? "✓" : "✗"} ${arq.padEnd(28)} ${esperado || "(limpa)"}`);
  if (!ok && b) console.log("      obtido:", naoPassa(b), b.veredito);
}
console.log(falhas ? `\n  ${falhas} falha(s)\n` : "\n  todas as fixtures reprovadas/aprovadas como deviam\n");
process.exit(falhas ? 1 : 0);
