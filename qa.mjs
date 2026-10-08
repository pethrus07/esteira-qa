/* ESTEIRA DE QA — o boletim de qualquer peça, num comando só
   ─────────────────────────────────────────────────────────────────
   POR QUE EXISTE

   Em 03/09 dei nota 8,5 a quatro vídeos que nunca assisti, porque a
   conferência dependia de disciplina em vez de ser um passo. Depois disso
   a esteira de vídeo virou um comando (qa-empresa/tutoriais/esteira) — e
   os outros formatos continuaram sendo conferidos com script refeito do
   zero a cada projeto: 35 scripts, Type3 reescrito 5 vezes, contraste com
   três limites diferentes (2,2 · 3 · 4,5) e nenhum com procedência.

   Ela REPROVA; não aprova. Garante que nada obviamente quebrado chegue a
   uma pessoa. Gosto, tom e adequação à marca seguem sendo julgamento humano.

     node qa.mjs <peça> [outra ...] [--destino tela|impressao|grafica] [--json]

   Saída: 0 PASSOU · 1 REPROVADO/ILEGÍVEL · 3 INCOMPLETO (algo não foi medido)
*/
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { RAIZ, rodarPython } from "./nucleo/ambiente.mjs";

function rodarNode(script, args) {
  const r = spawnSync("node", [path.join(RAIZ, script), ...args], { encoding: "utf8", maxBuffer: 1 << 28, timeout: 600_000 });
  try { return JSON.parse(r.stdout); }
  catch { return { erro: (r.stderr || "sem saída").trim().split("\n").slice(-1)[0] }; }
}
import { julgar, veredito, reguaDoProjeto } from "./nucleo/regua.mjs";

/* Cada formato: como medir e o que a medida NÃO cobre. O "não cobre" sai
   no boletim — instrumento que esconde o próprio limite dá confiança
   que não mediu. */
const FORMATOS = {
  pdf: {
    ext: [".pdf"],
    medir: (arq, o) => rodarPython("sistema", "instrumentos/pdf.py", [arq, "--destino", o.destino]),
    nao_cobre: "texto cortado antes de virar PDF (overflow:hidden não deixa rastro) e PDF defasado → passar o HTML junto; números da prosa contra os dados → `numeros`",
  },
  dom: {
    ext: [".html", ".htm"],
    // Com @page, a peça é documento para imprimir; sem, é tela.
    medir: (arq, o) => rodarNode("instrumentos/dom.mjs", [arq, "--midia",
      o.midia || (/@page\b/.test(fs.readFileSync(arq, "utf8")) ? "print" : "screen")]),
    nao_cobre: "se o PDF entregue é DESTE HTML (PDF defasado) → passar o PDF junto; contraste e acessibilidade de tela → `web` (a construir)",
  },
};

const argv = process.argv.slice(2);
const opc = { destino: "tela", json: false };
const pecas = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--destino") opc.destino = argv[++i];
  else if (argv[i] === "--json") opc.json = true;
  else if (argv[i].startsWith("--")) { console.error(`opção desconhecida: ${argv[i]}`); process.exit(2); }
  else pecas.push(argv[i]);
}
if (!pecas.length) {
  console.log("  uso: node qa.mjs <peça> [...] [--destino tela|impressao|grafica] [--json]");
  process.exit(2);
}
/* HTML e PDF de mesmo nome na mesma chamada = a mesma peça em duas formas.
   Além de medir cada um, mede o PAR (cobertura) — é o que pega PDF
   defasado, "o pior erro da série" do documento gerado de dados. */
const semExt = (p) => p.slice(0, -path.extname(p).length);
for (const h of pecas.filter((p) => /\.html?$/i.test(p))) {
  const pdf = pecas.find((p) => /\.pdf$/i.test(p) && semExt(p) === semExt(h));
  if (pdf) pecas.push(`par:${h}|${pdf}`);
}

const MARCA = { passa: "✓", reprova: "✗", aviso: "!", informa: "·", nao_medido: "?" };
const fmt = (v) => Array.isArray(v) ? v.join(", ") : typeof v === "number" ? String(v) : String(v ?? "—");

