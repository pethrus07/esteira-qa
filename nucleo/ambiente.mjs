/* AMBIENTE — onde estão os executáveis, e como chamá-los sem mentir.
   ─────────────────────────────────────────────────────────────────
   Os scripts antigos tinham caminho cravado em cada um (o Playwright do
   qa-empresa, a venv do whisper, o chrome.exe). Aqui fica num lugar só.

   Regra que nasceu de erro (08/10): o Python no Git Bash escreve em
   cp1252 e troca acento por "�" — um PDF íntegro PARECEU ter glifo
   perdido. Todo Python sai daqui com PYTHONIOENCODING=utf-8, e a contagem
   é feita dentro do instrumento, nunca sobre texto impresso.
*/
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CASA = os.homedir();

export const PY = {
  // PyMuPDF, fontTools, Pillow, OpenCV, openpyxl, scikit-image
  sistema: path.join(CASA, "AppData/Local/Programs/Python/Python314/python.exe"),
  // faster-whisper (transcrição reversa)
  whisper: path.join(CASA, ".venvs/faster-whisper/Scripts/python.exe"),
  // NISQA fixa torch==2.2.1 — venv própria, NUNCA instalar em outra (LICOES)
  nisqa: path.join(CASA, ".venvs/nisqa/Scripts/python.exe"),
  mos: path.join(CASA, ".venvs/mos/Scripts/python.exe"),
};
export const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

/* Configuração da máquina, fora do git: `ambiente.local.json` na raiz
   (ignorado). Hoje só guarda onde fica o repositório de QA da empresa
   (protótipo da esteira de vídeo e pesos do NISQA). A variável de
   ambiente ESTEIRA_QA_EMPRESA vence o arquivo; sem nenhum dos dois, vale
   a pasta irmã `qa-empresa`. */
const LOCAL = (() => {
  const f = path.join(RAIZ, "ambiente.local.json");
  try { return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {}; }
  catch { return {}; }
})();
export const QA_EMPRESA = path.resolve(RAIZ,
  process.env.ESTEIRA_QA_EMPRESA || LOCAL.qaEmpresa || path.join("..", "qa-empresa"));

/** Imprime HTML em PDF pelo MESMO caminho da produção (RYZE/Atas):
    chrome.exe --print-to-pdf. O page.pdf do Playwright não reproduziu
    defeitos que este reproduz (LICOES, PDF). Caminho de saída absoluto:
    relativo, o Chrome grava em outra pasta e não avisa. */
export function imprimirPdf(html, pdf) {
  fs.rmSync(pdf, { force: true });
  spawnSync(CHROME, ["--headless", "--disable-gpu", "--no-pdf-header-footer",
    "--run-all-compositor-stages-before-draw", "--virtual-time-budget=10000",
    "--allow-file-access-from-files", `--print-to-pdf=${path.resolve(pdf)}`,
    pathToFileURL(path.resolve(html)).href], { stdio: "ignore" });
  return fs.existsSync(pdf);
}

/** Roda um instrumento Python e devolve o JSON. Falha vira {erro}, nunca zero. */
export function rodarPython(qual, script, args = [], { timeout = 600_000 } = {}) {
  const py = PY[qual];
  if (!fs.existsSync(py)) return { erro: `python "${qual}" ausente em ${py}` };
  const r = spawnSync(py, [path.join(RAIZ, script), ...args], {
    encoding: "utf8", maxBuffer: 1 << 28, timeout,
    env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
  });
  if (r.error) return { erro: String(r.error.message) };
  const out = r.stdout || "";
  const i = out.indexOf("{");
  if (i < 0) return { erro: (r.stderr || "sem saída").trim().split("\n").slice(-2).join(" ") };
  try { return JSON.parse(out.slice(i)); }
  catch (e) { return { erro: `JSON inválido: ${e.message}` }; }
}
