"""INSTRUMENTO · PLANILHA (.xlsx) — a lista de conferência da skill
planilha-premium, transformada em medida
─────────────────────────────────────────────────────────────────────────
POR QUE EXISTE

A skill planilha-premium terminava em "confira medindo, não olhando" e
uma lista de 14 itens para conferir à mão. Aqui viram números os que são
mensuráveis; os outros ficam no boletim como "não cobre".

    python instrumentos/planilha.py <arquivo.xlsx>

REGRA DE SEGURANÇA: o instrumento reporta ENDEREÇO de célula, nunca o
CONTEÚDO. Planilha da frota WP tem credencial; boletim de QA não pode
virar vazamento.

VEREDITOS REGISTRADOS (não reconstruir):
  · Erro de fórmula (#REF!, #DIV/0!…) só se lê no VALOR EM CACHE, que quem
    grava é o Excel/LibreOffice. Arquivo salvo pelo openpyxl não tem cache:
    "zero erro" ali seria zero por falta de medição → NÃO MEDIDO.
  · Fórmula fora do padrão da coluna é a ideia do ExceLint (Barowy et al.,
    OOPSLA 2018: precisão ~64%, revocação ~62%). Por isso é AVISO.
"""
import collections
import json
import os
import re
import sys

import openpyxl
from openpyxl.utils import get_column_letter

ERROS = ("#REF!", "#DIV/0!", "#N/A", "#VALUE!", "#NAME?", "#NUM!", "#NULL!", "#SPILL!", "#CALC!")
REF = re.compile(r"(\$?)([A-Z]{1,3})(\$?)(\d+)")


def _col_num(letras):
    n = 0
    for ch in letras:
        n = n * 26 + ord(ch) - 64
    return n


def assinatura_r1c1(formula, linha, coluna):
    """Fórmula em referência RELATIVA (estilo R1C1): duas células da mesma
    coluna com a mesma lógica têm a mesma assinatura."""
    def troca(m):
        c = _col_num(m.group(2)); r = int(m.group(4))
        cc = f"C{c}" if m.group(1) else f"C[{c - coluna}]"
        rr = f"R{r}" if m.group(3) else f"R[{r - linha}]"
        return rr + cc
    return REF.sub(troca, formula)


_FONTES = None


