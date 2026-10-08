/* INSTRUMENTO · MÍDIA — áudio e vídeo, fora dos tutoriais
   ─────────────────────────────────────────────────────────────────────
   POR QUE EXISTE

   A esteira de vídeo nasceu dentro de qa-empresa/tutoriais, presa a
   caminhos, ao ffmpeg de 2018 do node_modules e a limites calibrados em
   TUTORIAL. Aqui ficam as camadas rápidas e determinísticas para qualquer
   áudio ou vídeo; as caras (NISQA, transcrição reversa) entram por opção.

     node instrumentos/midia.mjs <arquivo> [--voz] [--fala texto.txt]

   O QUE ELA É, E O QUE NÃO É
   Reprova o que está quebrado: tela morta, volume fora da norma, clipping,
   silêncio sobrando, arquivo truncado. Timbre, simpatia e ritmo percebido
   seguem ouvido humano — eu não tenho audição (LICOES dos tutoriais).

   VEREDITOS HERDADOS DO PROTÓTIPO (não reconstruir):
   · freezedetect só emite freeze_duration quando o congelamento TERMINA;
     o que vai até o fim do arquivo some. Um vídeo foi de 31,5% para 59,2%
     com o conserto da cauda.
   · Arquivo quebrado (mp4 de 48 bytes) media ZERO congelamento = nota
     máxima. Sem fluxo legível: ILEGÍVEL.
   · O ffmpeg do node_modules é de 2018 (sem zoompan/minterpolate). Aqui é
     o do PATH (9.x).
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { RAIZ, PY } from "../nucleo/ambiente.mjs";

const FFMPEG = "ffmpeg", FFPROBE = "ffprobe";
const ff = (args) => spawnSync(FFMPEG, ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 1 << 28 }).stderr || "";
const probe = (args) => spawnSync(FFPROBE, ["-v", "error", ...args], { encoding: "utf8", maxBuffer: 1 << 26 }).stdout || "";
const num = (x) => (x === undefined || x === null || x === "" || Number.isNaN(+x) ? null : +x);

const argv = process.argv.slice(2);
const alvo = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--fala");
const comVoz = argv.includes("--voz");
const iFala = argv.indexOf("--fala");
const textoFala = iFala >= 0 ? argv[iFala + 1] : null;
const sair = (o) => { process.stdout.write(JSON.stringify(o, null, 1)); process.exit(0); };

if (!alvo || !fs.existsSync(alvo)) sair({ instrumento: "midia", ilegivel: "arquivo não existe" });

/* ── ficha ─────────────────────────────────────────────────────── */
let j = {};
try { j = JSON.parse(probe(["-show_entries", "stream=codec_type,codec_name,width,height,avg_frame_rate,sample_rate,channels",
  "-show_entries", "format=duration,bit_rate,size", "-of", "json", alvo])); } catch { /* segue */ }
const vs = (j.streams || []).find((s) => s.codec_type === "video");
const as = (j.streams || []).find((s) => s.codec_type === "audio");
const dur = num(j.format?.duration);
const M = {}, X = {}, naoAplica = [];

if ((!vs && !as) || !dur) {
  const tam = fs.statSync(alvo).size;
  sair({ instrumento: "midia", arquivo: alvo, ilegivel: `sem fluxo de áudio ou vídeo legível (${tam} bytes)` });
}
M.tipo = vs ? "video" : "audio";
M.duracao_s = +dur.toFixed(2);
M.kb = Math.round(fs.statSync(alvo).size / 1024);

/* ── imagem: congelamento (com o conserto da cauda) ─────────────── */
if (vs) {
  const [n, d] = (vs.avg_frame_rate || "0/1").split("/").map(Number);
  M.largura = num(vs.width); M.altura = num(vs.height);
  M.fps = d ? +(n / d).toFixed(2) : null;
  M.codec_video = vs.codec_name;
  // d=1: trecho de 1s para cima. Abaixo disso é pausa natural de leitura.
  const s = ff(["-i", alvo, "-vf", "freezedetect=n=-55dB:d=1", "-map", "0:v:0", "-f", "null", "-"]);
  const duracoes = (s.match(/freeze_duration: [0-9.]+/g) || []).map((x) => +x.split(" ")[1]);
  const inicios = (s.match(/freeze_start: [0-9.]+/g) || []).map((x) => +x.split(" ")[1]);
  if (inicios.length > duracoes.length) {
    const cauda = dur - inicios[inicios.length - 1];
    if (cauda > 0.05) duracoes.push(+cauda.toFixed(3));
  }
  const soma = duracoes.reduce((a, b) => a + b, 0);
  M.pct_parado = +((100 * soma) / dur).toFixed(1);
  M.maior_trecho_parado_s = duracoes.length ? +Math.max(...duracoes).toFixed(1) : 0;
  M.trechos_parados = duracoes.length;
} else naoAplica.push("pct_parado", "maior_trecho_parado_s", "altura");

