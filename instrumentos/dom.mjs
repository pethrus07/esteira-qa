/* INSTRUMENTO · DOM — mede o que o navegador CALCULOU, antes de virar PDF
   ─────────────────────────────────────────────────────────────────────
   POR QUE EXISTE

   O defeito mais caro do Pesquisa X não deixa rastro no PDF: folha de altura
   fixa com overflow:hidden apagou 45 respostas sem erro nenhum. O PDF só
   mostra onde o texto caiu; o que foi cortado simplesmente não está lá.

   O qa_layout.js do Pesquisa X resolvia isso com as classes daquele projeto
   (.page, .main, .ft, .duasc, .bar). Aqui a pergunta é outra, sem nome de
   classe: EXISTE TEXTO QUE O LEITOR NÃO CONSEGUE VER? Para cada nó de
   texto, a caixa real de cada linha (Range.getClientRects) é comparada com
   a área visível de todo ancestral que corta (overflow ≠ visible).

     node instrumentos/dom.mjs <pagina.html> [--midia print|screen] [--largura 1440]

   O QUE NÃO COBRE: fragmentação de página. emulateMedia('print') aplica o
   CSS de impressão mas NÃO pagina — bloco com break-inside:avoid maior que
   a coluna (sumiu inteiro no Pesquisa X) só aparece no PDF. Para isso existe a
   checagem de COBERTURA (instrumentos/cobertura.py): toda palavra do HTML
   tem de estar no PDF.
*/
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const argv = process.argv.slice(2);
const pega = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const alvo = argv.find((a, i) => !a.startsWith("--") && !["--midia", "--largura", "--texto"].includes(argv[i - 1]));
const midia = pega("--midia", "print");
const largura = +pega("--largura", 1440);

const sair = (o) => { process.stdout.write(JSON.stringify(o, null, 1)); process.exit(0); };
if (!alvo || !fs.existsSync(alvo)) sair({ instrumento: "dom", ilegivel: "arquivo não existe" });

const url = /^https?:/.test(alvo) ? alvo : pathToFileURL(path.resolve(alvo)).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: largura, height: 1000 } });
const consoleErros = [];
page.on("console", (m) => { if (m.type() === "error") consoleErros.push(m.text().slice(0, 120)); });
page.on("pageerror", (e) => consoleErros.push(`pageerror: ${String(e.message).slice(0, 120)}`));
const falhasRede = [];
page.on("requestfailed", (r) => falhasRede.push(`${r.failure()?.errorText} ${r.url().slice(0, 90)}`));

try {
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
} catch (e) {
  await browser.close();
  sair({ instrumento: "dom", ilegivel: `não carregou: ${e.message.split("\n")[0]}` });
}
await page.emulateMedia({ media: midia });
await page.evaluate(() => document.fonts.ready);

/* LARGURA DA FOLHA ANTES DE MEDIR (veredito 08/10).
   A 1ª versão media tudo numa janela de 1440px — a largura que EU escolhi.
   emulateMedia('print') aplica o CSS de impressão mas não muda a largura:
   todo `width:100%` ficou com 1440px e as 6 peças APROVADAS saíram com
   "excesso de largura" de 174 a 646px. Pior: texto que só se corta a 794px
   nunca seria visto a 1440px. Em impressão, a janela passa a ter a largura
   da folha declarada em @page, e só então se mede. */
const folhaPx = midia !== "print" ? null : await page.evaluate(() => {
  let size = null;
  for (const sh of document.styleSheets) {
    let regras; try { regras = sh.cssRules; } catch { continue; }
    for (const rl of regras) {
      // `rl.style.size` volta vazio no Chrome; e o valor vem "a4", minúsculo
      const sz = rl.type === CSSRule.PAGE_RULE && rl.style.getPropertyValue("size");
      if (sz) size = sz;
    }
  }
  if (!size) return null;
  const mm = { A3: [297, 420], A4: [210, 297], A5: [148, 210], LETTER: [215.9, 279.4], LEGAL: [215.9, 355.6] };
  const p = size.trim().split(/\s+/).map((x) => x.toUpperCase());
  let larg = null;
  if (mm[p[0]]) larg = p.includes("LANDSCAPE") ? mm[p[0]][1] : mm[p[0]][0];
  else if (/MM$/.test(p[0])) larg = parseFloat(p[0]);
  else if (/CM$/.test(p[0])) larg = parseFloat(p[0]) * 10;
  else if (/IN$/.test(p[0])) larg = parseFloat(p[0]) * 25.4;
  return larg ? { size, px: Math.round((larg / 25.4) * 96) } : { size, px: null };
});
if (folhaPx?.px) await page.setViewportSize({ width: folhaPx.px, height: 1123 });
await page.waitForTimeout(300);

