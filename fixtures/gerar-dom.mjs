/* FIXTURES DE DOM — um HTML por defeito de diagramação
   ─────────────────────────────────────────────────────────────────
   Aqui a peça É o HTML, então o defeito se escreve direto. A assinatura
   (o defeito existe?) é conferida no teste pelo PDF que o Chrome gera do
   mesmo HTML sempre que isso for possível — p.ex. o texto cortado NÃO pode
   aparecer no PDF; se aparecer, a fixture não corta nada.

     node fixtures/gerar-dom.mjs     → fixtures/dom/*.html
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), "dom");
fs.mkdirSync(SAIDA, { recursive: true });

const doc = (corpo, css = "") => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>fixture</title><style>
@page{size:A4;margin:0}
body{margin:0;font-family:"Segoe UI",sans-serif;font-size:11pt;color:#111}
.page{width:210mm;height:296mm;padding:18mm;box-sizing:border-box;overflow:hidden;position:relative;break-after:page}
.ft{position:absolute;left:18mm;right:18mm;bottom:8mm;font-size:8pt;color:#555}
${css}</style></head><body>${corpo}</body></html>`;

const para = (i) => `<p>Parágrafo ${i}: a escuta registrou respostas sobre formação, acolhida e missão nas paróquias da diocese.</p>`;
const muitos = (n) => Array.from({ length: n }, (_, i) => para(i + 1)).join("");

const CASOS = {
  bom: doc(`<div class="page"><h1>Relatório</h1>${muitos(6)}<div class="ft">Empresa A · 1 de 2</div></div>
            <div class="page"><h2>Anexo</h2>${muitos(4)}<div class="ft">Empresa A · 2 de 2</div></div>`),

  // Pesquisa X: folha de altura fixa + overflow:hidden apaga o excesso calado
  "folha-cortada": doc(`<div class="page"><h1>Respostas</h1>${muitos(60)}<p id="ultima">RESPOSTA-QUE-SUMIU</p><div class="ft">1 de 1</div></div>`),

  // Folha de 230mm numa A4: o Chrome reduz a escala do documento inteiro
  "largura-excedente": doc(`<div class="page" style="width:230mm">${muitos(3)}</div>`),

  // Rodapé absoluto em cima do texto (o "colide com o rodapé" do qa_layout)
  "sobreposicao-rodape": doc(`<div class="page"><h1>Texto</h1>${muitos(3)}
     <div class="ft" style="bottom:auto;top:30mm;background:none">Empresa A · rodapé deslocado</div></div>`),

  // @font-face apontando para arquivo que não existe → cai em outra fonte calado
  "fonte-com-erro": doc(`<div class="page"><h1 class="m">Marca</h1>${muitos(2)}</div>`,
    `@font-face{font-family:Marca;src:url("nao-existe.woff2") format("woff2")}
     .m{font-family:Marca,serif}`),

  "imagem-quebrada": doc(`<div class="page">${muitos(2)}<img src="sumiu.png" alt="gráfico" width="300" height="120"></div>`),

  // Template que não substituiu: o que vai ao cliente diz "undefined"
  "lixo-de-template": doc(`<div class="page"><p>Prezado {{cliente}}, o total apurado foi de R$ undefined em NaN parcelas.</p></div>`),

  // Truncamento PEDIDO: não é acidente, mas ainda esconde texto do leitor
  "truncado-intencional": doc(`<div class="page"><p style="width:40mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Este título longo foi cortado com reticências de propósito</p></div>`),

  // Pesquisa X: bloco com break-inside:avoid MAIOR que a coluna, em coluna de
  // altura fixa. Só aparece paginando — o DOM não vê; a cobertura vê.
  "bloco-gigante-avoid": doc(`<div class="page"><h1>Respostas</h1>
     <div style="column-count:2;column-gap:8mm;height:220mm;column-fill:auto">
       ${muitos(4)}
       <div style="break-inside:avoid;border-left:2px solid #999;padding-left:3mm">${muitos(40)}<p>FIM-DO-BLOCO-GIGANTE</p></div>
     </div></div>`),

  // letter-spacing separa as letras no PDF: TEM de dar 100% de cobertura
  "espacamento-de-letras": doc(`<div class="page"><h1 style="letter-spacing:6px;text-transform:uppercase">Decisões tomadas</h1>${muitos(3)}</div>`),

  // Sobreposição sem position: margem negativa empurra um bloco sobre outro
  "sobreposicao-blocos": doc(`<div class="page"><p>Primeiro bloco de texto que deveria ficar sozinho nesta linha.</p>
     <p style="margin-top:-1.6em">Segundo bloco subiu por cima do primeiro.</p></div>`),
};

for (const [nome, html] of Object.entries(CASOS)) {
  fs.writeFileSync(path.join(SAIDA, `${nome}.html`), html, "utf8");
}
console.log(`  ${Object.keys(CASOS).length} fixtures de DOM em ${SAIDA}`);
