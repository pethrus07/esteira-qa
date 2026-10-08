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
import { fileURLToPath } from "node:url";

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
