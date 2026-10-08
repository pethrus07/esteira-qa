"""INSTRUMENTO · COBERTURA — toda palavra que o HTML mostra chegou ao PDF?
─────────────────────────────────────────────────────────────────────────
POR QUE EXISTE — e o porquê que NÃO se sustentou

A hipótese de partida era "pega o que some só na paginação" (bloco com
break-inside:avoid maior que a coluna, apagado no Pesquisa X). VEREDITO 08/10:
em 5 estruturas de documento corrido (colunas, bloco solto, flex,
inline-block, linha de tabela) o Chrome 154 NÃO apagou nada — 70 de 70
parágrafos no PDF. O caso do Pesquisa X acontece em folha de ALTURA FIXA, e esse
o instrumento `dom` já pega sozinho.

O que só esta checagem pega é o PDF DEFASADO: HTML corrigido, PDF velho,
documento afirmando número já consertado — "o pior erro da série" no
documento-gerado-de-dados. Por isso ela compara NÚMEROS além de palavras:
o 57% que virou 58,4% não tem palavra de 4 letras nenhuma.

Foi reescrita duas vezes antes (qa_caderno.py: trecho de 48 caracteres;
conferir_slides.py: palavra de 4+ letras com 2ª tentativa sem espaços).
Aqui fica a versão de palavra, que é a que não depende do projeto.

    python instrumentos/cobertura.py <texto-renderizado.txt> <peca.pdf>

O texto do HTML vem do `dom.mjs --texto` (innerText na largura da folha),
não do código-fonte: script e elemento oculto não são cobrados.

LIÇÕES HERDADAS (não reconstruir):
  · letter-spacing insere espaço entre letras no texto extraído
    ("D E C I S Õ E S") → 2ª tentativa no texto do PDF sem espaços.
  · text-transform muda a caixa → tudo em casefold.
  · get_text NÃO devolve em ordem visual → comparar CONTAGEM, nunca sequência.
  · hifenização quebra palavra com "-\\n" → juntar antes de contar.
"""
import collections
import json
import re
import sys
import unicodedata

import fitz

PALAVRA = re.compile(r"[^\W\d_]{4,}", re.UNICODE)
# Número com separador de milhar/decimal pt-BR ou en: 58,4 · 1.250 · 2026
NUMERO = re.compile(r"(?<![\d.,])\d+(?:[.,]\d+)*")


def _faltas(esperado, achado, colado):
    faltam = {}
    for w, n in esperado.items():
        tem = achado.get(w, 0)
        if tem < n:
            # 2ª tentativa: letter-spacing separou as letras no PDF
            tem = max(tem, colado.count(w))
        if tem < n:
            faltam[w] = n - tem
    return faltam


def normalizar(t):
    t = unicodedata.normalize("NFKC", t).casefold()  # NFKC desfaz ligadura ﬁ → fi
    t = t.replace("­", "")                        # hífen discricionário
    return re.sub(r"-\s*\n\s*", "", t)                 # hifenização de fim de linha


def medir(txt_html, caminho_pdf):
    out = {"instrumento": "cobertura", "arquivo": caminho_pdf, "medidas": {}, "exemplos": {}}
    try:
        html = normalizar(open(txt_html, encoding="utf-8").read())
        doc = fitz.open(caminho_pdf)
        pdf = normalizar("\n".join(p.get_text() for p in doc))
    except Exception as e:  # noqa: BLE001
        out["ilegivel"] = str(e)
        return out
    colado = re.sub(r"\s+", "", pdf)
    esperado = collections.Counter(PALAVRA.findall(html))
    faltam = _faltas(esperado, collections.Counter(PALAVRA.findall(pdf)), colado)
    nums = collections.Counter(NUMERO.findall(html))
    faltam_n = _faltas(nums, collections.Counter(NUMERO.findall(pdf)), colado)
    out["medidas"]["numeros_no_html"] = sum(nums.values())
    out["medidas"]["numeros_faltando_no_pdf"] = sum(faltam_n.values())
    out["exemplos"]["numeros_faltando_no_pdf"] = [f"{w} ×{n}" for w, n in sorted(faltam_n.items(), key=lambda kv: -kv[1])[:10]]
    total = sum(esperado.values())
    perdidas = sum(faltam.values())
    M = out["medidas"]
    M["palavras_no_html"] = total
    M["palavras_faltando_no_pdf"] = perdidas
    M["cobertura_pct"] = round(100 * (total - perdidas) / total, 2) if total else None
    out["exemplos"]["palavras_faltando_no_pdf"] = [f"{w} ×{n}" for w, n in sorted(faltam.items(), key=lambda kv: -kv[1])[:10]]
    if not total:
        out["nao_aplica"] = ["cobertura_pct"]
    return out


if __name__ == "__main__":
    sys.stdout.write(json.dumps(medir(sys.argv[1], sys.argv[2]), ensure_ascii=True, indent=1))
