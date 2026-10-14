/* FIXTURE · SISTEMA — um "produto" local com login e um defeito plantado
   por camada, e a versão boa do mesmo produto.
     /ruim/…  N1 link que cai no início (302) · N1 erro de JS · N1 API 500
              N2 "Mettmail" na tela · N4 rola de lado a 390 px
              + um link "Sair" e um POST no carregamento que NÃO podem chegar
     /bom/…   as mesmas telas, sem defeito
   O servidor conta o que recebeu: o teste confere que a trava segurou o
   POST e que o "Sair" nunca foi visitado. */
import http from "node:http";

export function subir() {
  const recebidos = [];
  const pagina = (titulo, corpo, base) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title>
<style>body{font:16px system-ui;margin:0;color:#111;background:#fff}nav a{display:inline-block;padding:12px;min-width:24px}main{padding:16px}</style></head>
<body><nav aria-label="Menu"><a href="/${base}/inicio">Início</a><a href="/${base}/contas">Contas</a><a href="/${base}/relatorio">Relatório</a><a href="/${base}/config">Configurações</a><a href="/${base}/sair">Sair</a></nav>
<main><h1>${titulo}</h1>${corpo}</main></body></html>`;
  const srv = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    // com a query: sem ela o teste não via o clique em "?_action=send" (mutação passou, 12/10)
    recebidos.push(`${req.method} ${url.pathname}${url.search}`);
    const sessao = /sess=1/.test(req.headers.cookie || "");
    const html = (s, h) => { res.writeHead(s, { "content-type": "text/html; charset=utf-8" }); res.end(h); };
    if (url.pathname === "/login" && req.method === "POST") {
      res.writeHead(302, { "set-cookie": "sess=1; Path=/", location: url.searchParams.get("volta") || "/bom/inicio" }); return res.end();
    }
    if (url.pathname === "/login") return html(200, `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Entrar</title></head><body><main><h1>Entrar</h1>
<form method="post" action="/login?volta=${encodeURIComponent(url.searchParams.get("volta") || "/bom/inicio")}"><label>E-mail <input name="username" type="email"></label>
<label>Senha <input name="password" type="password"></label><button>Entrar</button></form></main></body></html>`);
    if (url.pathname === "/api/dados") { res.writeHead(url.searchParams.get("ruim") ? 500 : 200, { "content-type": "application/json" }); return res.end("{}"); }
    if (url.pathname === "/api/salvar") { res.writeHead(200); return res.end("gravado"); }
    if (url.pathname === "/api/status-desligado") { res.writeHead(404); return res.end(); }
    // CSS que falta: o servidor devolve uma página HTML (como o Tarefas do Suíte X, 12/10)
    if (url.pathname.startsWith("/css/")) return html(200, "<!doctype html><title>x</title>");
    const [, base, tela] = url.pathname.split("/");
    if (!["bom", "ruim"].includes(base)) { res.writeHead(302, { location: "/bom/inicio" }); return res.end(); }
    if (!sessao) { res.writeHead(302, { location: `/login?volta=${encodeURIComponent(url.pathname)}` }); return res.end(); }
    const ruim = base === "ruim";
    if (tela === "sair") { res.writeHead(302, { "set-cookie": "sess=; Path=/; Max-Age=0", location: "/login" }); return res.end(); }
    if (tela === "inicio") return html(200, pagina("Início", `<p>Bem-vindo ao painel de demonstração.</p>
<p><a href="#" onclick="fetch('/api/clicou-comando');return false">Salvar como rascunho</a> · <a href="/${base}/inicio?_action=send">Enviar agora</a></p>
<h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">Lista de arquivos e pastas modificados recentemente</h2>
${ruim ? '<link rel="stylesheet" href="/css/app-que-falta.css">' : ""}
<script>fetch("/api/status-desligado");fetch("/api/salvar",{method:"POST",body:"x"})</script>`, base));
    // a "conta" do usuário comum mora no mesmo host do painel: só no ruim aparece menu de admin
    if (tela === "conta") return html(200, pagina("Minha conta", ruim ? "<p>Domínios · Mailboxes</p>" : "<p>Aliases que recebo: nenhum.</p>", base));
    if (tela === "contas") {
      if (ruim) { res.writeHead(302, { location: "/ruim/inicio" }); return res.end(); }
      return html(200, pagina("Contas", "<p>Lista de contas do domínio.</p>", base));
    }
    // ruim: o <html> não rola, mas um botão (o "avatar") fica fora da tela a 390 px — como o Nextcloud do Suíte X, 13/10
    if (tela === "relatorio") return html(200, pagina("Relatório", `<p>Relatório de uso.</p>
${ruim ? '<style>html{overflow-x:hidden}</style><button style="position:absolute;top:4px;left:430px;width:40px;height:40px" aria-label="Avatar do usuário">QU</button>' : ""}
<script>fetch("/api/dados${ruim ? "?ruim=1" : ""}").then(r=>r.json());${ruim ? "window.naoExiste.chamar();" : ""}</script>`, base));
    if (tela === "config") return html(200, pagina("Configurações", ruim
      ? `<p>Servidor Mettmail.</p><div style="width:900px;height:20px;background:#eee"></div>`
      : "<p>Servidor de e-mail.</p>", base));
    return html(404, pagina("Não encontrada", "<p>Página não encontrada</p>", base));
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok({ porta: srv.address().port, recebidos, fechar: () => srv.close() })));
}
