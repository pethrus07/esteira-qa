/* SISTEMA — o instrumento acusa o produto com defeito plantado, poupa o
   produto bom, e a trava não deixa gravar nem sair.  node testes/sistema.test.mjs */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { RAIZ } from "../nucleo/ambiente.mjs";
import { subir } from "../fixtures/sistema/servidor.mjs";

let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? "  ✓" : "  ✗"} ${msg}`); if (!cond) falhas++; };

async function rodar(base, srv) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qa-sistema-"));
  const roteiro = path.join(tmp, `fixture-${base}.json`);
  fs.writeFileSync(roteiro, JSON.stringify({
    nome: `fixture ${base}`, dominio_do_produto: "127.0.0.1", max_telas_por_origem: 10,
    termos_proibidos: ["Mettmail", "undefined", "NaN"],
    contas: [{ chave: "teste", papel: "fixture", credencial_fixture: { usuario: "qa@exemplo.com", senha: "senha-falsa" },
      entradas: [`http://127.0.0.1:${srv.porta}/${base}/inicio`],
      deve_negar: [{ url: `http://127.0.0.1:${srv.porta}/${base}/conta`, marcas: "\\bDom[ií]nios\\b|\\bMailboxes\\b" }] }],
  }));
  srv.recebidos.length = 0;
  // assíncrono: o servidor da fixture roda NESTE processo e precisa responder
  const { spawn } = await import("node:child_process");
  const filho = spawn("node", [path.join(RAIZ, "instrumentos/sistema.mjs"), roteiro, "--saida", path.join(tmp, "saida")]);
  let out = "";
  filho.stdout.on("data", (d) => (out += d));
  await new Promise((r) => filho.on("close", r));
  const r = JSON.parse(out);
  const det = JSON.parse(fs.readFileSync(path.join(r.saida, "achados.json"), "utf8"));
  fs.rmSync(tmp, { recursive: true, force: true });
  return { r, det, recebidos: [...srv.recebidos] };
}

const srv = await subir();
try {
  // assinatura sem o instrumento: o defeito existe mesmo?
  const sem = await fetch(`http://127.0.0.1:${srv.porta}/ruim/contas`, { headers: { cookie: "sess=1" }, redirect: "manual" });
  ok(sem.status === 302 && sem.headers.get("location") === "/ruim/inicio", "assinatura: /ruim/contas devolve para o início (302)");

  console.log("── produto com defeito");
  const ruim = await rodar("ruim", srv);
  const tipos = ruim.det.achados.map((a) => `${a.nivel} ${a.tipo}`);
  ok(ruim.r.medidas.contas_medidas === 1, "entrou na conta");
  ok(tipos.includes("N1 Link cai na tela inicial, sem aviso"), "N1: link que cai no início");
  ok(tipos.includes("N1 Erro de JavaScript na tela"), "N1: erro de JavaScript");
  ok(tipos.includes("N1 API com erro do servidor (5xx)"), "N1: API 500");
  ok(ruim.det.achados.some((a) => a.nivel === "N2" && a.detalhe === "Mettmail"), "N2: marca antiga na tela");
  ok(tipos.includes("N4 Rola de lado no celular (390 px)"), "N4: rolagem lateral a 390 px");
  ok(tipos.includes("N1 Arquivo do app (CSS/JS) não carregou"), "N1: CSS do app que volta como HTML");
  ok(tipos.includes("N4 Botão fora da tela no celular (inalcançável)"), "N4: botão fora da tela a 390 px com o <html> sem rolar");
  ok(tipos.includes("N1 Perfil vê o que não devia"), "N1: perfil comum vê menu de admin");
  ok(!tipos.some((t) => t.includes("Texto cortado")), "texto só para leitor de tela NÃO é texto cortado");
  ok(tipos.includes("? API 404 numa tela que abriu") && !tipos.includes("N1 Recurso não encontrado (404)"), "API 404 numa tela que funciona vira pergunta, não N1");
  ok(!ruim.recebidos.some((x) => x.startsWith("POST /api/salvar")), "trava: o POST do carregamento não chegou ao servidor");
  ok(!ruim.recebidos.some((x) => x.includes("/sair")), "o link Sair nunca foi visitado");
  ok(!ruim.recebidos.some((x) => x.includes("clicou-comando") || x.includes("_action=send") || /inicio\?/.test(x)), "comando (Salvar como rascunho, Enviar) nunca foi clicado");
  ok(ruim.r.medidas.escritas_bloqueadas >= 1, `trava registrou ${ruim.r.medidas.escritas_bloqueadas} escrita(s) segurada(s)`);
  const ordem = ruim.det.achados.map((a) => a.nivel);
  ok(ordem.join() === [...ordem].sort((a, b) => ["N0", "N1", "N2", "N3", "N4", "?"].indexOf(a) - ["N0", "N1", "N2", "N3", "N4", "?"].indexOf(b)).join(), "relatório ordenado por dano");

  console.log("── produto bom");
  const bom = await rodar("bom", srv);
  const m = bom.r.medidas;
  ok(m.contas_medidas === 1 && m.telas_medidas >= 4, `entrou e mediu ${m.telas_medidas} telas`);
  ok(m.n0_impede_uso + m.n1_quebra_tarefa + m.n2_confianca + m.n4_visual === 0,
    `nenhum achado N0/N1/N2/N4 (veio: ${bom.det.achados.map((a) => `${a.nivel} ${a.tipo}: ${a.detalhe}`).join(" | ") || "nada"})`);
  ok(m.n3_acessibilidade === 0, "axe sem crítico/sério na página bem feita");
  ok(bom.det.contas[0].negado?.como === "abre, sem nada de admin", "mesmo host do painel, sem menu de admin = barrado certo");
} finally { srv.fechar(); }

process.exit(falhas ? 1 : 0);
