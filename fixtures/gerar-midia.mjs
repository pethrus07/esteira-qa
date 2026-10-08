/* FIXTURES DE MÍDIA — geradas pelo ffmpeg, o mesmo motor da montagem
   ─────────────────────────────────────────────────────────────────
   "Fala" sintética: ruído rosa modulado em sílabas (~4 Hz), que o
   medidor de loudness trata como programa contínuo. O nível é ajustado
   em DUAS PASSAGENS de loudnorm (a de uma só aproxima, e fixture com nível
   aproximado testaria a fixture, não o instrumento).

     node fixtures/gerar-midia.mjs      → fixtures/midia/*
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "midia");
fs.mkdirSync(DIR, { recursive: true });
const ff = (args) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  return r;
};
const out = (n) => path.join(DIR, n);

// sílabas: ruído rosa × envelope de 4 Hz, 8 s
const FALA = "anoisesrc=color=pink:duration=8:sample_rate=48000,volume='0.6+0.4*sin(2*PI*4*t)':eval=frame";

/** loudnorm em duas passagens: mede, depois aplica com os valores medidos. */
function nivelar(entrada, saida, alvo, picoMax = -1.5) {
  const m = spawnSync("ffmpeg", ["-hide_banner", "-i", entrada, "-af", `loudnorm=I=${alvo}:TP=${picoMax}:LRA=11:print_format=json`, "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const j = JSON.parse(m.slice(m.lastIndexOf("{"), m.lastIndexOf("}") + 1));
  ff(["-i", entrada, "-af", `loudnorm=I=${alvo}:TP=${picoMax}:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000`, saida]);
}

ff(["-f", "lavfi", "-i", FALA, out("_cru.wav")]);
nivelar(out("_cru.wav"), out("audio-bom.wav"), -16);
nivelar(out("_cru.wav"), out("audio-baixo-26lufs.wav"), -26);
// Para VÍDEO, margem maior: medido 08/10, o AAC levou o pico real de -1,4
// (WAV) para -0,8 dBTP. Codec com perda cria sobressinal — nivelar a -1,5
// antes de comprimir NÃO garante -1 depois. Mede-se o arquivo final.
nivelar(out("_cru.wav"), out("_para-video.wav"), -16, -2.5);
// clipado: +18 dB sobre o bom, gravado em PCM 16 bits (corta na escala cheia)
ff(["-i", out("audio-bom.wav"), "-af", "volume=18dB", "-c:a", "pcm_s16le", out("audio-clipado.wav")]);
// render que não cortou: 4 s de silêncio no fim
ff(["-i", out("audio-bom.wav"), "-af", "apad=pad_dur=4", out("audio-cauda-silencio.wav")]);

// vídeo bom: imagem em movimento contínuo + a fala
ff(["-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=30:duration=8", "-i", out("_para-video.wav"),
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", out("video-bom.mp4")]);
// tela morta: 2 s de movimento e o último quadro CONGELADO até o fim (a
// cauda que o freezedetect não reporta sozinho)
ff(["-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=30:duration=2", "-i", out("_para-video.wav"),
  "-vf", "tpad=stop_mode=clone:stop_duration=6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", out("video-cauda-congelada.mp4")]);
// 720p: o que o recordVideo do Playwright entregava
ff(["-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=8", "-i", out("_para-video.wav"),
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", out("video-720p.mp4")]);
// o mp4 de 48 bytes que levou nota máxima no protótipo
fs.writeFileSync(out("video-truncado.mp4"), fs.readFileSync(out("video-bom.mp4")).subarray(0, 48));
fs.rmSync(out("_cru.wav")); fs.rmSync(out("_para-video.wav"));
console.log("  fixtures de mídia em", DIR);
