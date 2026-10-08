/* MARCA — o padrão único com divisões: RYZE, Empresa A, Celiware, Desbravando…
   ─────────────────────────────────────────────────────────────────────
   A régua tem três camadas, e cada uma só acrescenta ou aperta:

     padrão universal (regua/padrao.json)   o que vale para qualquer peça
       └─ marca (regua/marcas/<nome>.json)  fontes, paleta, P&B, naming
            └─ projeto (.qa.json)            o que é só daquele trabalho

   A marca entra pelo `.qa.json` do projeto ({"marca": "ryze"}) ou por
   `--marca ryze`. O que o guia não documenta fica em `a_confirmar` e sai
   no boletim como pergunta — nunca inventado (a "brasa #FF5A1F" que
   inventei para o Desbravando teve de ser removida).
*/
import fs from "node:fs";
import path from "node:path";
import { RAIZ } from "./ambiente.mjs";
import { croma, cssParaRgba, hexParaRgb, maisProxima } from "./cor.mjs";

export function carregarMarca(nome) {
  if (!nome) return null;
  const f = path.join(RAIZ, "regua", "marcas", `${String(nome).toLowerCase()}.json`);
  if (!fs.existsSync(f)) return { erro: `marca "${nome}" sem arquivo em regua/marcas/` };
  return JSON.parse(fs.readFileSync(f, "utf8"));
}

export const listarMarcas = () =>
  fs.readdirSync(path.join(RAIZ, "regua", "marcas")).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));

const norm = (s) => String(s).replace(/[\s_-]/g, "").toLowerCase();
const daMarca = (familia, fontes) => fontes.some((f) => norm(familia).startsWith(norm(f)));

/** Medidas de marca, a partir das medidas do instrumento (+ texto, se houver). */
export function medirMarca(formato, medidas, marca, { texto = null, limites = {} } = {}) {
  const M = {}, X = {}, naoAplica = [];
  const tol = limites.tolerancia_de00 ?? 2.0;
  const cromaNeutro = limites.croma_neutro_max ?? 3;

  // ── fontes ────────────────────────────────────────────────────
  const usadas = formato === "pdf" ? medidas.familias : formato === "dom" ? medidas.fontes_desenhadas
    : formato === "planilha" ? medidas.fontes_usadas : null;
  if (marca.fontes?.length && Array.isArray(usadas)) {
    const fora = usadas.filter((f) => !daMarca(f, marca.fontes));
    M.fontes_fora_da_marca = fora.length;
    X.fontes_fora_da_marca = fora.slice(0, 6);
  } else naoAplica.push("fontes_fora_da_marca");

  // ── cores (só o DOM sabe as cores de CSS) ───────────────────────
  if (formato === "dom" && Array.isArray(medidas.cores_usadas)) {
    const fora = [], cromaticas = [];
    for (const c of medidas.cores_usadas) {
      const rgb = hexParaRgb(c.hex);
      const C = croma(rgb);
      const neutro = C <= cromaNeutro;
      if (!neutro) cromaticas.push(`${c.hex} (croma ${C.toFixed(1)})`);
      if (marca.paleta?.length && !(neutro && marca.neutros_livres)) {
        const p = maisProxima(rgb, marca.paleta);
        if (p && p.de > tol) fora.push(`${c.hex} → ${p.hex} ΔE00 ${p.de.toFixed(1)}${c.texto ? ` · ${c.texto} chars` : ""}`);
      }
    }
    if (marca.paleta?.length) { M.cores_fora_da_paleta = fora.length; X.cores_fora_da_paleta = fora.slice(0, 8); }
    else naoAplica.push("cores_fora_da_paleta");
    if (marca.pb_estrito) { M.cores_em_peca_pb = cromaticas.length; X.cores_em_peca_pb = cromaticas.slice(0, 8); }
    else naoAplica.push("cores_em_peca_pb");
  } else if (formato === "imagem" && Array.isArray(medidas.cores_dominantes) && marca.paleta?.length) {
    // Só cor que cobre >= 5% da arte: foto tem mil cores legítimas; a
    // paleta da marca aparece nos blocos chapados grandes. Sem P&B aqui:
    // na imagem não dá para separar a foto (cor permitida) do grafismo.
    const fora = [];
    for (const c of medidas.cores_dominantes.filter((x) => x.pct >= 5)) {
      const rgb = hexParaRgb(c.hex);
      if (croma(rgb) <= cromaNeutro && marca.neutros_livres) continue;
      const p = maisProxima(rgb, marca.paleta);
      if (p && p.de > tol) fora.push(`${c.hex} (${c.pct}%) → ${p.hex} ΔE00 ${p.de.toFixed(1)}`);
    }
    M.cores_fora_da_paleta = fora.length; X.cores_fora_da_paleta = fora.slice(0, 6);
    naoAplica.push("cores_em_peca_pb");
  } else naoAplica.push("cores_fora_da_paleta", "cores_em_peca_pb");

  // ── termos proibidos (naming) ───────────────────────────────────
  if (marca.termos_proibidos?.length && texto != null) {
    const achados = [];
    for (const t of marca.termos_proibidos) {
      for (const m of texto.matchAll(new RegExp(t.regex, "giu"))) achados.push(`"${m[0]}" — ${t.porque}`);
    }
    M.termos_proibidos = achados.length;
    X.termos_proibidos = achados.slice(0, 6);
  } else naoAplica.push("termos_proibidos");

  return { medidas: M, exemplos: X, naoAplica };
}