const r = await page.evaluate(({ midia, folhaPx }) => {
  const TOL = 1.5; // px — arredondamento de layout não é defeito (qa_layout)
  const M = {}, X = {};
  const visivel = (el) => {
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
  };
  // Elemento "só para leitor de tela" corta de propósito
  const srOnly = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return (r.width <= 1 && r.height <= 1) || s.clip === "rect(0px, 0px, 0px, 0px)" || s.clipPath === "inset(50%)";
  };
  const corta = (s) => {
    const o = [s.overflowX, s.overflowY];
    // Em impressão nada rola: auto/scroll também cortam o que passa
    return o.some((v) => v === "hidden" || v === "clip" || (midia === "print" && (v === "auto" || v === "scroll")));
  };

  /* ── 1 · texto que o leitor não vê ───────────────────────────── */
  const cortados = [], truncados = [];
  let charsCortados = 0, charsTotal = 0;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.textContent;
    if (!t.trim()) continue;
    const pai = n.parentElement;
    if (!pai || !visivel(pai) || ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(pai.tagName)) continue;
    range.selectNodeContents(n);
    const linhas = [...range.getClientRects()].filter((q) => q.width > 0 && q.height > 0);
    if (!linhas.length) continue;
    const nChars = t.replace(/\s/g, "").length;
    charsTotal += nChars;
    let escondidas = 0, intencional = false;
    for (const q of linhas) {
      for (let a = pai; a && a !== document.documentElement; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (!corta(s)) continue;
        if (srOnly(a)) { escondidas = -1; break; }
        const ra = a.getBoundingClientRect();
        const cx0 = ra.left + a.clientLeft, cy0 = ra.top + a.clientTop;
        const cx1 = cx0 + a.clientWidth, cy1 = cy0 + a.clientHeight;
        const fora = q.bottom > cy1 + TOL || q.top < cy0 - TOL || q.right > cx1 + TOL || q.left < cx0 - TOL;
        if (fora) {
          // Truncamento pedido (ellipsis / line-clamp) é escolha, não acidente
          // (lição do qa-visual da Mesa de Arton) — mas ainda esconde texto.
          if (s.textOverflow === "ellipsis" || s.webkitLineClamp !== "none" && s.webkitLineClamp) intencional = true;
          escondidas++;
          break;
        }
      }
      if (escondidas < 0) break;
    }
    if (escondidas > 0) {
      pai.dataset.qaCortado = "1";
      const amostra = t.trim().slice(0, 50);
      const parcela = Math.round((nChars * escondidas) / linhas.length);
      if (intencional) truncados.push(amostra);
      else { cortados.push(amostra); charsCortados += parcela; }
    }
  }
  M.texto_cortado = cortados.length;
  M.chars_cortados = charsCortados;
  M.chars_total = charsTotal;
  X.texto_cortado = cortados.slice(0, 8);
  M.texto_truncado_intencional = truncados.length;
  X.texto_truncado_intencional = truncados.slice(0, 5);

  /* ── 2 · conteúdo mais largo que a folha ─────────────────────────
     Medido em 08/10: folha de 230mm numa A4 → o Chrome REDUZ A ESCALA do
     documento inteiro (~9%) sem aviso. Só faz sentido com @page declarado;
     sem ele, não há folha para comparar → não medido.
     Mede o scrollWidth do documento com a janela JÁ na largura da folha:
     é o critério do próprio Chrome, e desconta o que um ancestral com
     overflow:hidden corta. A 1ª versão pegava o elemento mais largo e
     acusava um enfeite ("blob", 968px) que nunca alargou nada. */
  M.page_size_declarado = folhaPx?.size || null;
  if (folhaPx?.px) {
    const sw = document.documentElement.scrollWidth;
    M.excesso_largura_px = Math.max(0, sw - folhaPx.px);
    if (M.excesso_largura_px) {
      let quem = "";
      for (const el of document.body.querySelectorAll("*")) {
        if (el.getBoundingClientRect().right >= sw - 1 && visivel(el)) { quem = el.className || el.tagName; break; }
      }
      X.excesso_largura_px = [`${quem}: documento com ${sw}px numa folha de ${folhaPx.px}px`];
    }
  }

  /* ── 3 · sobreposição entre blocos de texto (regra do qa_layout) ──
     Só elementos de BLOCO e sem filho de bloco: a caixa de um <b> que
     atravessa duas linhas cobre o parágrafo inteiro e acusaria 100%.
     Limite 30% herdado do Pesquisa X (322 páginas sem falso positivo). */
  const ehBloco = (el) => ["block", "flex", "grid", "list-item", "table"].includes(getComputedStyle(el).display);
  // Bloco já contado como CORTADO fica fora: ele continua no layout por
  // baixo do rodapé, e contar a sobreposição seria o mesmo defeito 2×
  // (folha-cortada acusava 43 cortados + 1 sobreposição, 08/10).
  const folhas = [...document.body.querySelectorAll("*")].filter((el) =>
    visivel(el) && !el.dataset.qaCortado && (el.innerText || "").trim().length > 1 && ehBloco(el) && ![...el.children].some(ehBloco));
  const sobre = [];
  const caixas = folhas.map((el) => el.getBoundingClientRect());
  for (let a = 0; a < folhas.length; a++) {
    for (let b = a + 1; b < folhas.length; b++) {
      if (folhas[a].contains(folhas[b]) || folhas[b].contains(folhas[a])) continue;
      const ra = caixas[a], rb = caixas[b];
      if (rb.top > ra.bottom || ra.top > rb.bottom) continue;
      const wv = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const hv = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (wv <= 1 || hv <= 1) continue;
      const menor = Math.min(ra.width * ra.height, rb.width * rb.height) || 1;
      if ((wv * hv) / menor >= 0.30) sobre.push(`${folhas[a].innerText.trim().slice(0, 25)} × ${folhas[b].innerText.trim().slice(0, 25)}`);
    }
  }
  M.sobreposicao_de_texto = sobre.length;
  X.sobreposicao_de_texto = sobre.slice(0, 6);

  /* ── 4 · fonte que não carregou (o Chrome cai em outra calado) ── */
  const faces = [...document.fonts];
  M.fontes_declaradas = faces.length;
  M.fontes_com_erro = faces.filter((f) => f.status === "error").length;
  X.fontes_com_erro = faces.filter((f) => f.status === "error").map((f) => `${f.family} ${f.weight}`).slice(0, 6);

  /* ── 5 · imagem quebrada ─────────────────────────────────────── */
  const quebradas = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && visivel(i));
  M.imagens_quebradas = quebradas.length;
  X.imagens_quebradas = quebradas.map((i) => (i.getAttribute("src") || "").slice(0, 60)).slice(0, 6);

  /* ── 6 · lixo de template na tela (qa-visual + documento gerado) ─ */
  const txt = document.body.innerText;
  /* ── 7 · contraste (WCAG 2.x SC 1.4.3) e inventário de cores ─────
     Fundo efetivo = sobe pelos ancestrais compondo transparência até achar
     fundo opaco; sem nenhum, papel/tela branca. Fundo com IMAGEM ou
     gradiente no caminho não tem cor única → conta como NÃO MEDIDO, não
     como passou. */
  const rgba = (c) => {
    const m = String(c).match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?/);
    if (!m) return null;
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4];
    return { rgb: [+m[1], +m[2], +m[3]], a };
  };
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const razao = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
  const hex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
  const fundoDe = (el) => {
    const camadas = [];
    for (let a = el; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.backgroundImage && s.backgroundImage !== "none") return null;
      const c = rgba(s.backgroundColor);
      if (c && c.a > 0) { camadas.push(c); if (c.a >= 1) break; }
    }
    let base = [255, 255, 255];
    for (const c of camadas.reverse()) base = c.rgb.map((v, i) => v * c.a + base[i] * (1 - c.a));
    return base;
  };
  const cores = {}; // hex → {texto: chars, fundo: px²}
  const soma = (h, k, v) => { cores[h] = cores[h] || { texto: 0, fundo: 0 }; cores[h][k] += v; };
  let baixo = 0, baixoChars = 0, semFundo = 0, avaliados = 0, pior = null;
  const amostrasBaixo = [];
  const vistosEl = new Set();
  const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w2.nextNode(); n; n = w2.nextNode()) {
    const el = n.parentElement;
    const t = n.textContent.replace(/\s/g, "");
    if (!t || !el || el.dataset.qaCortado || !visivel(el) || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
    const s = getComputedStyle(el);
    const fg = rgba(s.color);
    const bg = fundoDe(el);
    if (!fg) continue;
    if (!bg) { semFundo += t.length; continue; }
    const cor = fg.rgb.map((v, i) => v * fg.a + bg[i] * (1 - fg.a));
    soma(hex(cor), "texto", t.length);
    const r = razao(cor, bg);
    const px = parseFloat(s.fontSize), peso = +s.fontWeight || 400;
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    const minimo = grande ? 3 : 4.5;
    avaliados += t.length;
    if (!pior || r < pior.r) pior = { r, txt: t.slice(0, 30) };
    if (r < minimo) {
      baixo++; baixoChars += t.length;
      if (!vistosEl.has(el)) { vistosEl.add(el); amostrasBaixo.push(`${r.toFixed(2)}:1 (mín ${minimo}) ${hex(cor)} sobre ${hex(bg)} "${n.textContent.trim().slice(0, 30)}"`); }
    }
  }
  for (const el of document.body.querySelectorAll("*")) {
    const c = rgba(getComputedStyle(el).backgroundColor);
    if (!c || c.a < 1 || !visivel(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height > 4) soma(hex(c.rgb), "fundo", Math.round(r.width * r.height));
  }
  M.contraste_abaixo_wcag = baixo;
  M.chars_contraste_abaixo_wcag = baixoChars;
  M.contraste_pior = pior ? +pior.r.toFixed(2) : null;
  M.chars_fundo_indeterminado = semFundo;
  X.contraste_abaixo_wcag = amostrasBaixo.slice(0, 6);
  M.cores_usadas = Object.entries(cores).map(([h, v]) => ({ hex: h, ...v }))
    .sort((a, b) => (b.texto * 400 + b.fundo / 100) - (a.texto * 400 + a.fundo / 100)).slice(0, 40);

  // "null" ficou de fora (08/10): o qa-visual da Mesa de Arton o caçava numa
  // UI de jogo, mas em material técnico é vocabulário (guia de NoSQL).
  const lixo = [...txt.matchAll(/(?<![\p{L}\d])(undefined|NaN|\[object Object\])(?![\p{L}\d])|\{\{[^}]*\}\}|\$\{[^}]*\}/gu)].map((m) => m[0]);
  M.lixo_de_template = lixo.length;
  X.lixo_de_template = [...new Set(lixo)].slice(0, 6);
  return { M, X };
}, { midia, folhaPx });

