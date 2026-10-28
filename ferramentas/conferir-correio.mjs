/* CONFERIR CORREIO — um "programa de e-mail de verdade" mínimo: entra por IMAP (993) e POP (995)
   e autentica no SMTP (465 e 587 com STARTTLS) com a conta de QA, sem ler nem enviar mensagem.
   Nunca imprime a senha. Uso: node ferramentas/conferir-correio.mjs <id-1password> [host]          */
import tls from "node:tls";
import net from "node:net";
import { liberar, credencial } from "../nucleo/credencial.mjs";

const [id, HOST = "mail.suite-x.example"] = process.argv.slice(2);
if (!id) { console.error("uso: node ferramentas/conferir-correio.mjs <id-1password> [host]"); process.exit(2); }
if (!liberar()) { console.error("1Password não aprovou"); process.exit(1); }
const { usuario, senha } = credencial(id);

// conversa linha a linha: manda um comando e espera uma resposta que case com o padrão
function conversa(socket) {
  let buf = "";
  const esperas = [];
  socket.on("data", (d) => { buf += d.toString(); for (const e of [...esperas]) if (e.re.test(buf)) { esperas.splice(esperas.indexOf(e), 1); const b = buf; buf = ""; e.ok(b); } });
  return (cmd, re, ms = 15000) => new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error(`sem resposta para ${cmd ? cmd.split(" ")[0] : "saudação"}`)), ms);
    esperas.push({ re, ok: (b) => { clearTimeout(t); ok(b); } });
    if (cmd) socket.write(cmd + "\r\n");
    else if (re.test(buf)) { esperas.pop(); clearTimeout(t); const b = buf; buf = ""; ok(b); }
  });
}
const abrir = (porta) => new Promise((ok, falha) => { const s = tls.connect({ host: HOST, port: porta, servername: HOST }, () => ok(s)); s.on("error", falha); });
const b64 = (s) => Buffer.from(s).toString("base64");
const linha1 = (b) => b.trim().split(/\r?\n/).pop().replace(senha, "***").slice(0, 80);

const r = {};
try { const s = await abrir(993); const f = conversa(s); await f(null, /^\* OK/m);
  r.imap993 = linha1(await f(`a1 LOGIN "${usuario}" "${senha}"`, /^a1 (OK|NO|BAD)/m)); await f("a2 LOGOUT", /^a2 /m).catch(() => {}); s.end(); } catch (e) { r.imap993 = "erro: " + e.message; }
try { const s = await abrir(995); const f = conversa(s); await f(null, /^\+OK/m);
  await f(`USER ${usuario}`, /^[+-]/m); r.pop995 = linha1(await f(`PASS ${senha}`, /^[+-](OK|ERR)/m)); await f("QUIT", /^\+OK/m).catch(() => {}); s.end(); } catch (e) { r.pop995 = "erro: " + e.message; }
const smtp = async (s) => { const f = conversa(s); return f; };
try { const s = await abrir(465); const f = conversa(s); await f(null, /^220 /m); await f("EHLO qa.local", /^250 /m);
  r.smtp465 = linha1(await f(`AUTH PLAIN ${b64(`\0${usuario}\0${senha}`)}`, /^(235|535|5\d\d) /m)); await f("QUIT", /^221/m).catch(() => {}); s.end(); } catch (e) { r.smtp465 = "erro: " + e.message; }
try {
  const cru = net.connect(587, HOST); const f0 = conversa(cru);
  await new Promise((ok, falha) => { cru.once("connect", ok); cru.once("error", falha); });
  await f0(null, /^220 /m); await f0("EHLO qa.local", /^250 /m); await f0("STARTTLS", /^220 /m);
  cru.removeAllListeners("data");
  const s = await new Promise((ok, falha) => { const t = tls.connect({ socket: cru, servername: HOST }, () => ok(t)); t.on("error", falha); });
  const f = conversa(s); await f("EHLO qa.local", /^250 /m);
  r.smtp587 = linha1(await f(`AUTH PLAIN ${b64(`\0${usuario}\0${senha}`)}`, /^(235|535|5\d\d) /m)); await f("QUIT", /^221/m).catch(() => {}); s.end();
} catch (e) { r.smtp587 = "erro: " + e.message; }
console.log(JSON.stringify({ host: HOST, conta: usuario, ...r }, null, 1));
