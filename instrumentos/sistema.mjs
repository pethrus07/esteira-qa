/* INSTRUMENTO · SISTEMA — um produto logado, perfil por perfil, do que
   impede o uso até o visual
   ─────────────────────────────────────────────────────────────────────
   POR QUE EXISTE

   O `web` mede UMA página. Liberar um sistema para cliente pede outra
   pergunta: "cada perfil consegue entrar, chegar em cada tela e em cada
   app, sem tropeçar?" — e a resposta tem de vir ORDENADA PELO DANO, porque
   o time corrige de cima para baixo (pedido do Pedro, 12/10, Suíte X
   antes de ir para cliente).

     node instrumentos/sistema.mjs sistemas/<produto>.json [--contas a,b] [--saida pasta]

   CAMADAS (a ordem é a da correção)
     N0 · impede o uso      entrada fora do ar, login recusado, app do
                            lançador que não abre, tela inicial em erro/branco
     N1 · quebra tarefa     menu/atalho que cai no início ou em erro, erro de
          ou vaza permissão JavaScript, API 404/5xx, F5 que desloga, lançador
                            apontando para ambiente de teste, perfil que entra
                            onde não devia
     N2 · confiança         texto que não devia estar na tela do cliente
                            (marca antiga, `undefined`, `NaN`, nota interna)
     N3 · acessibilidade    axe-core WCAG 2.x A/AA, impacto crítico e sério
     N4 · visual            rolagem lateral no celular (390 px), imagem
                            quebrada, texto cortado
     ? · pergunta           divergência que pode ser de propósito (API 401/
                            403 numa tela que funciona): vai como pergunta,
                            não como defeito

   NÍVEL 1 = SÓ LEITURA. Trava de escrita do login ao fim: todo POST/PUT/
   PATCH/DELETE recebe 204 LOCAL (o servidor não recebe nada e a rede fica
   honesta — veredito do `web`, 09/10). Exceções: autenticação (Keycloak,
   OIDC, refresh) e leitura de WebDAV (PROPFIND/REPORT/SEARCH — em 07/10 a
   trava abortou o PROPFIND e o Drive mostrou "Failed to fetch" que NÃO era
   do produto). Tela que falha COM escrita bloqueada no mesmo intervalo sai
   como NÃO MEDIDA, nunca como defeito.

   Nunca visita link de sair/excluir/desativar nem link com token na URL
   (veredito de 09/10: GET em link de admin do WordPress EXECUTOU ação e
   deslogou a sessão no meio da bateria).

   NÃO COBRE: o que só aparece depois de gravar (enviar e-mail, subir
   arquivo, criar evento) — isso é o nível 2, com escrita autorizada;
   regra de negócio; teclado e leitor de tela (humanos); desempenho de campo.
*/
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { RAIZ } from "../nucleo/ambiente.mjs";
import { credencial, liberar } from "../nucleo/credencial.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(process.env.LOCALAPPDATA || "", "ms-playwright");
const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const argv = process.argv.slice(2);
const sair = (o) => { process.stdout.write(JSON.stringify(o, null, 1)); process.exit(0); };
const arqSistema = argv.find((a) => !a.startsWith("--") && a.endsWith(".json"));
const opcao = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
if (!arqSistema || !fs.existsSync(arqSistema)) sair({ instrumento: "sistema", ilegivel: "roteiro do sistema não existe" });
const S = JSON.parse(fs.readFileSync(arqSistema, "utf8"));
const soContas = opcao("--contas")?.split(",");
const carimbo = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const SAIDA = path.resolve(opcao("--saida") || path.join(RAIZ, "saidas", path.basename(arqSistema, ".json"), carimbo));
fs.mkdirSync(SAIDA, { recursive: true });
const log = (...a) => process.stderr.write(a.join(" ") + "\n");

const AMBIENTE_ERRADO = new RegExp(S.ambiente_errado || "-test\\.|staging|localhost", "i");
const PERIGO = /logout|log-out|signout|sign-out|\bsair\b|excluir|remover|apagar|delete|remove|desativar|deactivate|revogar|revoke|purge|expunge|_wpnonce|requesttoken|[?&](token|nonce|action)=/i;
/* COMANDO não é navegação. VEREDITO 12/10: no webmail do Suíte X o percurso
   clicou "Salvar como rascunho" (um <a href="#"> que dispara a gravação por
   JavaScript). A trava segurou o POST e nada foi salvo — mas a trava é a
   rede, não o filtro. Link de comando e link só-JavaScript ficam de fora. */
const COMANDO = /\b(salvar|save|enviar|send|responder|reply|encaminhar|forward|aplicar|apply|confirmar|confirm|criar|create|adicionar|add|importar|import|upload|enviar arquivo|compartilhar|share|mover|move|arquivar|archive|marcar|mark|bloquear|block|suspender|redefinir|reset|ativar|enable|instalar|install|imprimir|print|baixar|download|exportar|export)\b|_action=(send|save|move|delete|mark|import|upload|plugin\.)/i;
const AUTENTICACAO = /realms\/[^/]+\/protocol|openid|oidc|oauth|\/token\b|refresh|\/login|_task=login|\/auth\/|callback|\/sso\b|\/cdn-cgi\//i;
const LEITURA_DAV = ["PROPFIND", "REPORT", "SEARCH"];
const ESCRITA = ["POST", "PUT", "PATCH", "DELETE", "MKCOL", "MOVE", "COPY", "PROPPATCH", "LOCK", "UNLOCK"];
const TELA_DE_ERRO = /(erro inesperado|ocorreu um erro|algo deu errado|something went wrong|internal server error|bad gateway|service unavailable|gateway time-?out|page not found|p[aá]gina n[aã]o encontrada|404 not found|application error|failed to fetch|unexpected error|cannot (get|post) \/|n[aã]o foi poss[ií]vel carregar|erro ao carregar)/i;
const NEGADO = /(sem permiss[aã]o|acesso negado|n[aã]o autorizado|forbidden|unauthorized|n[aã]o tem acesso|access denied|permiss[aã]o insuficiente)/i;
const TROCA_DE_SENHA = /(update password|atualizar (a )?senha|alterar (a |sua )?senha|mudar (a |sua )?senha|change (your )?password|defina uma nova senha|nova senha)/i;

