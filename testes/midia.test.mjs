/* TESTE DO INSTRUMENTO DE MÍDIA (áudio e vídeo)
   ─────────────────────────────────────────────────────────────────
   Três camadas de prova:
   1. cada fixture reprova no SEU defeito e só nele;
   2. o perfil "tutorial" aplica os limites ancorados; o padrão não;
   3. EQUIVALÊNCIA com o protótipo (qa-empresa/tutoriais/esteira/medir.mjs):
      generalizar não pode mudar o que se mede. Pula se o protótipo sumir.

     node testes/midia.test.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { RAIZ, QA_EMPRESA } from "../nucleo/ambiente.mjs";

const DIR = path.join(RAIZ, "fixtures", "midia");
if (!fs.existsSync(path.join(DIR, "video-bom.mp4"))) spawnSync("node", [path.join(RAIZ, "fixtures", "gerar-midia.mjs")], { stdio: "ignore" });

const qa = (arq, extra = []) => {
  const r = spawnSync("node", [path.join(RAIZ, "qa.mjs"), path.join(DIR, arq), "--json", ...extra], { encoding: "utf8", maxBuffer: 1 << 26 });
  try { return JSON.parse(r.stdout)[0]; } catch { return null; }
};
const est = (b, id) => b?.checagens.find((c) => c.id === id)?.estado;
const ruins = (b) => b.checagens.filter((c) => !["passa", "informa"].includes(c.estado)).map((c) => c.id).sort().join(",");

const T = ["--perfil", "tutorial"];
const CASOS = [
  { arq: "audio-bom.wav", espera: (b) => b.veredito === "PASSOU" },
  { arq: "audio-baixo-26lufs.wav", espera: (b) => ruins(b) === "lufs" && est(b, "lufs") === "aviso" },
  { arq: "audio-baixo-26lufs.wav", rotulo: "−26 LUFS no perfil tutorial reprova", extra: T, espera: (b) => est(b, "lufs") === "reprova" },
  { arq: "audio-clipado.wav", espera: (b) => est(b, "amostras_no_pico") === "reprova" && est(b, "pico_real_dbtp") === "reprova" },
  { arq: "audio-cauda-silencio.wav", espera: (b) => ruins(b) === "silencio_final_s" },
  { arq: "video-bom.mp4", espera: (b) => b.veredito === "PASSOU" },
  { arq: "video-bom.mp4", rotulo: "vídeo bom no perfil tutorial", extra: T, espera: (b) => b.veredito === "PASSOU" },
  // fora do perfil, imagem parada só INFORMA: limite de tutorial não vale p/ qualquer vídeo
  { arq: "video-cauda-congelada.mp4", rotulo: "cauda congelada, padrão (só informa)", espera: (b) => est(b, "maior_trecho_parado_s") === "informa" },
  { arq: "video-cauda-congelada.mp4", rotulo: "cauda congelada, perfil tutorial", extra: T,
    espera: (b) => ruins(b) === "maior_trecho_parado_s,pct_parado" && b.medidas.maior_trecho_parado_s >= 5.9 },
  { arq: "video-720p.mp4", rotulo: "720p, perfil tutorial", extra: T, espera: (b) => ruins(b) === "altura" },
  { arq: "video-truncado.mp4", espera: (b) => b.veredito === "ILEGIVEL" },
];

let falhas = 0;
for (const c of CASOS) {
  const b = qa(c.arq, c.extra);
  const ok = Boolean(b) && c.espera(b);
  if (!ok) falhas++;
  console.log(`  ${ok ? "✓" : "✗"} ${c.rotulo || c.arq}`);
  if (!ok && b) console.log("      ", b.veredito, JSON.stringify(b.checagens.filter((x) => x.estado !== "passa").map((x) => [x.id, x.estado, x.valor])));
}

/* ── equivalência com o protótipo ───────────────────────────────── */
const PROTO = QA_EMPRESA;
if (fs.existsSync(path.join(PROTO, "tutoriais", "esteira", "medir.mjs"))) {
  for (const arq of ["video-cauda-congelada.mp4", "video-bom.mp4"]) {
    const p = spawnSync("node", ["tutoriais/esteira/medir.mjs", path.join(DIR, arq), "--json"], { cwd: PROTO, encoding: "utf8" });
    const n = spawnSync("node", [path.join(RAIZ, "instrumentos", "midia.mjs"), path.join(DIR, arq)], { encoding: "utf8" });
    try {
      const a = JSON.parse(p.stdout)[0], m = JSON.parse(n.stdout).medidas;
      const iguais = a.congelamento.pct_parado === m.pct_parado && a.congelamento.maior_trecho === m.maior_trecho_parado_s && a.volume.lufs === m.lufs;
      if (!iguais) falhas++;
      console.log(`  ${iguais ? "✓" : "✗"} equivalência com o protótipo: ${arq}  (parado ${a.congelamento.pct_parado}/${m.pct_parado} · maior ${a.congelamento.maior_trecho}/${m.maior_trecho_parado_s} · LUFS ${a.volume.lufs}/${m.lufs})`);
    } catch { falhas++; console.log(`  ✗ equivalência: protótipo ou novo não rodou em ${arq}`); }
  }
} else console.log("  · equivalência com o protótipo: PULADA (qa-empresa ausente)");

console.log(falhas ? `\n  ${falhas} falha(s)\n` : "\n  todas as fixtures reprovadas/aprovadas como deviam\n");
process.exit(falhas ? 1 : 0);