const boletins = [];
for (const peca of pecas) {
  const ext = path.extname(peca).toLowerCase();
  const nome = Object.keys(FORMATOS).find((k) => FORMATOS[k].ext.includes(ext));
  const b = { peca, formato: nome || null, destino: opc.destino, checagens: [], erros: [] };
  if (peca.startsWith("par:")) {
    // HTML + PDF da mesma peça: o PDF chegou com tudo que o HTML mostra?
    const [html, pdf] = peca.slice(4).split("|");
    b.peca = `${path.basename(html)} → ${path.basename(pdf)}`; b.formato = "cobertura";
    const txt = path.join(os.tmpdir(), `qa-cobertura-${process.pid}.txt`);
    rodarNode("instrumentos/dom.mjs", [html, "--texto", txt]);
    const r = fs.existsSync(txt) ? rodarPython("sistema", "instrumentos/cobertura.py", [txt, pdf]) : { erro: "texto do HTML não extraído" };
    fs.rmSync(txt, { force: true });
    if (r.erro) b.erros.push(`cobertura: ${r.erro}`);
    else if (r.ilegivel) b.ilegivel = r.ilegivel;
    else {
      b.medidas = r.medidas; b.exemplos = r.exemplos;
      b.checagens = julgar("cobertura", r.medidas, { destino: opc.destino, projeto: reguaDoProjeto(pdf)?.regua, naoAplica: r.nao_aplica || [] });
    }
    b.nao_cobre = "texto que existe nos DOIS e está errado nos dois — isso é conferência contra os dados (`numeros`)";
  }
  else if (!fs.existsSync(peca)) { b.ilegivel = "arquivo não existe"; }
  else if (!nome) { b.erros.push(`nenhum instrumento para "${ext}" ainda`); }
  else {
    const proj = reguaDoProjeto(peca);
    if (proj?.erro) b.erros.push(proj.erro);
    b.regua_projeto = proj?.caminho || null;
    const r = FORMATOS[nome].medir(peca, opc);
    if (r.erro) b.erros.push(`instrumento ${nome}: ${r.erro}`);
    else if (r.ilegivel) b.ilegivel = r.ilegivel;
    else {
      b.medidas = r.medidas; b.exemplos = r.exemplos;
      b.checagens = julgar(nome, r.medidas, { destino: opc.destino, projeto: proj?.regua, naoAplica: r.nao_aplica || [] });
    }
    b.nao_cobre = FORMATOS[nome].nao_cobre;
  }
  b.veredito = veredito(b.checagens, b);
  boletins.push(b);
}

if (opc.json) {
  console.log(JSON.stringify(boletins, null, 1));
} else {
  for (const b of boletins) {
    console.log(`\n  ${path.basename(b.peca)}  ·  ${b.formato || "?"}  ·  destino ${b.destino}`);
    console.log("  " + "═".repeat(66));
    if (b.regua_projeto) console.log(`  régua do projeto: ${b.regua_projeto}`);
    const ordem = { reprova: 0, nao_medido: 1, aviso: 2, informa: 3, passa: 4 };
    const passaram = b.checagens.filter((c) => c.estado === "passa");
    for (const c of [...b.checagens].sort((x, y) => ordem[x.estado] - ordem[y.estado])) {
      if (c.estado === "passa") continue;
      const proc = c.procedencia === "arbitrado" ? "arbitrado?" : c.procedencia;
      const ex = b.exemplos?.[c.id]?.length && c.estado !== "passa" ? `  ← ${b.exemplos[c.id].slice(0, 3).join(" · ")}` : "";
      console.log(`  ${MARCA[c.estado] || "·"} ${c.id.padEnd(28)} ${fmt(c.valor).padEnd(10)} ${(c.limite || "").padEnd(8)} [${proc}]${ex}`);
      if (c.estado !== "informa" && c.porque) console.log(`      ${c.porque}`);
    }
    if (passaram.length) console.log(`  ✓ ${passaram.length} checagens passaram  (detalhe: --json)`);
    for (const e of b.erros) console.log(`  ? ${e}`);
    if (b.ilegivel) console.log(`  ✗ ILEGÍVEL: ${b.ilegivel}`);
    console.log("  " + "─".repeat(66));
    console.log(`  ${b.veredito}`);
    if (b.nao_cobre && !b.ilegivel) console.log(`  não cobre: ${b.nao_cobre}`);
  }
  console.log("\n  A esteira reprova o que está quebrado. Gosto, tom e adequação seguem humanos.\n");
}
const pior = boletins.map((b) => b.veredito);
process.exit(pior.some((v) => v === "REPROVADO" || v === "ILEGIVEL") ? 1 : pior.some((v) => v === "INCOMPLETO") ? 3 : 0);
