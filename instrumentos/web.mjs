/* INSTRUMENTO · WEB — página no ar (ou HTML local) como o usuário a recebe
   ─────────────────────────────────────────────────────────────────────
   POR QUE EXISTE

   Erro de console foi reescrito NOVE vezes, rolagem horizontal seis, alvo
   de toque quatro (com 44, 56 e 24 px de limite). Aqui fica uma vez, com
   a norma no lugar do número de cada projeto.

     node instrumentos/web.mjs <url|pagina.html>

   O QUE MEDE, E DE ONDE VEM CADA RÉGUA
   · acessibilidade: axe-core (regras WCAG 2.x A/AA). A própria Deque mede
     que a automação cobre ~57% dos problemas por volume — zero violação NÃO
     é "acessível".
   · alvo de toque: WCAG 2.2 SC 2.5.8 (AA) = 24×24 px. O 44 é Apple HIG /
     SC 2.5.5 (AAA): informa.
   · CLS e LCP: os limites do Core Web Vitals (0,1 · 2,5 s) são do percentil
     75 de CAMPO. Em laboratório é aproximação, e LCP varia entre execuções
     — por isso a variância é medida antes de qualquer limite (LICOES).
   · rolagem horizontal no celular (390 px), erros de console, falhas de rede,
     peso transferido.

   VEREDITO HERDADO: a Wix cacheia a página no CDN; sem furar o cache o
   teste lê versão antiga e mente (qa-site, 2×). Aqui o documento vai com
   Cache-Control: no-cache — SÓ o documento: global derruba o CORS do CDN.
*/
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { chromium, devices } from "playwright";

const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const alvo = process.argv[2];
const sair = (o) => { process.stdout.write(JSON.stringify(o, null, 1)); process.exit(0); };
if (!alvo) sair({ instrumento: "web", ilegivel: "sem alvo" });
const url = /^https?:\/\//.test(alvo) ? alvo : fs.existsSync(alvo) ? pathToFileURL(path.resolve(alvo)).href : null;
if (!url) sair({ instrumento: "web", ilegivel: "arquivo não existe" });

const M = {}, X = {}, naoAplica = [];
const browser = await chromium.launch();

async function abrir(contexto) {
  const page = await contexto.newPage();
  const erros = [], rede = [], abortadas = [];
  page.on("console", (m) => { if (m.type() === "error") erros.push(m.text().slice(0, 120)); });
  page.on("pageerror", (e) => erros.push(`pageerror: ${String(e.message).slice(0, 120)}`));
  /* ERR_ABORTED = o PRÓPRIO navegador cancelou (beacon de telemetria ao
     sair, mídia lazy que mudou). Não é falha do servidor. VEREDITO 08/10: o
     site do Desbravando saiu com 9 "falhas de rede", todas telemetria da
     Wix (bulklog, frog.wix.com) abortada. Filtro pela NATUREZA do erro, não
     por lista de domínios como o qa-site.mjs antigo. */
  page.on("requestfailed", (r) => {
    const e = r.failure()?.errorText || "";
    (e.includes("ERR_ABORTED") ? abortadas : rede).push(`${e} ${r.url().slice(0, 90)}`);
  });
  page.on("response", (r) => { if (r.status() >= 400) rede.push(`${r.status()} ${r.url().slice(0, 90)}`); });
  // Observadores ANTES do carregamento: CLS e LCP acontecem durante ele
  await page.addInitScript(() => {
    window.__cls = 0; window.__lcp = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; })
      .observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; })
      .observe({ type: "largest-contentful-paint", buffered: true });
  });
  if (/^https?:/.test(url)) {
    await page.route(url, (rota) => rota.continue({ headers: { ...rota.request().headers(), "cache-control": "no-cache" } }));
  }
  let resp;
  try { resp = await page.goto(url, { waitUntil: "load", timeout: 60_000 }); }
  catch (e) { return { erro: e.message.split("\n")[0] }; }
  /* CLS DE CARREGAMENTO, lido ANTES de rolar (o usuário chega com a página
     parada). VEREDITO 08/10 — a hipótese ERRADA fica registrada: suspeitei
     que ler depois da rolagem derrubava o CLS de uma fixture (0,067); mudei
     e deu 0,067 de novo, 3×. Pela definição (impacto × distância, ambos
     RELATIVOS À JANELA), empurrar 400 px uma coluna de 720 px numa janela
     de 1440×900 dá ~0,07 mesmo. O instrumento estava certo; a fixture era
     fraca. Consequência: CLS é medido no CELULAR e no computador. */
  await page.waitForTimeout(1500);
  const clsCarga = await page.evaluate(() => window.__cls);
  // rola até o fim (a Wix e outros carregam tarde) e volta
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
  return { page, erros, rede, abortadas, status: resp?.status() ?? null, clsCarga };
}

