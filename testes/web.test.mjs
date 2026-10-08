/* TESTE DO INSTRUMENTO DE WEB
   ─────────────────────────────────────────────────────────────────
   Cada página tem UM defeito e tem de falhar só nele. O CLS tem dois casos
   porque o instrumento já errou duas vezes nele (LICOES, "Web").

     node testes/web.test.mjs
*/
import path from "node:path";
import { spawnSync } from "node:child_process";
import { RAIZ } from "../nucleo/ambiente.mjs";

const DIR = path.join(RAIZ, "fixtures", "web");
spawnSync("node", [path.join(RAIZ, "fixtures", "gerar-web.mjs")], { stdio: "ignore" });
const qa = (arq) => {
  const r = spawnSync("node", [path.join(RAIZ, "qa.mjs"), path.join(DIR, arq), "--web", "--json"], { encoding: "utf8", maxBuffer: 1 << 26 });
  try { return JSON.parse(r.stdout)[0]; } catch { return null; }
};
const naoPassa = (b) => b.checagens.filter((c) => !["passa", "informa"].includes(c.estado)).map((c) => c.id).sort().join(",");

const CASOS = [
  ["bom.html", ""],
  ["acessibilidade-quebrada.html", "axe_critico,axe_serio"],
  ["alvo-pequeno.html", "alvos_menores_24px,axe_serio"],   // o axe confirma por conta própria (target-size)
  ["rolagem-no-celular.html", "rolagem_horizontal_px"],
  ["erro-de-script.html", "erros_console"],
  ["deslocamento-de-layout.html", "cls"],
];
let falhas = 0;
for (const [arq, esperado] of CASOS) {
  const b = qa(arq);
  // sem checagem medida não há "limpa" (o buraco do teste de código, 08/10)
  let ok = Boolean(b) && b.veredito !== "ILEGIVEL" && b.checagens.length > 0 && naoPassa(b) === esperado;
  // o CLS do celular tem de ser medido de verdade (a emulação de iPhone dava 0)
  if (ok && arq.startsWith("deslocamento")) ok = b.medidas.cls_celular > b.medidas.cls_computador && b.medidas.cls_celular > 0.1;
  if (!ok) falhas++;
  console.log(`  ${ok ? "✓" : "✗"} ${arq.padEnd(30)} ${esperado || "(limpa)"}`);
  if (!ok && b) console.log("      obtido:", naoPassa(b), JSON.stringify({ cls_c: b.medidas?.cls_celular, cls_pc: b.medidas?.cls_computador }));
}
console.log(falhas ? `\n  ${falhas} falha(s)\n` : "\n  todas as fixtures reprovadas/aprovadas como deviam\n");
process.exit(falhas ? 1 : 0);
