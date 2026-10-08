/* TESTE DO INSTRUMENTO DE IMAGEM
   ─────────────────────────────────────────────────────────────────
   A qualidade do JPEG tem VERDADE CONHECIDA: o arquivo foi salvo com q
   escolhido, e o instrumento tem de devolver o mesmo q, com a tabela
   idêntica à da IJG (erro 0). Os outros defeitos têm a assinatura lida
   direto pelo Pillow, sem o instrumento.

     node testes/imagem.test.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PY, RAIZ } from "../nucleo/ambiente.mjs";

const DIR = path.join(RAIZ, "fixtures", "imagem");
spawnSync(PY.sistema, [path.join(RAIZ, "fixtures", "gerar-imagem.py")], { stdio: "ignore" });
const env = { ...process.env, PYTHONIOENCODING: "utf-8" };

const qa = (arq, extra = []) => {
  const r = spawnSync("node", [path.join(RAIZ, "qa.mjs"), path.join(DIR, arq), "--json", ...extra], { encoding: "utf8", env });
  try { return JSON.parse(r.stdout)[0]; } catch { return null; }
};
const est = (b, id) => b?.checagens.find((c) => c.id === id)?.estado;
/** assinatura lida pelo Pillow, sem o instrumento */
const pillow = (arq, expr) => {
  const r = spawnSync(PY.sistema, ["-c", `from PIL import Image\nim=Image.open(r'${path.join(DIR, arq)}')\nprint(${expr})`], { encoding: "utf8", env });
  return (r.stdout || "").trim();
};

const CASOS = [
  { arq: "bom.png", assin: () => pillow("bom.png", "im.mode") === "RGB",
    espera: (b) => b.veredito === "PASSOU" },
  ...[35, 75, 95].map((q) => ({ arq: `jpeg-q${q}.jpg`, rotulo: `jpeg q=${q} estimado exato`, assin: () => true,
    espera: (b) => b.medidas.jpeg_qualidade_estimada === q && b.medidas.jpeg_tabela_padrao_ijg === true
                && est(b, "jpeg_qualidade_estimada") === (q < 80 ? "aviso" : "passa") })),
  { arq: "cmyk.jpg", assin: () => pillow("cmyk.jpg", "im.mode") === "CMYK",
    espera: (b) => est(b, "modo_cmyk") === "reprova" },
  { arq: "cmyk.jpg", rotulo: "cmyk para gráfica não reprova", extra: ["--destino", "grafica"], assin: () => true,
    espera: (b) => est(b, "modo_cmyk") === "informa" },
  { arq: "perfil-monitor-p3.png", assin: () => pillow("perfil-monitor-p3.png", "bool(im.info.get('icc_profile'))") === "True",
    espera: (b) => est(b, "perfil_nao_srgb") === "aviso" },
  { arq: "foto-com-gps.jpg", assin: () => pillow("foto-com-gps.jpg", "bool(im.getexif().get_ifd(0x8825))") === "True",
    espera: (b) => est(b, "metadado_sensivel") === "aviso" && b.exemplos.metadado_sensivel.includes("GPS") },
  { arq: "pequena-para-impressao.png", rotulo: "600px a 150mm para gráfica", extra: ["--destino", "grafica", "--tamanho-mm", "150"], assin: () => true,
    espera: (b) => b.medidas.ppi_efetivo === 102 && est(b, "ppi_efetivo") === "reprova" },
  { arq: "truncado.png", assin: () => fs.statSync(path.join(DIR, "truncado.png")).size < fs.statSync(path.join(DIR, "bom.png")).size,
    espera: (b) => b.veredito === "ILEGIVEL" },
];

let falhas = 0;
for (const c of CASOS) {
  const assin = (() => { try { return c.assin(); } catch { return false; } })();
  const b = qa(c.arq, c.extra);
  const ok = Boolean(b) && c.espera(b);
  if (!assin || !ok) falhas++;
  console.log(`  ${(!assin ? "✗ FIXTURE" : ok ? "✓" : "✗ INSTRUMENTO").padEnd(14)} ${c.rotulo || c.arq}`);
  if (assin && !ok && b) console.log("       ", b.veredito, JSON.stringify(b.checagens.filter((x) => x.estado !== "passa").map((x) => [x.id, x.estado, x.valor])));
}
console.log(falhas ? `\n  ${falhas} falha(s)\n` : "\n  todas as fixtures reprovadas/aprovadas como deviam\n");
process.exit(falhas ? 1 : 0);
