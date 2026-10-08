/* RÉGUA — compara medida com limite, e diz de onde o limite veio.
   ─────────────────────────────────────────────────────────────────
   Instrumento mede; régua julga. Separados porque o limite muda por
   calibração (âncora nova, veredito humano novo) e o instrumento não deve
   mudar junto — no protótipo, o limite de 25% morava no código e
   reprovava o tour que o Pedro tinha aprovado.

   Quatro estados por checagem, e nenhum se confunde com outro:
     passa · reprova/aviso/informa (a severidade da régua) · nao_medido
   "Zero medido e zero por falta de medição não podem sair iguais."
*/
import fs from "node:fs";
import path from "node:path";
import { RAIZ } from "./ambiente.mjs";

const PADRAO = JSON.parse(fs.readFileSync(path.join(RAIZ, "regua", "padrao.json"), "utf8"));

/** Sobe a partir da peça procurando um .qa.json de projeto. */
export function reguaDoProjeto(arquivo) {
  let d = path.dirname(path.resolve(arquivo));
  for (;;) {
    const f = path.join(d, ".qa.json");
    if (fs.existsSync(f)) {
      try { return { caminho: f, regua: JSON.parse(fs.readFileSync(f, "utf8")) }; }
      catch (e) { return { caminho: f, erro: `.qa.json inválido: ${e.message}` }; }
    }
    const cima = path.dirname(d);
    if (cima === d) return null;
    d = cima;
  }
}

function limiteEfetivo(base, projeto, destino) {
  let L = { ...base, ...(projeto || {}) };
  const pd = L.por_destino?.[destino];
  if (pd) L = { ...L, ...pd };
  return L;
}

/** Aplica a régua de um formato sobre as medidas de um instrumento. */
export function julgar(formato, medidas, { destino = "tela", projeto = null, naoAplica = [] } = {}) {
  const regras = PADRAO[formato] || {};
  const doProjeto = projeto?.[formato] || {};
  const checagens = [];
  // O projeto pode ACRESCENTAR regra que o padrão não tem — ex.: as
  // famílias de fonte da marca. Fonte de sistema não é defeito por si (o
  // Pesquisa X entregue usa Segoe UI de propósito); só é quando a marca diz outra.
  const ids = [...new Set([...Object.keys(regras), ...Object.keys(doProjeto)])];
  for (const id of ids) {
    if (id.startsWith("_")) continue;
    const L = limiteEfetivo(regras[id] || {}, doProjeto[id], destino);
    let v = medidas[id];
    const c = { id, valor: v, severidade: L.severidade || "aviso", procedencia: L.procedencia || "arbitrado",
                porque: L.porque, origem: doProjeto[id] ? "projeto" : "padrao" };
    if (L.permitidos && typeof v === "string") {
      // valor único contra lista exata — ex.: dimensões "1080x1920"
      c.limite = `∈ {${L.permitidos.join(", ")}}`;
      c.estado = L.permitidos.includes(v) ? "passa" : c.severidade;
      checagens.push(c);
      continue;
    }
    if (L.permitidos && Array.isArray(v)) {
      const norm = (s) => s.replace(/[\s_-]/g, "").toLowerCase();
      const fora = v.filter((x) => !L.permitidos.some((p) => norm(x).startsWith(norm(p))));
      c.valor = fora.length ? fora : "todas permitidas";
      c.limite = `∈ {${L.permitidos.join(", ")}}`;
      c.estado = fora.length ? c.severidade : "passa";
      checagens.push(c);
      continue;
    }
    if (v === undefined || v === null) {
      // ppi null em documento sem imagem é "não se aplica", não falta de medida
      c.estado = naoAplica.includes(id) ? "passa" : "nao_medido";
      c.valor = naoAplica.includes(id) ? "não se aplica" : v;
    } else if (L.max != null && v > L.max) { c.estado = L.severidade; c.limite = `≤ ${L.max}`; }
    else if (L.min != null && v < L.min) { c.estado = L.severidade; c.limite = `≥ ${L.min}`; }
    else if (L.igual !== undefined && v !== L.igual) { c.estado = L.severidade; c.limite = `= ${L.igual}`; }
    else {
      c.estado = "passa";
      c.limite = L.max != null ? `≤ ${L.max}` : L.min != null ? `≥ ${L.min}` : L.igual !== undefined ? `= ${L.igual}` : "—";
    }
    checagens.push(c);
  }
  return checagens;
}

/** Veredito da peça: o pior estado manda; não-medido impede "passou". */
export function veredito(checagens, { ilegivel, erros = [] } = {}) {
  if (ilegivel) return "ILEGIVEL";
  if (checagens.some((c) => c.estado === "reprova")) return "REPROVADO";
  if (erros.length || checagens.some((c) => c.estado === "nao_medido" && c.severidade === "reprova")) return "INCOMPLETO";
  if (checagens.some((c) => c.estado === "aviso")) return "PASSOU COM AVISO";
  return "PASSOU";
}
