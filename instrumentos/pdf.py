"""INSTRUMENTO · PDF — mede o ARQUIVO FINAL, do jeito que o cliente abre.
─────────────────────────────────────────────────────────────────────────
POR QUE EXISTE

As mesmas cinco checagens (Type3, medida de página, folha vazia, texto fora
da folha, glifo perdido) foram reescritas à mão em pelo menos cinco
projetos — auditar-fechamento, auditar-proposta, auditar-vetor, conferir.py,
qa_entrega. Cada cópia com um limite diferente e nenhuma com procedência.

O QUE ELE É, E O QUE NÃO É

Mede o PDF. Não mede DIAGRAMAÇÃO: transbordo dentro de uma folha de altura
fixa NÃO aparece no PDF (o `overflow:hidden` apaga o texto sem deixar
rastro). Para isso existe o instrumento `dom`, que mede o HTML antes de
virar PDF. Os dois juntos fecham; um só, não.

Não decide: devolve MEDIDAS. Quem compara com limite é a régua
(`regua/padrao.json` + `.qa.json` do projeto), para que limite calibrado
por âncora não fique enterrado em código.

    python instrumentos/pdf.py <arquivo.pdf> [--destino tela|impressao|grafica]

VEREDITOS REGISTRADOS (não reconstruir):

  08/10 · Type3 NÃO é sinônimo de "texto perdido". Medido nos PDFs do Atas
  (896 glifos Type3, todos VETOR, com /ToUnicode): o texto é pesquisável e
  a impressão é nítida. O que Type3 vetorial custa é hinting em tela e
  conformidade (gráfica, PDF/A-1). Por isso o instrumento separa Type3
  VETORIAL COM ToUnicode (aviso) de Type3 BITMAP ou SEM ToUnicode (defeito).
  A nota antiga "Type3 = não selecionável" valia para o caso sem ToUnicode.

  08/10 · O PyMuPDF devolve ext="n/a" para fonte Type3 — ela não tem arquivo
  de fonte, os glifos são procedimentos dentro do PDF. Contar "n/a" como
  "não embutida" dobrava o mesmo defeito. Não embutida = não-Type3 com n/a.

  08/10 · GLIFO AUSENTE NO CHROME SAI COMO U+0000, não como U+FFFD nem como
  o caractere original. Medido na fixture `glifo-uso-privado`: U+F0B7 numa
  fonte sem esse glifo → o Skia desenha o .notdef e grava ToUnicode = 0. A
  primeira versão procurava FFFD e uso privado — as duas assinaturas
  erradas — e media 0 num arquivo com dois glifos perdidos. Agora conta
  caractere de controle (exceto \\t \\n \\r) como glifo sem mapeamento.

  08/10 · No Git Bash o Python escreve em cp1252 e troca acento por "�". Um
  texto íntegro PARECEU ter glifo perdido. Toda contagem é feita aqui
  dentro, sobre a string, e a saída é JSON com ensure_ascii.
"""
import argparse
import json
import os
import re
import sys

import fitz  # PyMuPDF

MM = 25.4 / 72

# Faixas de uso privado: caractere que o extrator não soube mapear para
# Unicode costuma cair aqui (ex.: U+F0B7, o bullet da fonte Symbol colado
# do Word — 56 casos no Pesquisa X que sumiam calados).
def _privado(c):
    o = ord(c)
    return 0xE000 <= o <= 0xF8FF or 0xF0000 <= o <= 0xFFFFD

# Emoji sai em Type3 no Windows de qualquer jeito (fonte colorida); não é
# defeito do documento, é do sistema. Tolerado desde o Pesquisa X.
def _emoji(c):
    o = ord(c)
    return (0x1F000 <= o <= 0x1FAFF) or (0x2600 <= o <= 0x27BF) or o in (0xFE0F, 0x200D)

FALLBACK_SISTEMA = ("SegoeUI", "Segoe UI", "Arial", "TimesNewRoman", "Times New Roman",
                    "Calibri", "Cambria", "Consolas", "CourierNew", "MSGothic", "Tahoma",
                    "Verdana", "Helvetica", "DejaVu", "Liberation")


def _base(nome):
    return nome.split("+", 1)[1] if "+" in nome else nome


def _type3_info(doc, xref):
    """(tem_tounicode, glifos_vetor, glifos_bitmap) de uma fonte Type3."""
    obj = doc.xref_object(xref)
    tem_tu = "/ToUnicode" in obj
    vetor = bitmap = 0
    m = re.search(r"/CharProcs\s*<<(.*?)>>", obj, re.S)
    refs = re.findall(r"(\d+) 0 R", m.group(1)) if m else []
    if not m:
        m2 = re.search(r"/CharProcs\s+(\d+) 0 R", obj)
        if m2:
            refs = re.findall(r"(\d+) 0 R", doc.xref_object(int(m2.group(1))))
    for r in refs:
        s = doc.xref_stream(int(r)) or b""
        if re.search(rb"\bBI\b|\bDo\b", s):
            bitmap += 1
        else:
            vetor += 1
    return tem_tu, vetor, bitmap


