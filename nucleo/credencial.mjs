/* CREDENCIAL — senha de conta de teste, do 1Password, sem passar por tela.
   ─────────────────────────────────────────────────────────────────
   Vem da SESSÃO DO APP (o service account só enxerga o cofre de QA) e
   fica só em memória: nunca é impressa, gravada nem devolvida no boletim.

   VEREDITOS HERDADOS (qa-empresa, 08/10):
   · fora de sessão interativa o `op` não falha — ele ESPERA (60,3 s) e só
     então estoura. Sempre com `timeout`.
   · o app pede aprovação por processo: buscar TODAS as credenciais de uma
     vez, no começo, e guardar. Pedir dentro de etapa cronometrada custou
     46 s de vídeo mudo. */
import { execFileSync } from "node:child_process";
import path from "node:path";

const OP = path.join(process.env.LOCALAPPDATA || "",
  "Microsoft/WinGet/Packages/AgileBits.1Password.CLI_Microsoft.Winget.Source_8wekyb3d8bbwe/op.exe");

const guardadas = new Map();
const semConta = () => { const env = { ...process.env }; delete env.OP_SERVICE_ACCOUNT_TOKEN; return env; };

/** Espera a aprovação do app ANTES de buscar senhas. VEREDITO 12/10: o `op`
    desiste sozinho em ~60 s (não no timeout que eu passo); três rodadas do
    Suíte X morreram com "authorization timeout" nas três contas porque o aviso
    de aprovação ficou atrás de outra janela. Agora: um `whoami` repetido por
    até `minutos`, avisando na tela; aprovado uma vez, as senhas vêm em seguida. */
export function liberar({ minutos = 5, avisar = (m) => process.stderr.write(m + "\n") } = {}) {
  /* `whoami` NÃO serve: responde "account is not signed in" em 0,4 s sem
     disparar o pedido do app — o laço girou 126 vezes em falso (12/10).
     `vault list` dispara o pedido e espera a aprovação. */
  const fim = Date.now() + minutos * 60_000;
  for (let n = 1; Date.now() < fim; n++) {
    const t0 = Date.now();
    try {
      execFileSync(OP, ["vault", "list", "--format", "json"], { env: semConta(), encoding: "utf8", timeout: 75_000, stdio: ["ignore", "pipe", "pipe"] });
      return true;
    } catch {
      avisar(`   ⏳ 1Password esperando aprovação (tentativa ${n}) — aprove o pedido do app na tela`);
      // falhou rápido = não houve espera de verdade: pausa antes de pedir de novo
      const resto = 10_000 - (Date.now() - t0);
      if (resto > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, resto);
    }
  }
  return false;
}

/** { usuario, senha } do item; lança erro sem conter a senha. */
export function credencial(id, { timeout = 120_000 } = {}) {
  if (guardadas.has(id)) return guardadas.get(id);
  const env = { ...process.env };
  delete env.OP_SERVICE_ACCOUNT_TOKEN;
  let item;
  try {
    item = JSON.parse(execFileSync(OP, ["item", "get", id, "--reveal", "--format", "json"],
      { env, encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"] }));
  } catch (e) {
    throw new Error(`1Password não entregou o item ${id} (${String(e.stderr || e.message).split("\n")[0].slice(0, 120)})`);
  }
  const campo = (p) => item.fields?.find((f) => f.purpose === p)?.value;
  const r = { usuario: campo("USERNAME"), senha: campo("PASSWORD") };
  if (!r.usuario || !r.senha) throw new Error(`item ${id} sem usuário ou senha`);
  guardadas.set(id, r);
  return r;
}