/* Console e rede são FOTOGRAFADOS AQUI, antes da sonda CDP abaixo.
   VEREDITO 08/10: CSS.enable faz o Chrome tentar recarregar o documento
   ("Unsafe attempt to load URL file:///…") e a fixture BOA passou a ter 1
   erro de console e 1 falha de rede — do instrumento, atribuídos à peça.
   Efeito do observador: a medida alterava o medido. */
r.M.erros_console = consoleErros.length;
r.X.erros_console = consoleErros.slice(0, 5);
r.M.falhas_de_rede = falhasRede.length;
r.X.falhas_de_rede = falhasRede.slice(0, 5);

/* ── fonte REALMENTE desenhada ─────────────────────────────────────
   A pilha do CSS diz o que foi PEDIDO; o Chrome desenha a primeira que tem
   o glifo — e cai em Segoe UI calado quando a da marca não cobre (pdf-ryze,
   armadilha 5). CSS.getPlatformFontsForNode responde o que foi desenhado.
   Um nó por combinação (família pedida, peso, estilo): custo baixo. */
{
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const ids = await page.evaluate(() => {
    const vistos = new Map();
    for (const el of document.body.querySelectorAll("*")) {
      if (![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") continue;
      const k = `${s.fontFamily}|${s.fontWeight}|${s.fontStyle}`;
      if (!vistos.has(k)) { el.dataset.qaFonte = String(vistos.size); vistos.set(k, el.textContent.trim().length); }
    }
    return vistos.size;
  });
  const desenhadas = {};
  for (let i = 0; i < ids; i++) {
    try {
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: `[data-qa-fonte="${i}"]` });
      const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
      for (const f of fonts) desenhadas[f.familyName] = (desenhadas[f.familyName] || 0) + f.glyphCount;
    } catch { /* nó sumiu: segue */ }
  }
  r.M.fontes_desenhadas = Object.entries(desenhadas).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  r.X.fontes_desenhadas = Object.entries(desenhadas).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f}: ${n} glifos (amostra)`).slice(0, 8);
}

/* --texto: grava o texto RENDERIZADO (innerText na largura da folha) para
   a checagem de cobertura contra o PDF. innerText ignora o overflow — o
   texto cortado ESTÁ aqui e não estará no PDF, que é o que se quer pegar. */
const saidaTexto = pega("--texto", null);
if (saidaTexto) fs.writeFileSync(saidaTexto, await page.evaluate(() => document.body.innerText), "utf8");

await browser.close();

/* Peça de TELA não tem folha: largura excedente "não se aplica". Peça de
   IMPRESSÃO sem @page tem folha, só não se sabe qual: "não medido".
   VEREDITO 08/10: a 1ª versão chamava as duas de não medido, e duas artes
   aprovadas do Desbravando saíram INCOMPLETO por uma checagem sem sentido. */
const naoAplica = midia === "print" ? [] : ["excesso_largura_px"];
if (r.M.excesso_largura_px === undefined) r.M.excesso_largura_px = null;
sair({ instrumento: "dom", arquivo: alvo, midia, medidas: r.M, exemplos: r.X, nao_aplica: naoAplica });
