/* TESTE DO INSTRUMENTO DE DOM
   ─────────────────────────────────────────────────────────────────
   Mesma disciplina do teste de PDF: (1) a fixture TEM o defeito? — lido
   no PDF que o Chrome imprime do mesmo HTML, sem passar pelo instrumento;
   (2) o instrumento acusa?

     node testes/dom.test.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PY, RAIZ, imprimirPdf } from "../nucleo/ambiente.mjs";

const DIR = path.join(RAIZ, "fixtures", "dom");
spawnSync("node", [path.join(RAIZ, "fixtures", "gerar-dom.mjs")], { stdio: "ignore" });
const TMP = path.join(DIR, "_pdf");
fs.mkdirSync(TMP, { recursive: true });

/** Lê o PDF impresso do HTML: texto, maior corpo de letra, fontes. */
function noPdf(nome) {
  const pdf = path.join(TMP, `${nome}.pdf`);
  if (!imprimirPdf(path.join(DIR, `${nome}.html`), pdf)) return null;
  const r = spawnSync(PY.sistema, ["-c", [
    "import fitz,json,sys",
    "d=fitz.open(sys.argv[1]); t=''.join(p.get_text() for p in d)",
    "tam=[s['size'] for p in d for b in p.get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans'] if s['text'].startswith('Parágrafo')]",
    "fontes=sorted({f[3] for p in d for f in p.get_fonts()})",
    "print(json.dumps({'texto':t,'corpo':max(tam) if tam else None,'fontes':fontes}))",
  ].join("\n"), pdf], { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  try { return JSON.parse(r.stdout); } catch { return null; }
}
const html = (n) => fs.readFileSync(path.join(DIR, `${n}.html`), "utf8");

const CASOS = [
  { nome: "bom", assinatura: () => noPdf("bom")?.texto.includes("Parágrafo 6"),
    espera: (m) => m.texto_cortado === 0 && m.sobreposicao_de_texto === 0 && m.excesso_largura_px === 0
                && m.fontes_com_erro === 0 && m.imagens_quebradas === 0 && m.lixo_de_template === 0 && m.erros_console === 0 },
  // o texto cortado NÃO pode chegar ao PDF — se chegar, a fixture não corta
  { nome: "folha-cortada", assinatura: () => { const p = noPdf("folha-cortada"); return p && !p.texto.includes("RESPOSTA-QUE-SUMIU"); },
    espera: (m) => m.texto_cortado >= 30 && m.chars_cortados > 1000 },
  // 11pt no CSS; impresso numa folha 230mm→210mm, o corpo tem de encolher
  { nome: "largura-excedente", assinatura: () => { const p = noPdf("largura-excedente"); return p && p.corpo < 11 * 0.95; },
    espera: (m) => m.excesso_largura_px > 50 },
  { nome: "sobreposicao-rodape", assinatura: () => /top:30mm/.test(html("sobreposicao-rodape")),
    espera: (m) => m.sobreposicao_de_texto >= 1 },
  { nome: "sobreposicao-blocos", assinatura: () => /margin-top:-1\.6em/.test(html("sobreposicao-blocos")),
    espera: (m) => m.sobreposicao_de_texto >= 1 },
  // a fonte da marca NÃO pode estar no PDF — o Chrome caiu em outra
  { nome: "fonte-com-erro", assinatura: () => { const p = noPdf("fonte-com-erro"); return p && !p.fontes.some((f) => /Marca/i.test(f)); },
    espera: (m) => m.fontes_com_erro === 1 },
  { nome: "imagem-quebrada", assinatura: () => !fs.existsSync(path.join(DIR, "sumiu.png")),
    espera: (m) => m.imagens_quebradas === 1 },
  { nome: "lixo-de-template", assinatura: () => noPdf("lixo-de-template")?.texto.includes("undefined"),
    espera: (m) => m.lixo_de_template >= 3 },
  { nome: "truncado-intencional", assinatura: () => !noPdf("truncado-intencional")?.texto.includes("de propósito"),
    espera: (m) => m.texto_truncado_intencional === 1 && m.texto_cortado === 0 },
];

let falhas = 0;
for (const c of CASOS) {
  const assin = (() => { try { return Boolean(c.assinatura()); } catch { return false; } })();
  const r = spawnSync("node", [path.join(RAIZ, "instrumentos", "dom.mjs"), path.join(DIR, `${c.nome}.html`)], { encoding: "utf8" });
  let j = {}; try { j = JSON.parse(r.stdout); } catch {}
  const ok = Boolean(j.medidas) && c.espera(j.medidas);
  if (!assin || !ok) falhas++;
  console.log(`  ${(!assin ? "✗ FIXTURE" : ok ? "✓" : "✗ INSTRUMENTO").padEnd(14)} ${c.nome}`);
  if (assin && !ok) console.log("                 medidas:", JSON.stringify(j.medidas));
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(falhas ? `\n  ${falhas} falha(s)\n` : "\n  todas as fixtures reprovadas/aprovadas como deviam\n");
process.exit(falhas ? 1 : 0);
