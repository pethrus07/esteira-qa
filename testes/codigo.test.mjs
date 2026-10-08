/* TESTE DO INSTRUMENTO DE CÓDIGO
   ─────────────────────────────────────────────────────────────────
   Inclui a prova da lição dos tutoriais: `node --check` PASSA no arquivo
   com variável não declarada; o instrumento tem de pegar.

     node testes/codigo.test.mjs
*/
import path from "node:path";
import { spawnSync } from "node:child_process";
import { RAIZ } from "../nucleo/ambiente.mjs";

const DIR = path.join(RAIZ, "fixtures", "codigo");
spawnSync("node", [path.join(RAIZ, "fixtures", "gerar-codigo.mjs")], { stdio: "ignore" });
const qa = (alvo) => {
  const r = spawnSync("node", [path.join(RAIZ, "qa.mjs"), alvo, "--json"], { encoding: "utf8", maxBuffer: 1 << 26 });
  try { return JSON.parse(r.stdout)[0]; } catch { return null; }
};
const ruins = (b) => b.checagens.filter((c) => ["reprova", "aviso"].includes(c.estado)).map((c) => c.id).sort().join(",");

const CASOS = [
  ["bom.mjs", ""],
  ["nao-declarada.mjs", "variaveis_nao_declaradas"],
  ["sintaxe-quebrada.mjs", "erros_de_sintaxe"],
  ["credencial-de-exemplo.mjs", ""],   // exceção documentada: não acusa
  ["debugger.mjs", "codigo_morto_ou_debugger"],
];
let falhas = 0;
const check = spawnSync("node", ["--check", path.join(DIR, "nao-declarada.mjs")]);
const licao = check.status === 0;
if (!licao) falhas++;
console.log(`  ${licao ? "✓" : "✗"} node --check PASSA no não-declarado (por isso este instrumento existe)`);
for (const [arq, esperado] of CASOS) {
  const b = qa(path.join(DIR, arq));
  /* VEREDITO 08/10: arquivo INEXISTENTE passava como "limpo" — ILEGÍVEL não
     tem checagem nenhuma, e "nenhuma ruim" batia com o esperado vazio.
     Sem checagem medida não há "limpo". */
  let ok = Boolean(b) && b.veredito !== "ILEGIVEL" && b.checagens.length > 0 && ruins(b) === esperado;
  if (!ok) falhas++;
  console.log(`  ${ok ? "✓" : "✗"} ${arq.padEnd(24)} ${esperado || "(limpo)"}`);
  if (!ok && b) console.log("      obtido:", ruins(b));
}
/* Credencial dentro de uma pasta `fixtures/` TEM de ser acusada (a 1ª
   versão ignorava fixtures). Chave falsa em formato real, gerada na hora
   numa pasta temporária — nunca commitada. */
{
  const fs = await import("node:fs");
  const os = await import("node:os");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qa-cred-"));
  fs.mkdirSync(path.join(tmp, "fixtures"));
  const chave = "AKIA" + Array.from({ length: 16 }, (_, i) => "ABCDEFGHJKLMNPQRSTUVWXYZ234567"[(i * 7 + 3) % 30]).join("");
  fs.writeFileSync(path.join(tmp, "fixtures", "config.mjs"), `export const k = "${chave}";\n`);
  const b = qa(tmp);
  const ok = b && b.medidas.credenciais_no_codigo === 1 && !JSON.stringify(b).includes(chave);
  if (!ok) falhas++;
  console.log(`  ${ok ? "✓" : "✗"} credencial dentro de fixtures/ é acusada (e o valor não aparece)`);
  fs.rmSync(tmp, { recursive: true, force: true });
}
// a própria esteira tem de passar no próprio instrumento
const eu = qa(RAIZ);
const limpa = eu && ["erros_de_sintaxe", "variaveis_nao_declaradas", "credenciais_no_codigo"].every((id) => eu.checagens.find((c) => c.id === id)?.estado === "passa");
if (!limpa) falhas++;
console.log(`  ${limpa ? "✓" : "✗"} a esteira passa no próprio instrumento`);
console.log(falhas ? `\n  ${falhas} falha(s)\n` : "\n  todas as fixtures reprovadas/aprovadas como deviam\n");
process.exit(falhas ? 1 : 0);
