"""INSTRUMENTO · IMAGEM — arte, foto, peça de rede social
─────────────────────────────────────────────────────────────────────────
POR QUE EXISTE

Arte saía conferida no olho: o PNG "parecia certo". O que o olho não vê e
já custou caro ou vai custar: adesivo a ~30 dpi que a gráfica devolveu
(21/08), perfil de cor do monitor embutido (as cores mudam quando o
WhatsApp descarta o perfil), JPEG recomprimido até aparecer bloco, foto com
GPS do cliente indo para portfólio público (LGPD).

    python instrumentos/imagem.py <arte.png> [--tamanho-mm 150] [--paleta "#000,#FFF"]

VEREDITOS REGISTRADOS (não reconstruir):

  08/10 · BRISQUE/NIQE FICAM FORA PARA ARTE. São preditores de qualidade
  treinados em FOTOGRAFIA NATURAL (estatística de cena natural). Arte
  tipográfica e gráfico chapado violam a premissa: o número sairia
  confiante e sem sentido — o mesmo erro do UTMOS (calibrado em inglês)
  julgando voz em pt-BR. Se entrar, entra só para foto, e calibrado.

  08/10 · Qualidade do JPEG é ESTIMADA das tabelas de quantização contra
  as tabelas-padrão da IJG (o método do `identify -verbose`). Validada
  contra verdade conhecida: arquivos salvos com q=35/75/95 têm de voltar
  35/75/95 (testes/imagem.test.mjs).
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageCms, ExifTags

# Tabela-padrão de luminância da IJG (JPEG Annex K.1), em ordem natural
IJG_LUMA = [
    16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55,
    14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62,
    18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92,
    49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
]


def _tabela_ijg(q):
    # Divisão INTEIRA, como no C da libjpeg (jcparam.c). VEREDITO 08/10: com
    # divisão real, q=35 era estimado certo mas a tabela não saía "padrão"
    # (erro ≠ 0) — o acerto vinha por proximidade, não por igualdade.
    s = 5000 // q if q < 50 else 200 - 2 * q
    return [min(255, max(1, int((t * s + 50) // 100))) for t in IJG_LUMA]


def qualidade_jpeg(img):
    """Qualidade IJG mais próxima da tabela de luminância do arquivo."""
    tabelas = getattr(img, "quantization", None)
    if not tabelas:
        return None, None
    real = list(tabelas.get(0) or next(iter(tabelas.values())))
    # O Pillow devolve a tabela em ordem zigue-zague; a IJG acima está em
    # ordem natural. Comparar por conjunto ordenado elimina a dependência
    # de ordem (as duas tabelas têm os mesmos 64 valores se q bate).
    alvo = sorted(real)
    melhor, erro = None, None
    for q in range(1, 101):
        e = sum(abs(a - b) for a, b in zip(sorted(_tabela_ijg(q)), alvo))
        if erro is None or e < erro:
            melhor, erro = q, e
    return melhor, erro


def _perfil(img):
    icc = img.info.get("icc_profile")
    if not icc:
        return None
    try:
        import io
        p = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        return ImageCms.getProfileDescription(p).strip()
    except Exception:  # noqa: BLE001
        return "ilegível"


def _exif_sensivel(img):
    try:
        ex = img.getexif()
    except Exception:  # noqa: BLE001
        return []
    nomes = {v: k for k, v in ExifTags.TAGS.items()}
    achados = []
    if ex.get_ifd(0x8825):  # GPSInfo
        achados.append("GPS")
    for campo in ("Make", "Model", "Artist", "Copyright", "BodySerialNumber"):
        tag = nomes.get(campo)
        if tag and ex.get(tag):
            achados.append(f"{campo}={str(ex.get(tag))[:30]}")
    return achados


def cores_dominantes(img, n=8):
    """Cores que cobrem >= 1% da arte, por quantização de mediana."""
    peq = img.convert("RGB")
    peq.thumbnail((256, 256))
    q = peq.quantize(colors=16, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[: 16 * 3]
    contagem = sorted(q.getcolors(), reverse=True)
    total = sum(c for c, _ in contagem)
    out = []
    for c, i in contagem[:n]:
        if c / total < 0.01:
            break
        r, g, b = pal[3 * i: 3 * i + 3]
        out.append({"hex": f"#{r:02X}{g:02X}{b:02X}", "pct": round(100 * c / total, 1)})
    return out


def medir(caminho, tamanho_mm=None):
    out = {"instrumento": "imagem", "arquivo": caminho, "medidas": {}, "exemplos": {}, "nao_aplica": []}
    try:
        with Image.open(caminho) as v:
            v.verify()  # estrutura íntegra?
        img = Image.open(caminho)
        img.load()      # decodifica de verdade: arquivo truncado falha aqui
    except Exception as e:  # noqa: BLE001
        out["ilegivel"] = f"não decodifica: {e}"
        return out
    M, X = out["medidas"], out["exemplos"]
    M["formato"] = img.format
    M["largura"], M["altura"] = img.size
    M["dimensoes"] = f"{img.size[0]}x{img.size[1]}"
    M["modo"] = img.mode
    M["kb"] = round(os.path.getsize(caminho) / 1024)
    M["modo_cmyk"] = img.mode == "CMYK"
    perfil = _perfil(img)
    M["perfil_icc"] = perfil or ("sem perfil (CMYK sem perfil = cor indefinida)" if img.mode == "CMYK" else "sem perfil (lido como sRGB)")
    # Sem perfil = sRGB por convenção da web. Perfil que não é sRGB muda as
    # cores quando a plataforma o descarta (WhatsApp, Instagram).
    M["perfil_nao_srgb"] = bool(perfil) and "srgb" not in perfil.lower().replace(" ", "")
    dpi = img.info.get("dpi")
    M["dpi_metadado"] = round(dpi[0]) if dpi else None

    if img.format == "JPEG":
        q, erro = qualidade_jpeg(img)
        M["jpeg_qualidade_estimada"] = q
        M["jpeg_tabela_padrao_ijg"] = erro == 0  # False = tabela própria (Photoshop, câmera)
    else:
        out["nao_aplica"].append("jpeg_qualidade_estimada")

    if tamanho_mm:
        M["ppi_efetivo"] = round(img.size[0] / (tamanho_mm / 25.4))
    else:
        out["nao_aplica"].append("ppi_efetivo")

    sens = _exif_sensivel(img)
    M["metadado_sensivel"] = len(sens)
    X["metadado_sensivel"] = sens
    M["cores_dominantes"] = cores_dominantes(img)
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("arquivo")
    ap.add_argument("--tamanho-mm", type=float, help="largura em que vai ser impressa")
    a = ap.parse_args()
    sys.stdout.write(json.dumps(medir(a.arquivo, a.tamanho_mm), ensure_ascii=True, indent=1))
