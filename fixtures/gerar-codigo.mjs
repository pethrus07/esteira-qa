/* FIXTURES DE CÓDIGO — um arquivo por defeito. A credencial é a chave de
   EXEMPLO que a própria AWS publica na documentação (não é segredo).
     node fixtures/gerar-codigo.mjs   → fixtures/codigo/* */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "codigo");
fs.mkdirSync(DIR, { recursive: true });
const CASOS = {
  "bom.mjs": `import fs from "node:fs";\nexport function ler(p) {\n  return fs.readFileSync(p, "utf8");\n}\n`,
  // a lição dos tutoriais: usada e não declarada — node --check passa
  "nao-declarada.mjs": `export function transcrever(arq) {\n  return [PY_WHISPER, arq];\n}\n`,
  "sintaxe-quebrada.mjs": `export function f( {\n  return 1;\n}\n`,
  // a chave de EXEMPLO da documentação da AWS: NÃO pode ser acusada (exceção
  // do gitleaks). A chave de formato real nasce só no teste, em pasta temporária.
  "credencial-de-exemplo.mjs": `const AWS = "AKIAIOSFODNN7EXAMPLE";\nexport default AWS;\n`,
  "debugger.mjs": `export function f(x) {\n  debugger;\n  return x;\n}\n`,
};
for (const [n, c] of Object.entries(CASOS)) fs.writeFileSync(path.join(DIR, n), c, "utf8");
console.log(`  ${Object.keys(CASOS).length} fixtures de código em ${DIR}`);