def _arquivo_da_fonte(nome, negrito=False):
    """Família → arquivo TTF instalado (Windows + fontes do usuário)."""
    global _FONTES
    if _FONTES is None:
        from fontTools.ttLib import TTFont, TTCollection
        _FONTES = {}
        pastas = [r"C:\Windows\Fonts", os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts")]
        for pasta in pastas:
            if not os.path.isdir(pasta):
                continue
            for f in os.listdir(pasta):
                if not f.lower().endswith((".ttf", ".otf")):
                    continue
                try:
                    t = TTFont(os.path.join(pasta, f), lazy=True)
                    fam = t["name"].getDebugName(1); sub = (t["name"].getDebugName(2) or "").lower()
                    if fam:
                        _FONTES.setdefault((fam.lower(), "bold" in sub), os.path.join(pasta, f))
                except Exception:  # noqa: BLE001
                    pass
    return _FONTES.get((str(nome).lower(), negrito)) or _FONTES.get((str(nome).lower(), False))


def _px_coluna(largura):
    # Largura do Excel em "caracteres do dígito 0 da fonte padrão" → pixels
    # (Calibri 11 a 96 dpi: 7 px por unidade + 5 px de margem). Fórmula da
    # especificação OOXML (ECMA-376, 18.3.1.13).
    return int(((256 * largura + int(128 / 7)) / 256) * 7)


def _px_texto(texto, nome, tamanho_pt, negrito):
    from PIL import ImageFont
    arq = _arquivo_da_fonte(nome, negrito)
    if not arq:
        return None
    return ImageFont.truetype(arq, round(tamanho_pt * 96 / 72)).getlength(texto)


def _supressao(valores):
    """Rótulo suprimido (armadilha 4): ao preencher cada vazio com o valor
    de cima, cada valor distinto forma UM bloco contíguo. Dado ausente fica
    espalhado e não fecha esse padrão. Coluna toda vazia é decorativa."""
    if not any(v not in (None, "") for v in valores) or all(v not in (None, "") for v in valores):
        return 0
    cheio, atual = [], None
    for v in valores:
        if v not in (None, ""):
            atual = v
        cheio.append(atual)
    blocos, vistos, anterior = 0, set(), object()
    for v in cheio:
        if v != anterior:
            if v in vistos:
                return 0  # valor reaparece em outro bloco: não é supressão
            vistos.add(v); blocos += 1; anterior = v
    return sum(1 for v in valores if v in (None, "")) if blocos > 1 else 0


def _fill_hex(cell):
    f = cell.fill
    if not f or f.fill_type in (None, "none"):
        return None
    c = f.fgColor
    if c is None or c.type != "rgb" or not isinstance(c.rgb, str):
        return "tema/indexada"
    return "#" + c.rgb[-6:].upper()


def medir(caminho):
    out = {"instrumento": "planilha", "arquivo": caminho, "medidas": {}, "exemplos": {}, "nao_aplica": []}
    try:
        wb = openpyxl.load_workbook(caminho)                   # fórmulas + estilo
        wbv = openpyxl.load_workbook(caminho, data_only=True)  # valores em cache
    except Exception as e:  # noqa: BLE001
        out["ilegivel"] = f"não abre: {e}"
        return out
    M, X = out["medidas"], out["exemplos"]
    abas = wb.worksheets
    M["abas"] = len(abas)
    M["kb"] = round(os.path.getsize(caminho) / 1024)
    M["abre_na_primeira_aba"] = wb.index(wb.active) == 0
    com_grade = [ws.title for ws in abas if ws.sheet_view.showGridLines is not False]
    M["abas_com_grade"] = len(com_grade)
    X["abas_com_grade"] = com_grade[:8]

    sem_congelar, filtro_vazias, cortadas, alturas_serradas = [], [], [], []
    sem_fonte = set()
    fills = collections.Counter()
    fontes = collections.Counter()
    n_formulas = n_cache = 0
    erros, inconsistentes, mescladas_filtro = [], [], []

    for ws, wv in zip(abas, wbv.worksheets):
        nlin, ncol = ws.max_row, ws.max_column
        dados = nlin > 30  # "aba de dados" (arbitrado: a skill não define)
        if dados and not ws.freeze_panes:
            sem_congelar.append(ws.title)

        # filtro × rótulo SUPRIMIDO (armadilha 4). VEREDITO 08/10: a 1ª versão
        # contava toda célula vazia e acusou 10.779 no Corpus Pesquisa X ENTREGUE —
        # eram a tarja decorativa (coluna toda vazia) e campos opcionais
        # (diocese, motivo): dado ausente, não supressão.
        if ws.auto_filter and ws.auto_filter.ref:
            try:
                (c0, r0), (c1, r1) = [(_col_num(m.group(2)), int(m.group(4))) for m in REF.finditer(ws.auto_filter.ref)][:2]
                for c in range(c0, c1 + 1):
                    n = _supressao([ws.cell(r, c).value for r in range(r0 + 1, r1 + 1)])
                    if n:
                        filtro_vazias.append(f"{ws.title}!{get_column_letter(c)}: {n} vazias em blocos")
                if any(rng.min_row > r0 for rng in ws.merged_cells.ranges):
                    mescladas_filtro.append(ws.title)
            except ValueError:
                pass

        # alturas: só as LINHAS DE DADOS. VEREDITO 08/10: contar todas acusou
        # o Exegese aprovado — as 3 alturas eram dado (850 linhas), faixa de
        # grupo (negrito, roxo-noite) e espaçador vazio, todas por desenho.
        if dados:
            cheias = {r: sum(1 for c in range(1, ncol + 1) if ws.cell(r, c).value not in (None, "")) for r in range(2, nlin + 1)}
            moda = collections.Counter(v for v in cheias.values() if v).most_common(1)
            linhas_dado = [r for r, n in cheias.items() if moda and n >= max(2, moda[0][0] // 2)]
            hs = {round(ws.row_dimensions[r].height, 1) if ws.row_dimensions[r].height else "padrão" for r in linhas_dado}
            # Só TABELA LONGA (a regra da skill): >= 80% das linhas não vazias
            # com o mesmo número de campos. Painel (o Panorama do Pesquisa X) tem
            # linhas heterogêneas por desenho e não entra.
            nao_vazias = [n for n in cheias.values() if n]
            tabela = moda and len(nao_vazias) and moda[0][1] / len(nao_vazias) >= 0.8
            if tabela and len(hs) > 2:
                alturas_serradas.append(f"{ws.title}: {len(hs)} alturas nas linhas de dados")

        larg = {}
        por_coluna = collections.defaultdict(list)
        for row in ws.iter_rows():
            for cell in row:
                v = cell.value
                if v is None:
                    continue
                fh = _fill_hex(cell)
                if fh and cell.row > 1:
                    fills[fh] += 1
                if cell.font and cell.font.name:
                    fontes[cell.font.name] += 1
                if isinstance(v, str) and v.startswith("="):
                    n_formulas += 1
                    cv = wv.cell(cell.row, cell.column).value
                    if cv is not None:
                        n_cache += 1
                        if isinstance(cv, str) and cv.strip() in ERROS:
                            erros.append(cell.coordinate if len(abas) == 1 else f"{ws.title}!{cell.coordinate}")
                    por_coluna[cell.column].append((cell.row, assinatura_r1c1(v, cell.row, cell.column)))
                    continue
                # texto cortado: não quebra linha, passa da largura E o vizinho
                # da direita está ocupado (o Excel só transborda em célula vazia).
                # Medido em PIXELS com a fonte de verdade (VEREDITO 08/10: a 1ª
                # versão estimava "1 caractere por unidade" — Calibri 11 —, e o
                # Corpus é Segoe UI 9).
                if isinstance(v, str) and not (cell.alignment and cell.alignment.wrap_text) \
                        and ws.cell(cell.row, cell.column + 1).value not in (None, ""):
                    letra = cell.column_letter
                    if letra not in larg:
                        larg[letra] = _px_coluna(ws.column_dimensions[letra].width or 8.43)
                    linha1 = v.split("\n")[0]
                    px = _px_texto(linha1, cell.font.name or "Calibri", cell.font.sz or 11, bool(cell.font.b))
                    if px is None:
                        sem_fonte.add(cell.font.name)
                    # 5% de folga: a métrica da fonte (PIL) e o hinting de tela do
                    # Excel divergem um pouco; no Corpus Pesquisa X, 225 de 3.234 cortes
                    # caíam nessa zona incerta. Acima dela o corte é real (mediana
                    # 9%, p75 2,4×, máx 8×).
                    elif px > (larg[letra] - 4) * 1.05:
                        cortadas.append(f"{ws.title}!{cell.coordinate}")

        # fórmula fora do padrão da coluna (ExceLint, versão de coluna)
        for col, lst in por_coluna.items():
            if len(lst) < 5:
                continue
            cont = collections.Counter(s for _, s in lst)
            dominante, n = cont.most_common(1)[0]
            if n / len(lst) >= 0.8:
                inconsistentes += [f"{ws.title}!{get_column_letter(col)}{r}" for r, s in lst if s != dominante]

    M["abas_dados_sem_congelar"] = len(sem_congelar)
    X["abas_dados_sem_congelar"] = sem_congelar[:8]
    M["rotulo_suprimido_no_filtro"] = len(filtro_vazias)
    X["rotulo_suprimido_no_filtro"] = filtro_vazias[:8]
    M["abas_com_mescla_no_filtro"] = len(mescladas_filtro)
    X["abas_com_mescla_no_filtro"] = mescladas_filtro[:5]
    M["abas_com_grade_serrada"] = len(alturas_serradas)
    X["abas_com_grade_serrada"] = alturas_serradas[:5]
    M["texto_cortado"] = len(cortadas)
    X["texto_cortado"] = cortadas[:8]
    if sem_fonte:  # fonte não instalada: o corte dessas células NÃO foi medido
        X["texto_cortado"] = X["texto_cortado"] + [f"não medido: fonte ausente {sorted(sem_fonte)}"]
    M["preenchimentos_distintos"] = len(fills)
    M["cores_de_preenchimento"] = [h for h, _ in fills.most_common(30) if h.startswith("#")]
    M["fontes_usadas"] = [f for f, _ in fontes.most_common()]
    M["formulas"] = n_formulas
    if n_formulas and n_cache == 0:
        M["erros_de_formula"] = None  # sem cache: NÃO MEDIDO (ver cabeçalho)
        X["erros_de_formula"] = ["arquivo sem valores calculados (salvo por openpyxl?) — abrir e salvar no Excel para medir"]
    elif not n_formulas:
        out["nao_aplica"] += ["erros_de_formula", "formulas_fora_do_padrao"]
    else:
        M["erros_de_formula"] = len(erros)
        X["erros_de_formula"] = erros[:8]
    if n_formulas:
        M["formulas_fora_do_padrao"] = len(inconsistentes)
        X["formulas_fora_do_padrao"] = inconsistentes[:8]
    return out


if __name__ == "__main__":
    sys.stdout.write(json.dumps(medir(sys.argv[1]), ensure_ascii=True, indent=1))