/* ── volume: EBU R128 com pico REAL (true peak) ─────────────────── */
if (as) {
  M.codec_audio = as.codec_name;
  M.taxa_hz = num(as.sample_rate); M.canais = num(as.channels);
  const s = ff(["-i", alvo, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const bloco = s.slice(s.lastIndexOf("Integrated loudness"));
  M.lufs = num((bloco.match(/I:\s*(-?[0-9.]+) LUFS/) || [])[1]);
  M.faixa_lu = num((bloco.match(/LRA:\s*(-?[0-9.]+) LU/) || [])[1]);
  const picos = s.match(/Peak:\s*(-?[0-9.inf]+) dBFS/g) || [];
  M.pico_real_dbtp = picos.length ? num(picos[picos.length - 1].match(/(-?[0-9.]+|-?inf)/)[1]) : null;

  /* clipping: amostras na escala cheia (astats). Pico real acima de 0
     mostra que vai clipar na conversão; amostra cravada mostra que JÁ clipou. */
  const a = ff(["-i", alvo, "-map", "0:a:0", "-af", "astats=measure_overall=Peak_count+Flat_factor+Peak_level:measure_perchannel=none", "-f", "null", "-"]);
  const pk = num((a.match(/Peak level dB:\s*(-?[0-9.inf]+)/) || [])[1]);
  const pc = num((a.match(/Peak count:\s*([0-9.]+)/) || [])[1]);
  M.amostras_no_pico = pk !== null && pk > -0.1 ? pc : 0;

  /* silêncio: na ponta (cabeça e cauda sobrando) e maior pausa interna */
  const sl = ff(["-i", alvo, "-map", "0:a:0", "-af", "silencedetect=noise=-45dB:d=0.4", "-f", "null", "-"]);
  const ini = (sl.match(/silence_start: -?[0-9.]+/g) || []).map((x) => +x.split(" ")[1]);
  const fim = (sl.match(/silence_end: [0-9.]+/g) || []).map((x) => +x.split(" ")[1]);
  const durs = (sl.match(/silence_duration: [0-9.]+/g) || []).map((x) => +x.split(" ")[1]);
  M.silencio_inicial_s = ini.length && ini[0] <= 0.05 ? +(fim[0] ?? dur).toFixed(2) : 0;
  // silêncio que começa e não termina = vai até o fim (mesma armadilha do freezedetect)
  M.silencio_final_s = ini.length > fim.length ? +(dur - ini[ini.length - 1]).toFixed(2)
    : (fim.length && Math.abs(fim[fim.length - 1] - dur) < 0.05 ? +durs[durs.length - 1].toFixed(2) : 0);
  const internas = durs.filter((_, i) => !(i === 0 && M.silencio_inicial_s) && !(i === durs.length - 1 && M.silencio_final_s && fim.length === durs.length));
  M.maior_pausa_s = internas.length ? +Math.max(...internas).toFixed(2) : 0;
  M.pct_com_som = +((100 * (dur - durs.reduce((x, y) => x + y, 0))) / dur).toFixed(1);
} else naoAplica.push("lufs", "pico_real_dbtp", "amostras_no_pico", "silencio_inicial_s", "silencio_final_s");

/* ── camadas caras, por opção ──────────────────────────────────── */
const PROTO = path.join(RAIZ, "..", "qa-empresa", "tutoriais", "esteira");
if (comVoz && as) {
  // NISQA: venv própria (fixa torch 2.2.1 — nunca instalar em outra) e
  // pesos no qa-empresa. Teto não documentado ~12s: o script fatia em 10s.
  const r = spawnSync(PY.nisqa, [path.join(PROTO, "medir-nisqa.py"), path.resolve(alvo), "--json"],
    { encoding: "utf8", cwd: path.join(RAIZ, "..", "qa-empresa"), maxBuffer: 1 << 26, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  try {
    const v = JSON.parse(r.stdout.slice(r.stdout.indexOf("[")))[0];
    Object.assign(M, { voz_mos: v.mos, voz_naturalidade: v.naturalidade_tts, voz_coloracao: v.coloracao,
      voz_descontinuidade: v.descontinuidade, voz_ruido: v.ruido });
  } catch { M.voz_coloracao = null; X.voz_coloracao = ["NISQA não rodou: " + (r.stderr || "").trim().split("\n").slice(-1)[0]]; }
} else naoAplica.push("voz_coloracao");

if (textoFala && as) {
  // Transcrição reversa: o que foi DITO contra o texto. MOS não substitui:
  // o Bark pontua 3,06 de MOS falando "pois cheire gatoito".
  const r = spawnSync(PY.whisper, [path.join(PROTO, "conferir-fala.py"), path.resolve(alvo), "--arquivo", path.resolve(textoFala)],
    { encoding: "utf8", maxBuffer: 1 << 26, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  const fid = (r.stdout || "").match(/fidelidade:\s*([0-9.]+)%/);
  M.fala_fidelidade_pct = fid ? +fid[1] : null;
  if (!fid) X.fala_fidelidade_pct = ["transcrição não rodou: " + (r.stderr || "").trim().split("\n").slice(-1)[0]];
} else naoAplica.push("fala_fidelidade_pct");

sair({ instrumento: "midia", arquivo: alvo, medidas: M, exemplos: X, nao_aplica: naoAplica });
