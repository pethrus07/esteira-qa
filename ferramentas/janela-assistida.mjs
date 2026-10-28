/* JANELA ASSISTIDA — abre o Chrome instalado, com JANELA e um perfil próprio (fora do perfil
   do dia a dia, que o Chrome 136+ não deixa controlar), num endereço inicial. A pessoa faz o
   login à mão nessa janela (senha e código só ela digita); depois o assistente manda passos
   por HTTP local, e cada passo devolve o texto da tela e grava um print.

     node ferramentas/janela-assistida.mjs <url-inicial> [--perfil <nome>] [--porta 7791]
     curl -s --data-binary @passo.js http://127.0.0.1:7791/      (corpo: async (page) => {...})
     curl -s http://127.0.0.1:7791/print                          (só o print e o texto)
     curl -s http://127.0.0.1:7791/fim

   O perfil fica em ~/.janela-assistida/<nome>, fora de qualquer repositório: guarda a sessão
   logada, então é segredo. SEM trava de escrita: cada passo é escrito à mão e lido antes. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { chromium } from "playwright";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(process.env.LOCALAPPDATA || "", "ms-playwright");
const argv = process.argv.slice(2);
const opcao = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const URL0 = argv[0];
const PERFIL = path.join(os.homedir(), ".janela-assistida", opcao("--perfil") || "padrao");
const PORTA = Number(opcao("--porta") || 7791);
const DIR = path.join(os.homedir(), "Projetos", "esteira-qa", "saidas", "janela", new Date().toISOString().slice(0, 10));
fs.mkdirSync(DIR, { recursive: true });
fs.mkdirSync(PERFIL, { recursive: true });

const ctx = await chromium.launchPersistentContext(PERFIL, {
  channel: "chrome", headless: false, viewport: null, locale: "pt-BR",
  args: ["--start-maximized"],
});
let page = ctx.pages()[0] || (await ctx.newPage());
ctx.on("page", (p) => { page = p; });
await page.goto(URL0, { waitUntil: "domcontentloaded" }).catch(() => {});
let n = 0;

async function retrato(rotulo) {
  n += 1;
  const arq = path.join(DIR, `${String(n).padStart(3, "0")}-${rotulo}.png`);
  await page.screenshot({ path: arq }).catch(() => {});
  const texto = await page.evaluate(() => document.body?.innerText || "").catch(() => "");
  return { url: page.url(), print: arq, texto: texto.slice(0, 6000) };
}

createServer(async (req, res) => {
  const fim = (o) => { res.setHeader("content-type", "application/json; charset=utf-8"); res.end(JSON.stringify(o, null, 1)); };
  try {
    if (req.url === "/fim") { fim({ ok: true }); await ctx.close(); process.exit(0); }
    if (req.url === "/print") return fim(await retrato("print"));
    let corpo = ""; for await (const c of req) corpo += c;
    const passo = eval(corpo);
    const volta = await passo(page);
    await page.waitForTimeout(1500);
    fim({ volta: volta ?? null, ...(await retrato("passo")) });
  } catch (e) { fim({ erro: String(e && e.message || e), ...(await retrato("erro")) }); }
}).listen(PORTA, "127.0.0.1", () => console.log(`janela aberta em ${URL0}; passos em http://127.0.0.1:${PORTA}/`));