def classificar_type3(t3):
    """(defeituosas, so_emoji). Defeituosa = bitmap ou sem ToUnicode E
    desenhando texto que não é emoji. Função pura para ser testada isolada:
    o caso "bitmap com texto" não tem fixture real (ver gerar-pdf.mjs)."""
    ruins = [f for f in t3 if (not f["tounicode"] or f["glifos_bitmap"])]
    return (sum(1 for f in ruins if f.get("chars_texto", 0) > 0),
            sum(1 for f in ruins if not f.get("chars_texto", 0)))


def medir(caminho, destino="tela"):
    out = {"instrumento": "pdf", "arquivo": caminho, "destino": destino, "medidas": {}, "exemplos": {}}
    try:
        doc = fitz.open(caminho)
        n = len(doc)
    except Exception as e:  # noqa: BLE001
        out["ilegivel"] = f"não abre: {e}"
        return out
    if n == 0:
        out["ilegivel"] = "0 páginas"
        return out
    M, X = out["medidas"], out["exemplos"]
    M["paginas"] = n
    M["kb"] = round(os.path.getsize(caminho) / 1024)
    M["titulo_metadado"] = bool((doc.metadata or {}).get("title"))
    M["produtor"] = (doc.metadata or {}).get("producer") or None

    # ── fontes ──────────────────────────────────────────────────────
    fontes = {}  # xref -> dict
    for p in doc:
        for xref, ext, tipo, base, nome, *_ in p.get_fonts():
            if xref in fontes:
                continue
            f = {"tipo": tipo, "nome": _base(base or nome), "embutida": tipo == "Type3" or ext != "n/a"}
            if tipo == "Type3":
                f["tounicode"], f["glifos_vetor"], f["glifos_bitmap"] = _type3_info(doc, xref)
            fontes[xref] = f
    t3 = [f for f in fontes.values() if f["tipo"] == "Type3"]
    M["fontes_total"] = len(fontes)
    M["fontes_type3"] = len(t3)
    M["glifos_type3_bitmap"] = sum(f["glifos_bitmap"] for f in t3)
    M["fontes_nao_embutidas"] = sum(1 for f in fontes.values() if not f["embutida"])
    X["fontes_nao_embutidas"] = sorted({f["nome"] for f in fontes.values() if not f["embutida"]})[:8]
    fam = sorted({f["nome"] for f in fontes.values() if f["tipo"] != "Type3"})
    M["familias"] = fam
    M["fontes_de_sistema"] = sorted({x for x in fam if x.replace(" ", "").startswith(tuple(s.replace(" ", "") for s in FALLBACK_SISTEMA))})

    # Texto em Type3 que NÃO é emoji (o caso que importa)
    nomes_t3 = {f["nome"] for f in t3}
    chars_t3 = 0
    # ── texto, glifos, caixa da página ──────────────────────────────
    privados, nulos, fffd, fora, sem_texto, vazias = [], [], 0, [], [], []
    tamanhos = {}
    for i, p in enumerate(doc, 1):
        r = p.rect
        tam = (round(r.width * MM, 1), round(r.height * MM, 1))
        tamanhos[tam] = tamanhos.get(tam, 0) + 1
        d = p.get_text("dict")
        texto_pag = []
        for b in d["blocks"]:
            for ln in b.get("lines", []):
                for sp in ln.get("spans", []):
                    t = sp["text"]
                    if not t.strip():
                        continue
                    texto_pag.append(t)
                    # O PyMuPDF batiza o span em Type3 de "Type3 (4 0 R)", não
                    # com o nome "F4" da lista de fontes. Comparar por nome
                    # media 0 caractere em Type3 num PDF 100% Type3 (08/10).
                    if sp["font"].startswith("Type3") or sp["font"] in nomes_t3:
                        n_txt = sum(1 for c in t if not c.isspace() and not _emoji(c))
                        chars_t3 += n_txt
                        mx = re.match(r"Type3 \((\d+) 0 R\)", sp["font"])
                        if mx and int(mx.group(1)) in fontes:
                            fontes[int(mx.group(1))]["chars_texto"] = fontes[int(mx.group(1))].get("chars_texto", 0) + n_txt
                    x0, y0, x1, y1 = sp["bbox"]
                    # 0,5pt de folga: o bbox do span inclui o side-bearing
                    if x0 < r.x0 - 0.5 or y0 < r.y0 - 0.5 or x1 > r.x1 + 0.5 or y1 > r.y1 + 0.5:
                        fora.append(f"p.{i}: {t.strip()[:40]!r}")
        s = "".join(texto_pag)
        fffd += s.count("�")
        nulos += [f"p.{i}" for c in s if ord(c) < 32 and c not in "\t\n\r"]
        privados += [f"p.{i}: U+{ord(c):04X}" for c in s if _privado(c)]
        # Folha vazia medida pela TINTA, não por contagem de caracteres: os
        # limites 120 e 40 dos scripts antigos eram arbitrados, e folha de
        # abertura ("Parte II") tem pouco texto e é legítima. O defeito
        # real (a folha extra do 297mm) não tem tinta nenhuma.
        pix = p.get_pixmap(dpi=24, colorspace=fitz.csGRAY)
        amostra = pix.samples
        fundo = max(set(amostra), key=amostra.count) if amostra else 255
        tinta = sum(1 for v in amostra if abs(v - fundo) > 24) / max(1, len(amostra))
        if tinta < 0.001:
            vazias.append(i)
        if not s.strip() and tinta >= 0.001:
            sem_texto.append(i)
    M["chars_texto_em_type3"] = chars_t3
    # Type3 DEFEITUOSA = bitmap ou sem ToUnicode E desenhando texto que não é
    # emoji. VEREDITO 08/10: a 1ª versão contava a fonte inteira e reprovou o
    # Pesquisa X Vol. II ENTREGUE — as duas "defeituosas" desenhavam só 🙏 e 👉 dos
    # respondentes, que o Windows sempre exporta como Type3 bitmap. A âncora
    # apontou o erro do instrumento; o limite continuou 0.
    M["fontes_type3_defeituosas"], M["fontes_type3_so_emoji"] = classificar_type3(t3)
    M["glifo_substituto_fffd"] = fffd
    M["glifo_sem_mapeamento"] = len(nulos)
    X["glifo_sem_mapeamento"] = sorted(set(nulos))[:8]
    M["caracteres_uso_privado"] = len(privados)
    X["caracteres_uso_privado"] = privados[:8]
    M["texto_fora_da_pagina"] = len(fora)
    X["texto_fora_da_pagina"] = fora[:8]
    M["paginas_sem_tinta"] = len(vazias)
    X["paginas_sem_tinta"] = vazias[:12]
    M["paginas_com_tinta_sem_texto"] = len(sem_texto)
    X["paginas_com_tinta_sem_texto"] = sem_texto[:12]
    M["tamanhos_pagina_mm"] = [f"{w}x{h} ({c}p)" for (w, h), c in sorted(tamanhos.items(), key=lambda kv: -kv[1])]
    M["tamanhos_distintos"] = len(tamanhos)

    # ── imagens: resolução EFETIVA (pixels ÷ polegadas em que é exibida) ─
    # FUNDO DE PÁGINA fica fora da conta (08/10). O Pesquisa X v4 ENTREGUE tem
    # 72 ppi a 210mm na capa: é o gradiente que o Chrome rasteriza do
    # tamanho da folha (pdf-ryze, "nota sobre gradiente"). Gradiente liso
    # não tem detalhe a perder; exigir 300 ppi dele reprovaria peça aprovada.
    menor, baixas, fundos = None, [], []
    n_img = 0
    for i, p in enumerate(doc, 1):
        area_pag = p.rect.width * p.rect.height
        for info in p.get_image_info():
            w_in = (info["bbox"][2] - info["bbox"][0]) / 72
            h_in = (info["bbox"][3] - info["bbox"][1]) / 72
            if w_in < 0.2 or h_in < 0.2 or not info.get("width"):
                continue  # ícone/ornamento: ppi irrelevante
            if (w_in * 72) * (h_in * 72) >= 0.9 * area_pag:
                fundos.append(f"p.{i}: {round(info['width'] / w_in)} ppi")
                continue
            n_img += 1
            ppi = min(info["width"] / w_in, info["height"] / h_in)
            if menor is None or ppi < menor:
                menor = ppi
            baixas.append((round(ppi), i, round(w_in * 25.4)))
    M["imagens"] = n_img
    M["imagens_fundo_de_pagina"] = len(fundos)
    X["imagens_fundo_de_pagina"] = fundos[:6]
    M["ppi_efetivo_minimo"] = round(menor) if menor is not None else None
    X["ppi_efetivo_minimo"] = [f"p.{pg}: {ppi} ppi a {mm}mm" for ppi, pg, mm in sorted(baixas)[:6]]
    if n_img == 0:
        out["nao_aplica"] = ["ppi_efetivo_minimo"]
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("arquivo")
    ap.add_argument("--destino", default="tela", choices=["tela", "impressao", "grafica"])
    a = ap.parse_args()
    r = medir(a.arquivo, a.destino)
    sys.stdout.write(json.dumps(r, ensure_ascii=True, indent=1))