/* ── achados ─────────────────────────────────────────────────────── */
const NIVEIS = {
  N0: "impede o uso", N1: "quebra tarefa ou vaza permissão", N2: "confiança",
  N3: "acessibilidade (WCAG A/AA)", N4: "visual", "?": "pergunta (pode ser de propósito)",
};
const achados = new Map();
const ordem = ["N0", "N1", "N2", "N3", "N4", "?"];
let lista = [], M = {};
const quantos = (n) => lista.filter((a) => a.nivel === n).length;
const naoMedido = [];
const resumoContas = [];
function achar(nivel, tipo, detalhe, { conta, tela, evidencia, extra } = {}) {
  const chave = `${nivel}|${tipo}|${detalhe}`;
  const a = achados.get(chave) || { nivel, tipo, detalhe, contas: new Set(), telas: [], evidencias: [], extra: [] };
  if (conta) a.contas.add(conta);
  if (tela && !a.telas.includes(tela) && a.telas.length < 6) a.telas.push(tela);
  if (evidencia && a.evidencias.length < 3 && !a.evidencias.includes(evidencia)) a.evidencias.push(evidencia);
  if (extra && a.extra.length < 3 && !a.extra.includes(extra)) a.extra.push(extra);
  achados.set(chave, a);
}
// ids, uuids e e-mails viram marcador: a mesma API em telas diferentes é UM achado
const normalizarUrl = (u) => {
  try {
    const x = new URL(u);
    return `${x.host}${x.pathname}`.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
      .replace(/\/\d+(?=\/|$)/g, "/:n").replace(/[^/]+(@|%40)[^/]+/g, ":email");
  } catch { return u.slice(0, 100); }
};

/* ── credenciais: todas de uma vez, antes de abrir o navegador ───── */
const contas = S.contas.filter((c) => !soContas || soContas.includes(c.chave));
const creds = {};
if (contas.some((c) => !c.credencial_fixture) && !liberar())
  log("   ✗ 1Password não aprovado em 5 min — as contas vão sair como não medidas");
for (const c of contas) {
  // `credencial_fixture` só existe nos roteiros de teste (fixtures/sistema): senha falsa de servidor local
  try { creds[c.chave] = c.credencial_fixture || credencial(c.op); }
  catch (e) { naoMedido.push({ conta: c.chave, o_que: "a conta inteira", porque: e.message }); }
}

const browser = await chromium.launch();

