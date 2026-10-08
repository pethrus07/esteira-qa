/* INSTRUMENTO · CÓDIGO — o que quebra rodando e o que vaza publicando
   ─────────────────────────────────────────────────────────────────────
   POR QUE EXISTE

   Nos tutoriais, `PY_WHISPER` e `mesmaChave` ficaram usadas e não
   declaradas: `node --check` passou, e o código quebrava só rodando. E
   "verificar importando" disparou uma geração completa contra produção,
   porque `gerar.mjs` executa ao ser importado. Logo: ANÁLISE ESTÁTICA,
   nunca execução. O instrumento maduro para isso é o ESLint (no-undef) —
   usar o de mercado em vez de escrever um analisador meu.

     node instrumentos/codigo.mjs <arquivo.js|pasta-do-projeto>

   Numa pasta git, mede o que o git VERSIONA (git ls-files): é o que vai
   embora. Credencial é reportada como arquivo:linha + tipo, NUNCA o valor
   (regra "credencial nunca redigitada").

   O QUE NÃO COBRE: lógica certa, teste passando, tipo (TypeScript fica
   fora até ter o tsc do próprio projeto), estilo. Cada projeto tem o seu
   ferramental para isso; aqui é só o universal.
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ESLint } = require("eslint");
const globals = require("globals");

const alvo = process.argv[2];
const sair = (o) => { process.stdout.write(JSON.stringify(o, null, 1)); process.exit(0); };
if (!alvo || !fs.existsSync(alvo)) sair({ instrumento: "codigo", ilegivel: "não existe" });

const JS = /\.(m?js|cjs|jsx)$/i;
const TEXTO = /\.(m?js|cjs|jsx|ts|tsx|py|json|ya?ml|toml|env|ini|cfg|conf|html?|css|md|txt|sh|ps1|sql|xml)$|(^|[\\/])\.env/i;
// o que NUNCA se varre (dependência e máquina) × o que só sai do ESLint
const NUNCA = /(^|[\\/])(node_modules|\.git|\.venv|venv|__pycache__)([\\/]|$)/;
const IGNORA = /(^|[\\/])(node_modules|\.git|dist|build|out|vendor|\.venv|venv|__pycache__|coverage|\.next|fixtures)([\\/]|$)/;

let arquivos;
if (fs.statSync(alvo).isFile()) arquivos = [path.resolve(alvo)];
else {
  const g = spawnSync("git", ["-C", alvo, "ls-files"], { encoding: "utf8", maxBuffer: 1 << 26 });
  arquivos = g.status === 0
    ? g.stdout.split("\n").filter(Boolean).map((f) => path.resolve(alvo, f))
    : (function andar(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name); if (NUNCA.test(p)) return [];
        return e.isDirectory() ? andar(p) : [p]; }); })(path.resolve(alvo));
  arquivos = arquivos.filter((f) => fs.existsSync(f));
}
/* `fixtures/` sai do ESLint (tem erro de sintaxe DE PROPÓSITO), mas NÃO da
   busca de credencial. VEREDITO 08/10: a 1ª versão ignorava fixtures nas
   duas — uma chave real numa pasta fixtures passaria. A chave de exemplo
   documentada (sufixo EXAMPLE, convenção da AWS) é a única exceção, como no
   gitleaks. */
const paraLint = (f) => !IGNORA.test(fs.statSync(alvo).isFile() ? "" : path.relative(alvo, f));
const rel = (f) => fs.statSync(alvo).isFile() ? path.basename(f) : path.relative(alvo, f).replace(/\\/g, "/");
const M = {}, X = {};

