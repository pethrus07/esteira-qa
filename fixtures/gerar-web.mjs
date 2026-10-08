/* FIXTURES DE WEB — uma página por defeito
     node fixtures/gerar-web.mjs   → fixtures/web/*.html */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "web");
fs.mkdirSync(DIR, { recursive: true });
const pag = (corpo, css = "", js = "") => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Página de teste</title>
<style>body{margin:0;font:16px/1.5 "Segoe UI",sans-serif;color:#1a1a1a;background:#fff}
main{max-width:720px;margin:0 auto;padding:24px}
button,a.bt{display:inline-block;min-width:44px;min-height:44px;padding:10px 16px;font:inherit}${css}</style></head>
<body><main><h1>Expedição Origens</h1><p>Três dias de trilha em Brotas, de 23 a 25 de outubro.</p>${corpo}</main>${js ? `<script>${js}</script>` : ""}</body></html>`;

const CASOS = {
  bom: pag(`<p><a class="bt" href="#inscricao">Inscrever-se</a></p>
    <label for="email">E-mail</label> <input id="email" type="email" style="min-height:44px">`),
  // axe: imagem sem alt, botão sem nome acessível, texto com contraste 2,3:1
  "acessibilidade-quebrada": pag(`<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="200" height="100">
    <button style="min-width:44px;min-height:44px"></button>
    <p style="color:#aaaaaa">Inscrições até sexta.</p>`),
  // bloco que entra 300 ms depois e empurra o conteúdo: deslocamento de layout
  // banner que chega 300 ms depois no TOPO e empurra a página inteira 600 px
  "deslocamento-de-layout": pag(`${"<p>Texto da página que vai ser empurrado para baixo.</p>".repeat(30)}`, "",
    `setTimeout(()=>{const d=document.createElement('div');d.style.cssText='height:600px;background:#ddd';document.body.prepend(d)},300)`),
  // elemento de largura fixa maior que o celular
  "rolagem-no-celular": pag(`<div style="width:600px;background:#eee">tabela larga que não encolhe</div>`),
  // ícones de 16 px como botões
  "alvo-pequeno": pag(`<p><button aria-label="fechar" style="min-width:0;min-height:0;width:16px;height:16px;padding:0">×</button>
    <button aria-label="menu" style="min-width:0;min-height:0;width:18px;height:18px;padding:0">≡</button></p>`),
  "erro-de-script": pag(`<p>Página com script quebrado.</p>`, "", `document.querySelector('#nao-existe').addEventListener('click',()=>{})`),
};
for (const [n, h] of Object.entries(CASOS)) fs.writeFileSync(path.join(DIR, `${n}.html`), h, "utf8");
console.log(`  ${Object.keys(CASOS).length} fixtures de web em ${DIR}`);
