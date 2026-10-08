"""FIXTURES DE IMAGEM — um arquivo por defeito, gerado pelo Pillow
(o mesmo caminho dos scripts de arte e de foto do Pedro).

    python fixtures/gerar-imagem.py   → fixtures/imagem/*
"""
import os

from PIL import Image, ImageDraw

AQUI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "imagem")
os.makedirs(AQUI, exist_ok=True)
P3 = r"C:\Windows\System32\spool\drivers\color\SDC414D_DCIP3_6500.icm"


def arte(w=1080, h=1920):
    """Arte P&B com texto e foto simulada (gradiente colorido) — tem
    detalhe suficiente para a compressão JPEG deixar marca."""
    im = Image.new("RGB", (w, h), "#000000")
    d = ImageDraw.Draw(im)
    for y in range(h // 2, h):
        t = (y - h // 2) / (h // 2)
        d.line([(0, y), (w, y)], fill=(int(40 + 160 * t), int(90 + 60 * t), int(140 - 80 * t)))
    for i in range(12):
        d.text((60, 120 + i * 60), f"EXPEDICAO ORIGENS {i:02d} - 23 a 25/10", fill="#FFFFFF")
    return im


base = arte()
base.save(os.path.join(AQUI, "bom.png"))
for q in (35, 75, 95):
    base.save(os.path.join(AQUI, f"jpeg-q{q}.jpg"), quality=q)
base.convert("CMYK").save(os.path.join(AQUI, "cmyk.jpg"), quality=90)
with open(P3, "rb") as f:
    base.save(os.path.join(AQUI, "perfil-monitor-p3.png"), icc_profile=f.read())

ex = Image.Exif()
ex[0x010F] = "Apple"        # Make
ex[0x0110] = "iPhone 15"    # Model
ex[0x8825] = {1: "S", 2: (7.0, 7.0, 0.0), 3: "W", 4: (34.0, 50.0, 0.0)}  # GPS em João Pessoa
base.save(os.path.join(AQUI, "foto-com-gps.jpg"), quality=90, exif=ex)

# 600 px para imprimir a 150 mm = ~102 ppi (o adesivo de 21/08 saiu a ~30)
arte(600, 600).save(os.path.join(AQUI, "pequena-para-impressao.png"))

dados = open(os.path.join(AQUI, "bom.png"), "rb").read()
open(os.path.join(AQUI, "truncado.png"), "wb").write(dados[: len(dados) // 3])
print("  fixtures de imagem em", AQUI)
