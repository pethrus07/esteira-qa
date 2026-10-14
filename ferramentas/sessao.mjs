/* SESSÃO AO VIVO — entra nas contas de um roteiro e fica de pé recebendo
   passos (trechos de JS) por HTTP local. Serve para DESCOBRIR seletores
   antes de gravar uma jornada; não mede nem julga.
   Mesmo desenho do qa-empresa/tutoriais/reconhecimento/profundo/suite-x.mjs.

     node ferramentas/sessao.mjs sistemas/<produto>.json --contas a,b [--porta 7790]
     curl -s -H "x-conta: a" --data-binary @passo.js http://127.0.0.1:7790/
     curl -s http://127.0.0.1:7790/fim

   SEM trava de escrita: é a ferramenta do nível 2. Cada passo é escrito à
   mão e lido antes de mandar. Credencial só em memória. */
import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import { chromium } from "playwright";
import { RAIZ } from "../nucleo/ambiente.mjs";
import { credencial, liberar } from "../nucleo/credencial.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(process.env.LOCALAPPDATA || "", "ms-playwright");
const argv = process.argv.slice(2);
const opcao = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const S = JSON.parse(fs.readFileSync(argv[0], "utf8"));
const chaves = (opcao("--contas") || "").split(",").filter(Boolean);
const PORTA = Number(opcao("--porta") || 7790);
const DIR = path.join(RAIZ, "saidas", "sessao", new Date().toISOString().slice(0, 10));
fs.mkdirSync(DIR, { recursive: true });

const contas = S.contas.filter((c) => chaves.includes(c.chave));
if (!liberar()) { console.log("1Password não aprovado"); process.exit(1); }
const creds = Object.fromEntries(contas.map((c) => [c.chave, credencial(c.op)]));

/* --chrome: o Chrome INSTALADO, com janela. Para retestar achado e descartar
   artefato do headless (o Talk avisa "navegador sem suporte" ao Chromium de
   teste; 13/10). */
const browser = argv.includes("--chrome")
  ? await chromium.launch({ channel: "chrome", headless: false })
  : await chromium.launch();
const sessoes = {};
for (const c of contas) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR", acceptDownloads: true });
  const page = await ctx.newPage();
  const erros = [];
  ctx.on("page", (p) => p.on("pageerror", (e) => erros.push(String(e.message).slice(0, 160))));
  page.on("pageerror", (e) => erros.push(String(e.message).slice(0, 160)));
  await page.goto(c.entradas[0], { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {});
  const motivo = await entrar(page, creds[c.chave]);
  console.log(`${c.chave}: ${motivo || "entrou"} ${page.url()}`);
  let n = 0;
  const h = {
    async foto(nome, p = page) { const a = path.join(DIR, `${c.chave}-${String(++n).padStart(3, "0")}-${nome}.png`); await p.screenshot({ path: a, fullPage: true }).catch(() => {}); return a; },
    texto: (p = page, max = 3000) => p.evaluate((m) => (document.body?.innerText || "").replace(/\s+\n/g, "\n").slice(0, m), max),
    async acoes(p = page) {
      return p.evaluate(() => [...document.querySelectorAll("button, a, [role=button], [role=menuitem], input, textarea, [contenteditable=true]")]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
        .map((el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.name ? "[name=" + el.name + "]" : ""} «${(el.innerText || el.getAttribute("aria-label") || el.title || el.placeholder || "").replace(/\s+/g, " ").trim().slice(0, 40)}»`).slice(0, 120));
    },
    esperar: (ms) => page.waitForTimeout(ms),
    async assentar(p = page) { await p.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {}); await p.waitForTimeout(700); },
    erros: () => erros.splice(0),
    entrar: (p) => entrar(p, creds[c.chave]),
  };
  sessoes[c.chave] = { ctx, page, h };
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const srv = createServer(async (req, res) => {
  if (req.url === "/fim") { res.end("ok"); await browser.close(); srv.close(); process.exit(0); }
  let corpo = ""; for await (const x of req) corpo += x;
  const s = sessoes[req.headers["x-conta"]];
  let saida;
  if (!s) saida = { ok: false, erro: `conta ${req.headers["x-conta"]} não está na sessão` };
  else {
    try { saida = { ok: true, r: await new AsyncFunction("page", "ctx", "h", corpo)(s.page, s.ctx, s.h) }; }
    catch (e) { saida = { ok: false, erro: String(e.message).split("\n").slice(0, 4).join(" | ") }; }
    saida.url = s.page.url();
  }
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(saida, null, 1));
});
srv.listen(PORTA, "127.0.0.1", () => console.log(`SESSAO PRONTA ${PORTA}`));

async function entrar(p, { usuario, senha }) {
  const visivel = async (sel) => { for (const el of await p.locator(sel).all()) if (await el.isVisible().catch(() => false)) return el; return null; };
  const s = await visivel("input[type=password]");
  if (!s) return null;
  const u = await visivel("input[type=email], input[name=username], input[name*=user i], input[type=text]");
  await u.fill(usuario); await s.fill(senha);
  await s.press("Enter");
  await p.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await p.waitForTimeout(1500);
  return (await visivel("input[type=password]")) ? "login recusado" : null;
}