async function rodarConta(conta) {
  if (!creds[conta.chave]) return;
  const R = { conta: conta.chave, papel: conta.papel, entradas: [], telas: 0, apps: [], relogins: 0 };
  resumoContas.push(R);
  const dir = path.join(SAIDA, conta.chave);
  fs.mkdirSync(dir, { recursive: true });
  log(`\n── ${conta.chave} (${conta.papel})`);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR", bypassCSP: true });
  const eventos = [];   // rede, js, console, escrita bloqueada — por ordem
  /* Trava ligada DESDE O PRIMEIRO CARREGAMENTO, com a autenticação liberada.
     VEREDITO 12/10 (fixture): ligada só depois do login, deixou passar o POST
     que a tela inicial dispara ao abrir — em produção, gravação de verdade. */
  await ctx.route("**/*", (rota) => {
    const req = rota.request(), m = req.method();
    if (!ESCRITA.includes(m) || AUTENTICACAO.test(req.url())) return rota.continue();
    eventos.push({ tipo: "bloqueada", txt: `${m} ${normalizarUrl(req.url())}` });
    return rota.fulfill({ status: 204, body: "" });
  });
  const vigiar = (p) => {
    p.on("pageerror", (e) => eventos.push({ tipo: "js", txt: String(e.message).split("\n")[0].slice(0, 160), url: p.url() }));
    // "Failed to load resource" é o eco da resposta de rede, que já é medida
    p.on("console", (m) => {
      if (m.type() !== "error" || /^Failed to load resource/.test(m.text())) return;
      /* O veredito do PRÓPRIO navegador: "Refused to apply style/execute
         script … MIME type". VEREDITO 12/10: no Tarefas do Suíte X a checagem
         pela resposta de rede (que pega a fixture) não disparou em produção —
         o CSS saiu como N4 "erro no console" pela segunda vez. */
      const recusa = m.text().match(/Refused to (apply style|execute script) from '([^']+)'.*MIME type/);
      if (recusa) return eventos.push({ tipo: "arquivo", txt: `${recusa[1] === "apply style" ? "CSS" : "JS"} ${normalizarUrl(recusa[2])} (veio HTML)` });
      eventos.push({ tipo: "console", txt: m.text().slice(0, 160) });
    });
    p.on("response", (r) => {
      const t = r.request().resourceType(), s = r.status();
      /* CSS/JS do próprio app que não vem, ou vem como página HTML: o app
         abre sem estilo ou sem código. VEREDITO 12/10: no Tarefas do Suíte X o
         CSS voltava text/html e só aparecia como "erro no console" (N4). */
      if (["stylesheet", "script"].includes(t)) {
        const tipo = (r.headers()["content-type"] || "").toLowerCase();
        if (s >= 400 || tipo.includes("text/html"))
          eventos.push({ tipo: "arquivo", status: s, txt: `${t === "script" ? "JS" : "CSS"} ${normalizarUrl(r.url())} (${s >= 400 ? s : "veio HTML"})` });
        return;
      }
      if (s < 400 || !["document", "xhr", "fetch"].includes(t)) return;
      if (LEITURA_DAV.includes(r.request().method()) && s === 404) return;
      eventos.push({ tipo: "http", status: s, recurso: t, txt: `${r.request().method()} ${normalizarUrl(r.url())}` });
    });
    p.on("requestfailed", (r) => {
      const e = r.failure()?.errorText || "";
      if (e.includes("ERR_ABORTED")) return;
      eventos.push({ tipo: "falha", txt: `${e} ${normalizarUrl(r.url())}`, recurso: r.request().resourceType() });
    });
  };
  ctx.on("page", vigiar);
  const page = await ctx.newPage();

  let nFoto = 0;
  const foto = async (p, nome) => {
    const arq = `${String(++nFoto).padStart(3, "0")}-${nome.replace(/[^\w-]+/g, "-").slice(0, 50)}.png`;
    await p.screenshot({ path: path.join(dir, arq), fullPage: true, timeout: 15_000 }).catch(() => {});
    return `${conta.chave}/${arq}`;
  };

  /* uma tela, medida inteira. `janela` = eventos desde o início da visita */
  async function medir(p, rotulo, inicio, { tipoTela = "tela", esperado = null } = {}) {
    await assentar(p);
    const url = p.url();
    const ev = eventos.slice(inicio);
    const bloqueadas = ev.filter((e) => e.tipo === "bloqueada");
    const ev2 = await p.evaluate(({ termos, erroRe }) => {
      const vis = (el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
      const texto = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
      const achadosTermo = [];
      for (const t of termos) {
        const re = /^[\w\s]+$/.test(t) && t.length <= 12
          ? new RegExp(`\\b${t}\\b`, t === "NaN" || t === "TODO" || t === "FIXME" ? "" : "i")
          : new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const m = texto.match(re) || (document.title.match(re) ? [document.title] : null);
        if (m) {
          const i = texto.search(re);
          achadosTermo.push({ termo: t, contexto: i >= 0 ? texto.slice(Math.max(0, i - 40), i + t.length + 40) : `título: ${document.title}` });
        }
      }
      const imgs = [...document.images].filter((i) => vis(i) && i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith("data:"))
        .map((i) => i.src.slice(0, 100));
      // texto cortado por overflow sem reticências pedidas (o `dom` faz isto no documento)
      const cortados = [];
      for (const el of document.body?.querySelectorAll("*") || []) {
        if (cortados.length >= 8) break;
        const s = getComputedStyle(el);
        if (!/hidden|clip/.test(s.overflowX + s.overflowY) || !vis(el)) continue;
        if (s.textOverflow === "ellipsis" || (s.webkitLineClamp && s.webkitLineClamp !== "none")) continue;
        /* texto só para leitor de tela (.hidden-visually, sr-only: 1×1 com clip)
           é BOA prática. VEREDITO 12/10: no Nextcloud do Suíte X, 25 de 26
           "textos cortados" eram isso — "Todos os arquivos", "Recentes"… */
        const r = el.getBoundingClientRect();
        if (r.width <= 2 || r.height <= 2 || (s.clip && s.clip !== "auto") || /inset|polygon/.test(s.clipPath)) continue;
        if (s.position === "absolute" && r.width * r.height <= 16) continue;
        const proprio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);
        if (!proprio) continue;
        if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 4)
          cortados.push((el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 50));
      }
      const senha = [...document.querySelectorAll("input[type=password]")].some(vis);
      const h = [...document.querySelectorAll("h1, h2")].find(vis);
      return { titulo: document.title, cabecalho: h ? h.innerText.trim().slice(0, 60) : "", tamanhoTexto: texto.length,
        erro: (texto.match(new RegExp(`.{0,40}${erroRe}.{0,40}`, "i")) || [null])[0],
        termos: achadosTermo, imgs, cortados, senha, novaSenha: !!document.querySelector("input[name=password-new], input[name=passwordNew], #password-new") };
    }, { termos: S.termos_proibidos || [], erroRe: TELA_DE_ERRO.source }).catch((e) => ({ falhou: String(e.message).split("\n")[0] }));
    if (ev2.falhou) { naoMedido.push({ conta: conta.chave, o_que: rotulo, porque: `não deu para ler a tela (${ev2.falhou})` }); return null; }

    const evid = await foto(p, rotulo);
    R.telas++;
    const onde = `${rotulo} (${curto(url)})`;
    const contaCom = { conta: conta.chave, tela: onde, evidencia: evid };
    const culpaDaTrava = bloqueadas.length > 0;
    const naLogin = ev2.senha || /\/realms\/|_task=login|\/login\b/i.test(url);

    // camada N0/N1 — a tela não serve
    const vazia = ev2.tamanhoTexto < 15;
    if (ev2.erro || vazia) {
      if (culpaDaTrava) naoMedido.push({ conta: conta.chave, o_que: onde, porque: `tela em erro com ${bloqueadas.length} escrita(s) bloqueada(s) pela trava: ${bloqueadas.slice(0, 2).map((b) => b.txt).join(" · ")}` });
      else achar(["entrada", "app"].includes(tipoTela) ? "N0" : "N1", vazia ? "Tela em branco" : "Tela mostra erro",
        vazia ? rotulo : `"${ev2.erro.trim()}"`, contaCom);
    }
    if (esperado && !naLogin) {
      // /security → /security/two-factor é redirecionamento legítimo; cair no
      // início é o defeito de 07/10 (atalhos que "voltam para o Painel")
      const alvo = caminho(esperado), real = caminho(url);
      const pouso = pousos.get(new URL(url).origin);
      // link para a raiz ("/") que pousa na tela inicial é o comportamento certo
      if (alvo !== "/" && alvo !== real && !real.startsWith(alvo + "/")) {
        if (real === pouso || real === "/") achar("N1", "Link cai na tela inicial, sem aviso", `${alvo} → ${real}`, contaCom);
        else achar("?", "Link leva a outra tela que a do endereço dele", `${alvo} → ${real}`, contaCom);
      }
    }
    // eventos da janela
    for (const e of ev) {
      if (e.tipo === "js") achar("N1", "Erro de JavaScript na tela", e.txt, contaCom);
      else if (e.tipo === "http" && e.recurso === "document" && e.status >= 500) achar(["entrada", "app"].includes(tipoTela) ? "N0" : "N1", "Servidor devolveu erro na página", `${e.status} ${e.txt}`, contaCom);
      else if (e.tipo === "http" && e.status >= 500) achar("N1", "API com erro do servidor (5xx)", `${e.status} ${e.txt}`, contaCom);
      else if (e.tipo === "arquivo") achar("N1", "Arquivo do app (CSS/JS) não carregou", e.txt.replace(/^(CSS|JS) [^/]+/, "$1 "), contaCom);
      /* API 404 numa tela que ABRIU: pergunta, não defeito. VEREDITO 12/10:
         o user_status do Nextcloud dá 404 em todo app do Suíte X e as telas
         funcionam (módulo desligado?). Com a tela em erro, aí é N1. */
      else if (e.tipo === "http" && e.status === 404) achar(ev2.erro || vazia ? "N1" : "?", ev2.erro || vazia ? "Recurso não encontrado (404)" : "API 404 numa tela que abriu", e.txt.replace(/^(\w+) [^/]+/, "$1 "), contaCom);
      else if (e.tipo === "http" && [401, 403].includes(e.status)) achar("?", "API recusou o pedido (401/403) numa tela que abriu", `${e.status} ${e.txt}`, contaCom);
      else if (e.tipo === "http") achar("N1", `API respondeu ${e.status}`, e.txt, contaCom);
      else if (e.tipo === "falha" && ["document", "xhr", "fetch", "script", "stylesheet"].includes(e.recurso)) achar("N1", "Pedido de rede falhou", e.txt, contaCom);
      else if (e.tipo === "console") achar("N4", "Erro no console", e.txt, contaCom);
    }
    // N2 — confiança
    for (const t of ev2.termos) achar("N2", "Texto que não devia estar na tela do cliente", t.termo, { ...contaCom, extra: `…${t.contexto}…` });
    if (AMBIENTE_ERRADO.test(new URL(url).host)) achar("N1", "Produção levou a ambiente de teste", new URL(url).host, contaCom);
    // N4 — visual
    for (const s of ev2.imgs) achar("N4", "Imagem quebrada", normalizarUrl(s), contaCom);
    for (const c of ev2.cortados) achar("N4", "Texto cortado (sem reticências)", `"${c}"`, contaCom);
    // N3 — axe
    try {
      if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ content: AXE });
      const v = await p.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
        return r.violations.filter((x) => ["critical", "serious"].includes(x.impact))
          .map((x) => ({ id: x.id, imp: x.impact, n: x.nodes.length, ex: x.nodes[0]?.target?.join(" ").slice(0, 80) }));
      });
      for (const x of v) achar("N3", `axe: ${x.id} (${x.imp === "critical" ? "crítico" : "sério"})`, x.id, { ...contaCom, extra: `${x.n} elemento(s), ex.: ${x.ex}` });
    } catch (e) { naoMedido.push({ conta: conta.chave, o_que: `acessibilidade de ${onde}`, porque: `axe não rodou (${String(e.message).split("\n")[0].slice(0, 80)})` }); }
    // N4 — celular (janela comum de 390, como no `web`)
    try {
      await p.setViewportSize({ width: 390, height: 844 });
      await p.waitForTimeout(500);
      const lat = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const largos = [...document.body.querySelectorAll("*")].filter((el) => {
          const r = el.getBoundingClientRect(), s = getComputedStyle(el);
          return r.right > vw + 1 && r.width > 0 && s.visibility !== "hidden" && s.position !== "fixed";
        }).slice(0, 3).map((el) => (el.getAttribute("aria-label") || el.innerText || el.tagName).replace(/\s+/g, " ").trim().slice(0, 30));
        /* VEREDITO 13/10: o Nextcloud do Suíte X transborda no <body> (464–488 px)
           com o <html> em 390 — medir só o <html> deu 0 e escondeu que o avatar
           (onde fica o "Sair") e a grade de apps caem FORA da tela no celular. */
        const px = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw;
        const foraDeAlcance = [...document.querySelectorAll("a[href], button, [role=button], [role=menuitem]")].filter((el) => {
          const r = el.getBoundingClientRect(), s = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && r.left >= vw - 1 && s.visibility !== "hidden";
        }).map((el) => (el.getAttribute("aria-label") || el.innerText || el.tagName).replace(/\s+/g, " ").trim().slice(0, 30));
        return { px, largos, foraDeAlcance: [...new Set(foraDeAlcance)].slice(0, 4) };
      });
      if (lat.px > 0 || lat.foraDeAlcance.length) {
        const ev390 = await foto(p, `${rotulo}-celular`);
        if (lat.px > 0) achar("N4", "Rola de lado no celular (390 px)", rotulo, { conta: conta.chave, tela: onde, evidencia: ev390, extra: `${lat.px} px a mais; ${lat.largos.join(" · ")}` });
        if (lat.foraDeAlcance.length) achar("N4", "Botão fora da tela no celular (inalcançável)", lat.foraDeAlcance.join(" · "), { conta: conta.chave, tela: onde, evidencia: ev390 });
      }
    } catch { /* tela mudou durante a medida: o resto já foi medido */ }
    await p.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
    log(`   [${conta.chave}] ${rotulo.padEnd(34)} ${curto(url)}${culpaDaTrava ? `  [${bloqueadas.length} escrita(s) bloqueada(s)]` : ""}`);
    return { ...ev2, url };
  }

  /* ── entrar: login, troca de senha obrigatória, trava ─────────── */
  async function entrar(p, url) {
    const inicio = eventos.length, t0 = Date.now();
    let resp;
    try { resp = await p.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 }); }
    catch (e) { return { ok: false, nivel: "N0", motivo: `não carregou: ${String(e.message).split("\n")[0].slice(0, 120)}` }; }
    if (resp && resp.status() >= 500) return { ok: false, nivel: "N0", motivo: `servidor respondeu ${resp.status()}` };
    await assentar(p);
    const motivo = await login(p, creds[conta.chave]);
    if (motivo === "TROCA_DE_SENHA") {
      return { ok: false, troca: true, motivo: "a conta exige trocar a senha no primeiro acesso" };
    }
    const seguradas = eventos.slice(inicio).filter((e) => e.tipo === "bloqueada");
    if (motivo && seguradas.length) return { ok: false, trava: true, motivo: `a trava segurou o login (${seguradas[0].txt}) — ampliar AUTENTICACAO` };
    if (motivo) return { ok: false, nivel: "N0", motivo, inicio };
    return { ok: true, ms: Date.now() - t0, inicio };
  }

  async function login(p, { usuario, senha }) {
    const visivel = async (sel) => { for (const el of await p.locator(sel).all()) if (await el.isVisible().catch(() => false)) return el; return null; };
    let campoSenha = await visivel("input[type=password]");
    if (!campoSenha) {
      // já logado (SSO) ou tela com botão que leva ao login único
      const botao = p.getByRole("link", { name: /entrar|login|acessar|sign in|keycloak|sso/i })
        .or(p.getByRole("button", { name: /entrar|login|acessar|sign in|keycloak|sso/i })).first();
      if (await botao.isVisible().catch(() => false)) { await botao.click().catch(() => {}); await assentar(p); }
      campoSenha = await visivel("input[type=password]");
      if (!campoSenha) return null;
    }
    const campoUsuario = await visivel("input[type=email], input[name=username], input[name*=user i], input[name*=email i], input[id*=user i], input[id*=email i], input[type=text]");
    if (!campoUsuario) return "tela de login sem campo de usuário";
    await campoUsuario.fill(usuario);
    if (!(await campoSenha.isVisible())) { await p.keyboard.press("Enter"); await p.waitForTimeout(1500); campoSenha = await visivel("input[type=password]"); }
    await campoSenha.fill(senha);
    const antes = p.url();
    await campoSenha.press("Enter");
    for (let t = 0; t < 40; t++) {
      await p.waitForTimeout(500);
      if (p.url() !== antes && !(await visivel("input[type=password]"))) break;
      if (await p.locator("input[name=password-new], #password-new").first().isVisible().catch(() => false)) break;
    }
    await assentar(p);
    const corpo = await p.evaluate(() => document.body?.innerText || "").catch(() => "");
    if (await p.locator("input[name=password-new], #password-new").first().isVisible().catch(() => false)
      || (/\/realms\//.test(p.url()) && TROCA_DE_SENHA.test(corpo))) return "TROCA_DE_SENHA";
    if (await visivel("input[type=password]")) {
      const msg = await p.locator("[role=alert], .alert, #input-error, .kc-feedback-text, [class*=error i]").allInnerTexts().catch(() => []);
      return `login recusado${msg.length ? `: "${msg.join(" ").replace(/\s+/g, " ").trim().slice(0, 120)}"` : ""}`;
    }
    return null;
  }

  /* ── links da tela: menu, conteúdo e lançador de apps ─────────── */
  async function links(p, { expandir = true } = {}) {
    // abre grupos recolhidos do menu (o mesmo cuidado do qa-empresa/nav.mjs)
    if (expandir) for (const el of await p.locator("nav [aria-expanded=false]:not([aria-haspopup]), aside [aria-expanded=false]:not([aria-haspopup]), [data-sidebar] [data-state=closed]:not([aria-haspopup])").all()) {
      const nome = (await el.innerText().catch(() => "")).trim();
      if (/toggle|sair|@/i.test(nome)) continue;
      await el.click({ timeout: 1500 }).catch(() => {});
      await p.waitForTimeout(150);
    }
    return p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return [...document.querySelectorAll("a[href]")].filter(vis).map((a) => ({
        href: a.href, cru: (a.getAttribute("href") || "").trim(), alvoNovo: a.target === "_blank", texto: (a.innerText || a.getAttribute("aria-label") || a.title || "").replace(/\s+/g, " ").trim().slice(0, 50),
        menu: !!a.closest("nav, aside, [role=navigation], [data-sidebar]"),
      }));
    }).catch(() => []);
  }
  // o botão de grade que abre os apps ("Aplicativos" no painel, 07/10)
  async function lancador(p) {
    const nome = /^(aplicativos|apps|app launcher|lan[cç]ador( de apps)?|menu de aplicativos|todos os apps)$/i;
    const b = p.getByRole("button", { name: nome }).or(p.getByRole("link", { name: nome })).first();
    if (!(await b.isVisible().catch(() => false))) return [];
    await b.click({ timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(800);
    const ls = await links(p, { expandir: false });
    await p.keyboard.press("Escape").catch(() => {});
    return ls.map((l) => ({ ...l, lancador: true }));
  }

  /* ── percorre uma origem: menu + atalhos da tela, só por clique ─── */
  async function percorrer(p, origem, rotuloBase, limite) {
    const vistos = new Set([caminhoComBusca(p.url())]);
    const fila = [];
    const enfileirar = (ls, de) => {
      for (const l of ls) {
        if (!l.href.startsWith(origem) || PERIGO.test(l.href) || PERIGO.test(l.texto)) continue;
        if (!l.cru || l.cru.startsWith("#") || /^javascript:/i.test(l.cru) || COMANDO.test(l.texto) || COMANDO.test(l.href)) continue;
        const c = caminhoComBusca(l.href);
        if (vistos.has(c) || fila.some((f) => caminhoComBusca(f.href) === c)) continue;
        /* VEREDITO 12/10: Contatos, Tarefas, Forms, News… são o MESMO Nextcloud
           em hosts diferentes, e cada um repetia as ~10 telas de Configurações.
           Caminho já medido em OUTRO app desta conta não é medido de novo. */
        const k = caminhoGenerico(l.href);
        if (rotuloBase.startsWith("app ") && telasDeApp.has(k) && telasDeApp.get(k) !== origem) { pulados++; continue; }
        fila.push({ ...l, de });
      }
    };
    enfileirar(await links(p), "início");
    let n = 0;
    while (fila.length && n < limite) {
      const alvo = fila.shift();
      if (rotuloBase.startsWith("app ")) telasDeApp.set(caminhoGenerico(alvo.href), origem);
      vistos.add(caminhoComBusca(alvo.href));
      n++;
      const inicio = eventos.length;
      const rel = alvo.href.slice(origem.length) || "/";
      let loc = p.locator(`a[href="${rel}"], a[href="${alvo.href}"]`).filter({ visible: true }).first();
      if (!(await loc.isVisible().catch(() => false))) {
        await links(p);  // abre o menu de novo
        loc = p.locator(`a[href="${rel}"], a[href="${alvo.href}"]`).filter({ visible: true }).first();
      }
      let via = "clique";
      if (await loc.isVisible().catch(() => false)) await loc.click({ timeout: 5000 }).catch(() => {});
      else { via = "endereço"; await p.goto(alvo.href, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {}); }
      await assentar(p);
      if (await caiuNoLogin(p)) {
        achar(via === "clique" ? "N0" : "N1", via === "clique" ? "Sessão caiu durante o uso" : "Abrir um endereço direto (favorito, link colado) pede login de novo",
          via === "clique" ? `${alvo.texto || rel} (${rel})` : curto(origem), { conta: conta.chave, tela: `${rotuloBase} › ${alvo.texto || rel}`, evidencia: await foto(p, `caiu-${alvo.texto || rel}`) });
        R.relogins++;
        const r = await entrar(p, origem);
        if (!r.ok) return;
        continue;
      }
      const m = await medir(p, `${rotuloBase} › ${alvo.texto || rel}`, inicio, { esperado: alvo.href });
      if (m) enfileirar(await links(p), alvo.texto);
    }
    if (fila.length) naoMedido.push({ conta: conta.chave, o_que: `${fila.length} link(s) de ${rotuloBase} além do limite de ${limite} telas`, porque: "nível 1 é amostra; aumentar max_telas_por_origem" });
  }

  /* ── 1. cada entrada ───────────────────────────────────────────── */
  const appsVistos = new Map();
  const pousos = new Map();
  const telasDeApp = new Map();   // caminho genérico → origem onde foi medido
  let pulados = 0;   // origem → caminho onde o login pousa (a "tela inicial")
  for (const url of conta.entradas) {
    const origem = new URL(url).origin;
    const e = await entrar(page, url);
    R.entradas.push({ url, ok: e.ok, ms: e.ms, motivo: e.motivo });
    if (e.troca) {
      naoMedido.push({ conta: conta.chave, o_que: `tudo depois do login em ${curto(url)}`, porque: e.motivo + " — trocar exige escrita e atualizar o cofre: decisão do Pedro" });
      await foto(page, "troca-de-senha");
      break;
    }
    if (e.trava) { naoMedido.push({ conta: conta.chave, o_que: `login em ${curto(url)}`, porque: e.motivo }); continue; }
    if (!e.ok) { achar("N0", "Não consegue entrar", `${curto(url)} — ${e.motivo}`, { conta: conta.chave, tela: curto(url), evidencia: await foto(page, `entrada-falhou-${new URL(url).host}`) }); continue; }
    log(`   [${conta.chave}] entrou em ${curto(url)} (${(e.ms / 1000).toFixed(1)} s)`);
    pousos.set(new URL(page.url()).origin, caminho(page.url()));
    await medir(page, `${new URL(url).host} · início`, e.inicio, { tipoTela: "entrada" });
    for (const l of [...await lancador(page), ...await links(page)]) {
      let u; try { u = new URL(l.href); } catch { continue; }
      if (u.origin === origem || !/^https?:$/.test(u.protocol) || PERIGO.test(l.href)) continue;
      const doProduto = u.host.endsWith(S.dominio_do_produto) || AMBIENTE_ERRADO.test(u.host);
      if (!doProduto) continue;
      const k = `${u.origin}${u.pathname}`;
      if (!appsVistos.has(k)) appsVistos.set(k, { href: l.href, nome: l.texto || u.host, de: curto(url), lancador: !!l.lancador });
    }
    await percorrer(page, origem, new URL(url).host, S.max_telas_por_origem || 40);
    // F5 por último: se deslogar, é achado (e a sessão desta origem acaba aqui)
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    await assentar(page);
    if (await caiuNoLogin(page)) {
      achar("N1", "Recarregar a página (F5) desloga", curto(url), { conta: conta.chave, tela: curto(url), evidencia: await foto(page, `f5-${new URL(url).host}`) });
      R.relogins++;
    }
  }

  /* ── 2. cada app do lançador, no mesmo navegador (login único) ─── */
  for (const [, app] of appsVistos) {
    const p = await ctx.newPage();
    const inicio = eventos.length, t0 = Date.now();
    const host = new URL(app.href).host;
    const reg = { nome: app.nome, href: app.href, host };
    R.apps.push(reg);
    if (AMBIENTE_ERRADO.test(host)) achar("N1", "Lançador de produção aponta para ambiente de teste", `${app.nome} → ${host}`, { conta: conta.chave, tela: `lançador (${app.de})` });
    let resp = null;
    try { resp = await p.goto(app.href, { waitUntil: "domcontentloaded", timeout: 45_000 }); }
    catch (e) {
      reg.estado = "não carregou";
      achar("N0", "App do lançador não abre", `${app.nome} (${host}) — ${String(e.message).split("\n")[0].slice(0, 80)}`, { conta: conta.chave, tela: app.nome, evidencia: await foto(p, `app-${app.nome}`) });
      await p.close(); continue;
    }
    await assentar(p);
    if (await caiuNoLogin(p)) {
      // o login único não levou a sessão: tenta entrar com a mesma conta
      const motivo = await login(p, creds[conta.chave]);
      if (motivo) {
        reg.estado = "login recusado";
        achar("N0", "App do lançador não deixa entrar", `${app.nome} (${host}) — ${motivo === "TROCA_DE_SENHA" ? "pede troca de senha" : motivo}`, { conta: conta.chave, tela: app.nome, evidencia: await foto(p, `app-${app.nome}-login`) });
        await p.close(); continue;
      }
      achar("N1", "App pede login de novo (o login único não levou a sessão)", `${app.nome} (${host})`, { conta: conta.chave, tela: app.nome });
    }
    reg.ms = Date.now() - t0;
    reg.status = resp?.status();
    pousos.set(new URL(p.url()).origin, caminho(p.url()));
    const m = await medir(p, `app ${app.nome}`, inicio, { tipoTela: "app" });
    reg.estado = m ? (m.erro ? "erro" : "abriu") : "não medido";
    if (m) await percorrer(p, new URL(p.url()).origin, `app ${app.nome}`, Math.min(12, S.max_telas_por_origem || 40));
    await p.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    await assentar(p);
    if (await caiuNoLogin(p)) achar("N1", "Recarregar a página (F5) desloga", `app ${app.nome}`, { conta: conta.chave, tela: app.nome });
    await p.close();
  }
  // app que o produto anuncia e o lançador desta conta não mostrou
  if (S.apps_esperados?.length && appsVistos.size) {
    const nomes = [...appsVistos.values()].map((a) => `${a.nome} ${a.host || ""} ${a.href}`.toLowerCase()).join(" ");
    const faltam = S.apps_esperados.filter((n) => !nomes.includes(n.toLowerCase()));
    if (faltam.length) achar("?", "App esperado não aparece no lançador", faltam.join(", "), { conta: conta.chave });
  } else if (S.apps_esperados?.length) {
    naoMedido.push({ conta: conta.chave, o_que: "lançador de apps", porque: "nenhum link para outro app do produto foi achado nas entradas" });
  }

  /* ── 3. onde este perfil NÃO deve entrar ───────────────────────── */
  /* `deve_negar`: { url, marcas } — `marcas` é o que SÓ quem tem o papel vê
     (itens do menu de admin). Abrir a página não basta para acusar.
     VEREDITO 12/10: admin.suite-x.example é TAMBÉM o app "Conta" do usuário
     comum (Minha conta, Armazenamento); acusei vazamento onde não havia. */
  for (const alvoNegar of conta.deve_negar || []) {
    const { url, marcas } = typeof alvoNegar === "string" ? { url: alvoNegar } : alvoNegar;
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => {});
    await assentar(p);
    if (await caiuNoLogin(p)) {
      const motivo = await login(p, creds[conta.chave]);
      await assentar(p);
      if (motivo) { R.negado = { url, como: "login recusado" }; await p.close(); continue; }
    }
    const corpo = await p.evaluate(() => document.body?.innerText || "").catch(() => "");
    const ev = await foto(p, `deve-negar-${new URL(url).host}`);
    const vazou = marcas ? (corpo.match(new RegExp(marcas, "i")) || [null])[0] : null;
    if (NEGADO.test(corpo) || await caiuNoLogin(p)) R.negado = { url, como: "negado" };
    else if (marcas && !vazou) R.negado = { url, como: "abre, sem nada de admin" };
    else if (vazou) achar("N1", "Perfil vê o que não devia", `${conta.papel} vê "${vazou}" em ${curto(url)}`, { conta: conta.chave, tela: curto(url), evidencia: ev });
    else achar("N1", "Perfil entra onde não devia", `${conta.papel} abriu ${curto(url)} — tela "${corpo.replace(/\s+/g, " ").trim().slice(0, 60)}"`, { conta: conta.chave, tela: curto(url), evidencia: ev });
    await p.close();
  }

  R.telas_repetidas_puladas = pulados;
  R.escritas_bloqueadas = eventos.filter((e) => e.tipo === "bloqueada").length;
  R.escritas_exemplos = [...new Set(eventos.filter((e) => e.tipo === "bloqueada").map((e) => e.txt))].slice(0, 8);
  await ctx.close();
  gravar();   // relatório parcial a cada conta: corte no meio não perde a rodada
}

