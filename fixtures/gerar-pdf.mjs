/* FIXTURES DE PDF — um arquivo por defeito, produzido pelo MECANISMO REAL
   ─────────────────────────────────────────────────────────────────────
   Instrumento que nunca reprovou nada não provou que enxerga (LICOES do
   protótipo, item 4: "teste que não testa"). Cada arquivo aqui carrega
   UM defeito conhecido, gerado do jeito que ele nasce em produção —
   Chrome/Skia imprimindo HTML —, e não fabricado à mão. Um defeito
   falsificado testa a minha ideia do defeito, não o defeito.

     node fixtures/gerar-pdf.mjs      → fixtures/pdf/*.pdf (+ _fonte/*.html)

   VEREDITO 08/10 — a primeira versão usava `page.setContent` + `page.pdf`
   do Playwright e 3 dos 6 defeitos NÃO nasceram:
     · fonte variável não carregou: setContent roda em about:blank, que não
       pode ler file:// — caiu em Times e saiu Type0;
     · a folha extra do 297mm não apareceu: o page.pdf não é o caminho do
       --print-to-pdf onde a armadilha foi medida em produção;
   Instrumento medindo 0 em fixture sem defeito pareceria certo. Agora o
   HTML vai para disco, abre por file://, e o PDF sai do chrome.exe com as
   MESMAS flags do pipeline RYZE/Atas. E cada fixture é conferida pela
   ASSINATURA do defeito (testar.mjs), não só pelo número do instrumento.
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, "pdf");
const FONTE = path.join(SAIDA, "_fonte");
fs.mkdirSync(FONTE, { recursive: true });
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const base = (corpo, css = "") => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@page{size:A4;margin:0}
body{margin:0;font-family:"Segoe UI",sans-serif;font-size:12pt;color:#111}
.page{width:210mm;height:296mm;padding:20mm;box-sizing:border-box;overflow:hidden;page-break-after:always}
.page:last-child{page-break-after:auto}
${css}</style></head><body>${corpo}</body></html>`;

const texto = "Relatório de conferência: a expedição de outubro fechou com 15 artes e 3 ajustes.";

// PNG 40×30 gerado em memória (sem depender de arquivo externo)
function pngMinusculo() {
  // 1×1 cinza, esticado: o ppi efetivo despenca, que é o defeito
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNoAAAAggCBd81ytgAAAABJRU5ErkJggg==";
}

const CASOS = {
  // A referência: o que DEVE passar em tudo
  "bom": base(`<div class="page"><h1>Documento bom</h1><p>${texto}</p></div>
               <div class="page"><h2>Segunda folha</h2><p>${texto}</p></div>`),

  // Fonte variável → o Chrome não sub-embute e emite Type3 (pdf-ryze, armadilha 2).
  // Bahnschrift vem com o Windows e é variável; peso 350 não é instância nomeada.
  "type3-fonte-variavel": base(`<div class="page"><h1 class="v">Fonte variável</h1><p class="v">${texto}</p></div>`,
    `@font-face{font-family:Var;src:url("file:///C:/Windows/Fonts/bahnschrift.ttf");font-weight:100 900}
     .v{font-family:Var;font-weight:350}`),

  // Folha que passa da A4 empurra uma página extra SEM TINTA.
  // VEREDITO 08/10: a versão "height:297mm puro" (pdf-ryze, armadilha 1,
  // medida em 27/07) NÃO reproduziu no Chrome 154 em 4 estruturas
  // (break-after sempre / auto na última / break-before / flex) — todas 2
  // páginas. O que reproduz é transbordo de verdade na ALTURA.
  // 2º veredito: padding em content-box NÃO serve — alarga a folha para
  // 230mm e o Chrome REDUZ A ESCALA do documento inteiro para caber na
  // largura (altura encolhe junto e volta a caber). É outro defeito
  // silencioso, invisível no PDF → instrumento `dom`, não este.
  "folha-extra-transbordo": base(`<div class="page" style="height:310mm"><p>${texto}</p></div>
                                  <div class="page" style="height:310mm"><p>${texto}</p></div>`),

  // Emoji do respondente: o Windows exporta como Type3 bitmap SEMPRE. Tem
  // de PASSAR — reprová-lo derrubou o Pesquisa X Vol. II entregue (08/10).
  "emoji-respondente": base(`<div class="page"><p>Obrigada pela escuta 🙏 e 👉 vejam a pauta.</p></div>`),

  // NÃO REPRODUZIDO (08/10): Type3 BITMAP desenhando texto. Tentei dígitos
  // em "Segoe UI Emoji" — saíram Type0 de contorno. Sem mecanismo real na
  // máquina, o caminho de reprovação é testado pela regra isolada
  // (testes/pdf.test.mjs, caso SINTÉTICO, marcado como tal).

  // Bullet da fonte Symbol colado do Word: U+F0B7, uso privado (Pesquisa X, 56 casos)
  "glifo-uso-privado": base(`<div class="page"><p>\uF0B7 primeiro item</p><p>\uF0B7 segundo item</p></div>`),

  // Texto posicionado para fora da folha
  "texto-fora-da-pagina": base(`<div class="page" style="position:relative;overflow:visible">
     <p>${texto}</p><p style="position:absolute;left:190mm;top:40mm;white-space:nowrap">este rótulo atravessa a borda direita da folha</p></div>`),

  // Imagem de 1 pixel esticada a 170mm: ppi efetivo ~0
  "imagem-baixa-resolucao": base(`<div class="page"><p>${texto}</p>
     <img src="${pngMinusculo()}" style="width:170mm;height:60mm;image-rendering:pixelated"></div>`),
};

for (const [nome, html] of Object.entries(CASOS)) {
  const fonte = path.join(FONTE, `${nome}.html`);
  const pdf = path.join(SAIDA, `${nome}.pdf`);
  fs.writeFileSync(fonte, html, "utf8");
  fs.rmSync(pdf, { force: true });
  spawnSync(CHROME, ["--headless", "--disable-gpu", "--no-pdf-header-footer",
    "--run-all-compositor-stages-before-draw", "--virtual-time-budget=10000",
    "--allow-file-access-from-files", `--print-to-pdf=${pdf}`, pathToFileURL(fonte).href],
    { stdio: "ignore" });
  console.log(fs.existsSync(pdf) ? "  ok" : "  FALHOU", nome);
}

// Arquivo truncado: o ffmpeg/Chrome que abortou e deixou só o cabeçalho.
// No protótipo, um .mp4 de 48 bytes saía com nota máxima.
fs.writeFileSync(path.join(SAIDA, "truncado.pdf"), "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n1 0 obj\n<<");
console.log("  ok truncado");