/* ── celular: rolagem horizontal, alvo de toque ───────────────────── */
const cel = await browser.newContext({ ...devices["iPhone 13"] });
const c = await abrir(cel);
if (c.erro) { await browser.close(); sair({ instrumento: "web", arquivo: alvo, ilegivel: `não carregou: ${c.erro}` }); }
// a lição do qa-visual: largura passada solta abre em 1280; conferir a real
M.largura_celular_px = await c.page.evaluate(() => window.innerWidth);
const cm = await c.page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const largos = [];
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    if (r.right > vw + 1 && r.width > 0 && s.visibility !== "hidden" && s.position !== "fixed") largos.push(el.className || el.tagName);
  }
  // Alvo de toque: elementos interativos visíveis. SC 2.5.8 isenta alvo
  // em linha de texto (link no meio do parágrafo) — fica fora da conta.
  const peq24 = [], peq44 = [];
  for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [onclick]")) {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    if (!r.width || !r.height || s.visibility === "hidden" || s.display === "none") continue;
    const emLinha = s.display === "inline" && el.closest("p, li, td");
    if (emLinha) continue;
    // "Pular para o conteúdo" (skip link) fica 1×1 até ganhar foco: é BOA
    // prática, e o axe não o acusa. VEREDITO 08/10: o Instituto saiu com
    // 1 "alvo < 24 px" por causa dele.
    if ((r.width <= 1 && r.height <= 1) || s.clip === "rect(0px, 0px, 0px, 0px)" || s.clipPath === "inset(50%)") continue;
    const nome = (el.innerText || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 30);
    if (r.width < 24 || r.height < 24) peq24.push(`${nome} ${Math.round(r.width)}×${Math.round(r.height)}`);
    else if (r.width < 44 || r.height < 44) peq44.push(nome);
  }
  return { rolagem: document.documentElement.scrollWidth - vw, largos: [...new Set(largos)].slice(0, 6), peq24, peq44 };
});
M.rolagem_horizontal_px = Math.max(0, cm.rolagem);
X.rolagem_horizontal_px = cm.rolagem > 0 ? cm.largos : [];
M.alvos_menores_24px = cm.peq24.length;
X.alvos_menores_24px = cm.peq24.slice(0, 6);
M.alvos_menores_44px = cm.peq44.length;
await cel.close();

/* CLS NO CELULAR, numa janela COMUM de 390×844. VEREDITO 08/10: com a
   emulação de iPhone (isMobile + hasTouch) o Chromium NÃO emite layout-shift
   — lista vazia numa página que empurra tudo 600 px; janela comum de 390
   mediu 0,711. Sem hasTouch, emitiu 0,904 marcado "após input" sem input.
   Medir CLS na emulação daria ZERO para toda página, com cara de medido. */
const celCls = await browser.newContext({ viewport: { width: 390, height: 844 } });
const cc = await abrir(celCls);
M.cls_celular = cc.erro ? null : +cc.clsCarga.toFixed(3);
await celCls.close();

/* ── computador: axe, CLS, LCP, peso, console ─────────────────────── */
/* bypassCSP: o Instituto tem CSP estrita (script-src 'self') e bloqueou a
   injeção do axe — o instrumento caiu INTEIRO (08/10). Afrouxar a CSP só
   neste contexto de teste não muda o que os scripts da página fazem. */
const pc = await browser.newContext({ viewport: { width: 1440, height: 900 }, bypassCSP: true });
const d = await abrir(pc);
if (d.erro) { await browser.close(); sair({ instrumento: "web", arquivo: alvo, ilegivel: `não carregou: ${d.erro}` }); }
M.status_http = d.status;
let axe = null, erroAxe = null;
try {
  await d.page.addScriptTag({ content: AXE });
  axe = await d.page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
    return r.violations.map((v) => ({ id: v.id, impacto: v.impact, n: v.nodes.length }));
  });
} catch (e) { erroAxe = String(e.message).split("\n")[0].slice(0, 120); }
if (axe) {
  const porImpacto = (i) => axe.filter((v) => v.impacto === i).reduce((s, v) => s + v.n, 0);
  M.axe_critico = porImpacto("critical");
  M.axe_serio = porImpacto("serious");
  M.axe_moderado = porImpacto("moderate") + porImpacto("minor");
  X.axe_critico = axe.filter((v) => v.impacto === "critical").map((v) => `${v.id} ×${v.n}`);
  X.axe_serio = axe.filter((v) => v.impacto === "serious").map((v) => `${v.id} ×${v.n}`);
  X.axe_moderado = axe.filter((v) => ["moderate", "minor"].includes(v.impacto)).map((v) => `${v.id} ×${v.n}`);
} else {
  // falhou o axe: acessibilidade NÃO MEDIDA, e o resto segue medido
  M.axe_critico = M.axe_serio = M.axe_moderado = null;
  X.axe_critico = [`axe não rodou: ${erroAxe}`];
}
const perf = await d.page.evaluate(() => ({
  cls: window.__cls, lcp: window.__lcp,
  bytes: performance.getEntriesByType("resource").reduce((s, e) => s + (e.transferSize || e.encodedBodySize || 0), 0)
    + (performance.getEntriesByType("navigation")[0]?.transferSize || 0),
  req: performance.getEntriesByType("resource").length + 1,
}));
M.cls_computador = +d.clsCarga.toFixed(3);
M.cls = Math.max(M.cls_celular, M.cls_computador);
M.lcp_ms = Math.round(perf.lcp) || null;
M.peso_kb = Math.round(perf.bytes / 1024);
M.requisicoes = perf.req;
M.erros_console = d.erros.length;
X.erros_console = d.erros.slice(0, 5);
M.falhas_de_rede = d.rede.length;
X.falhas_de_rede = d.rede.slice(0, 5);
M.requisicoes_abortadas = d.abortadas.length;
if (!/^https?:/.test(url)) naoAplica.push("lcp_ms"); // file:// não tem rede: LCP não representa nada
await browser.close();
sair({ instrumento: "web", arquivo: alvo, medidas: M, exemplos: X, nao_aplica: naoAplica });