/* Perfis em PARALELO, um contexto cada. VEREDITO 12/10: em série, os três
   perfis do Suíte X passaram dos 40 min do qa.mjs; o processo foi morto no app
   Agenda do 2º perfil e, como o relatório só era gravado no fim, ~200 telas
   medidas se perderam. Agora: paralelo + gravação a cada conta. */
await Promise.all(contas.map((c) => rodarConta(c).catch((e) => {
  naoMedido.push({ conta: c.chave, o_que: "o resto da conta", porque: `o instrumento caiu: ${String(e.message).split("\n")[0].slice(0, 120)}` });
})));
await browser.close();

/* ── boletim ─────────────────────────────────────────────────────── */
const fim = gravar(true);
sair({ instrumento: "sistema", arquivo: arqSistema, saida: SAIDA, medidas: fim.M, exemplos: fim.X, nao_aplica: [] });

function gravar(final = false) {
lista = [...achados.values()].map((a) => ({ ...a, contas: [...a.contas] }));
lista.sort((x, y) => ordem.indexOf(x.nivel) - ordem.indexOf(y.nivel) || y.telas.length - x.telas.length);
M = {
  n0_impede_uso: quantos("N0"), n1_quebra_tarefa: quantos("N1"), n2_confianca: quantos("N2"),
  n3_acessibilidade: quantos("N3"), n4_visual: quantos("N4"), perguntas: quantos("?"),
  contas_medidas: resumoContas.length || null, telas_medidas: resumoContas.reduce((s, r) => s + r.telas, 0),
  nao_medido: naoMedido.length, escritas_bloqueadas: resumoContas.reduce((s, r) => s + (r.escritas_bloqueadas || 0), 0),
};
const X = Object.fromEntries(ordem.map((n) => [n, lista.filter((a) => a.nivel === n).slice(0, 5).map((a) => `${a.tipo}: ${a.detalhe}`)]));
const chave = { N0: "n0_impede_uso", N1: "n1_quebra_tarefa", N2: "n2_confianca", N3: "n3_acessibilidade", N4: "n4_visual", "?": "perguntas" };
for (const n of ordem) X[chave[n]] = X[n], delete X[n];
X.nao_medido = naoMedido.slice(0, 5).map((x) => `${x.conta}: ${x.o_que}`);
fs.writeFileSync(path.join(SAIDA, "achados.json"), JSON.stringify({ sistema: S.nome, quando: new Date().toISOString(), final, medidas: M, contas: resumoContas, achados: lista, nao_medido: naoMedido }, null, 1));
fs.writeFileSync(path.join(SAIDA, "relatorio.md"), relatorio(final));
return { M, X };
}

