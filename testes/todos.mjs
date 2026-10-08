/* Roda todas as suítes. Uma esteira que reprova peça precisa, antes,
   provar que o próprio instrumento enxerga — é isto.   npm test */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { RAIZ } from "../nucleo/ambiente.mjs";

const suites = fs.readdirSync(path.join(RAIZ, "testes")).filter((f) => f.endsWith(".test.mjs")).sort();
let falhas = 0;
for (const s of suites) {
  console.log(`\n── ${s}`);
  const r = spawnSync("node", [path.join(RAIZ, "testes", s)], { stdio: "inherit" });
  if (r.status !== 0) falhas++;
}
console.log(falhas ? `\n✗ ${falhas} suíte(s) com falha\n` : `\n✓ ${suites.length} suítes passaram\n`);
process.exit(falhas ? 1 : 0);