/* ── 1 · ESLint: o que quebra rodando ─────────────────────────────── */
const js = arquivos.filter((f) => JS.test(f) && paraLint(f) && fs.statSync(f).size < 2_000_000);
M.arquivos_js = js.length;
const eslint = new ESLint({
  cwd: path.resolve(fs.statSync(alvo).isFile() ? path.dirname(alvo) : alvo),
  overrideConfigFile: true,  // NÃO lê a config do projeto: régua universal
  overrideConfig: [{
    languageOptions: { ecmaVersion: "latest", sourceType: "module",
      globals: { ...globals.node, ...globals.browser, ...globals.es2024 } },
    rules: { "no-undef": "error", "no-dupe-keys": "error", "no-unreachable": "error",
      "no-unused-vars": ["warn", { args: "none" }], "no-debugger": "error", "no-console": "off" },
  }, { files: ["**/*.cjs"], languageOptions: { sourceType: "commonjs" } }],
});
const res = js.length ? await eslint.lintFiles(js) : [];
const por = (pred) => res.flatMap((r) => r.messages.filter(pred).map((m) => `${rel(r.filePath)}:${m.line} ${m.ruleId || "sintaxe"}${m.ruleId === "no-undef" ? ` (${(m.message.match(/'([^']+)'/) || [])[1]})` : ""}`));
const sintaxe = por((m) => m.fatal);
const naoDecl = por((m) => m.ruleId === "no-undef");
const graves = por((m) => ["no-dupe-keys", "no-unreachable", "no-debugger"].includes(m.ruleId));
M.erros_de_sintaxe = sintaxe.length; X.erros_de_sintaxe = sintaxe.slice(0, 8);
M.variaveis_nao_declaradas = naoDecl.length; X.variaveis_nao_declaradas = naoDecl.slice(0, 8);
M.codigo_morto_ou_debugger = graves.length; X.codigo_morto_ou_debugger = graves.slice(0, 8);
M.variaveis_sem_uso = por((m) => m.ruleId === "no-unused-vars").length;

/* ── 2 · credencial no código versionado ──────────────────────────────
   Padrões de prefixo fixo (os mesmos que o gitleaks usa): baixo falso
   positivo. Chave genérica "senha = '...'" fica de fora — dá ruído demais
   sem calibração. */
const SEGREDOS = [
  ["AWS access key", /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["GitHub token (fine-grained)", /\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Stripe secret", /\b[sr]k_live_[0-9A-Za-z]{20,}\b/],
  ["Slack token", /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/],
  ["chave privada", /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY( BLOCK)?-----/],
  ["Anthropic key", /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
  ["OpenAI key", /\bsk-(proj-)?[A-Za-z0-9]{32,}\b/],
  ["1Password service account", /\bops_[A-Za-z0-9_-]{40,}\b/],
];
const vazados = [];
let consoles = 0, todos = 0;
for (const f of arquivos) {
  if (!TEXTO.test(f) || fs.statSync(f).size > 2_000_000) continue;
  const linhas = fs.readFileSync(f, "utf8").split(/\r?\n/);
  linhas.forEach((l, i) => {
    for (const [tipo, re] of SEGREDOS) {
      const m = l.match(re);
      if (m && !/EXAMPLE/.test(m[0])) vazados.push(`${rel(f)}:${i + 1} ${tipo}`);
    }
    if (JS.test(f) && /\bconsole\.(log|debug)\(/.test(l)) consoles++;
    if (/\b(TODO|FIXME|XXX|HACK)\b/.test(l)) todos++;
  });
}
M.credenciais_no_codigo = vazados.length; X.credenciais_no_codigo = vazados.slice(0, 10);
M.console_log = consoles;
M.todo_fixme = todos;
M.arquivos_versionados = arquivos.length;
/* TypeScript NÃO é medido aqui (precisa do tsc e do tsconfig do projeto).
   VEREDITO 08/10: o instituto-automacao tem 220 arquivos e só 8 JS — um
   "passou" sem esta linha esconderia 200 arquivos não medidos. */
M.arquivos_ts_nao_medidos = arquivos.filter((f) => /.(ts|tsx|mts|cts)$/i.test(f)).length;
sair({ instrumento: "codigo", arquivo: alvo, medidas: M, exemplos: X, nao_aplica: js.length ? [] : ["erros_de_sintaxe", "variaveis_nao_declaradas"] });