function relatorio(final) {
  const L = [];
  const quando = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  L.push(`# QA nível 1 · ${S.nome}`, "", `_${final ? "" : "⏳ PARCIAL — rodada em andamento · "}${quando} · só leitura (trava de escrita ligada) · ${M.telas_medidas} telas em ${M.contas_medidas} perfis_`, "");
  L.push("| camada | achados |", "|---|---|");
  for (const n of ordem) L.push(`| **${n}** · ${NIVEIS[n]} | ${quantos(n)} |`);
  L.push(`| não medido | ${naoMedido.length} |`, "");
  L.push("## Perfis", "", "| conta | papel | entradas | telas | apps do lançador | barrado onde devia |", "|---|---|---|---|---|---|");
  for (const r of resumoContas) L.push(`| ${r.conta} | ${r.papel} | ${r.entradas.map((e) => `${curto(e.url)} ${e.ok ? `✓ ${(e.ms / 1000).toFixed(1)} s` : `✗ ${e.motivo}`}`).join("<br>")} | ${r.telas} | ${r.apps.map((a) => `${a.nome} ${a.estado === "abriu" ? "✓" : `✗ ${a.estado}`}`).join(", ") || "—"} | ${r.negado ? `✓ ${curto(r.negado.url)} (${r.negado.como})` : "—"} |`);
  L.push("");
  for (const n of ordem) {
    const ls = lista.filter((a) => a.nivel === n);
    if (!ls.length) continue;
    L.push(`## ${n} · ${NIVEIS[n]}`, "");
    for (const a of ls) {
      L.push(`- **${a.tipo}** — ${a.detalhe}`);
      L.push(`  - perfis: ${a.contas.join(", ") || "—"}${a.telas.length ? ` · telas: ${a.telas.join(" · ")}` : ""}`);
      if (a.extra.length) L.push(`  - ${a.extra.join(" · ")}`);
      if (a.evidencias.length) L.push(`  - evidência: ${a.evidencias.map((e) => `[${path.basename(e)}](${e})`).join(" · ")}`);
    }
    L.push("");
  }
  L.push("## Não medido (e por quê)", "");
  for (const x of naoMedido) L.push(`- ${x.conta}: ${x.o_que} — ${x.porque}`);
  if (!naoMedido.length) L.push("- nada");
  L.push("", "## Escritas que a trava segurou", "");
  for (const r of resumoContas) L.push(`- ${r.conta}: ${r.escritas_bloqueadas || 0}${r.escritas_exemplos?.length ? ` — ${r.escritas_exemplos.join(" · ")}` : ""}`);
  L.push("", "## O que o nível 1 não cobre", "",
    "- tudo que só aparece depois de gravar: enviar e receber e-mail, subir arquivo, criar evento, salvar configuração (nível 2, com escrita autorizada);",
    "- regra de negócio e dado certo × errado; teclado e leitor de tela (axe cobre ~57% por volume); desempenho de campo.");
  return L.join("\n") + "\n";
}

/* ── utilidades ──────────────────────────────────────────────────── */
async function assentar(p) {
  await p.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {});
  await p.waitForTimeout(800);
}
async function caiuNoLogin(p) {
  const senha = await p.locator("input[type=password]").first().isVisible().catch(() => false);
  return senha || /\/realms\/[^/]+\/protocol\/openid-connect\/auth|_task=login/i.test(p.url());
}
function curto(u) { try { const x = new URL(u); return `${x.host}${x.pathname === "/" ? "" : x.pathname}`; } catch { return u; } }
function caminho(u) { try { return new URL(u).pathname.replace(/\/+$/, "") || "/"; } catch { return u; } }
function caminhoGenerico(u) { try { const x = new URL(u); return (x.pathname.replace(/\/+$/, "") + x.search).replace(/\/u\/[^/]+/, "/u/:conta"); } catch { return u; } }
function caminhoComBusca(u) { try { const x = new URL(u); return `${x.origin}${x.pathname.replace(/\/+$/, "")}${x.search}`; } catch { return u; } }
