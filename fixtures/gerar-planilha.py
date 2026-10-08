"""FIXTURES DE PLANILHA — openpyxl (o mesmo caminho do pipeline do Pedro)
e, para o erro de fórmula em CACHE, o próprio Excel via COM: o openpyxl não
grava valor calculado, então só quem calcula pode produzir o defeito real.

    python fixtures/gerar-planilha.py   → fixtures/planilha/*.xlsx
"""
import os
import shutil
import subprocess

import openpyxl
from openpyxl.styles import Alignment, Font

AQUI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "planilha")
os.makedirs(AQUI, exist_ok=True)
F = Font(name="Segoe UI", size=10)
REG = ["Nordeste", "Sul", "Norte", "Sudeste"]


def base(nome, ajuste=None):
    wb = openpyxl.Workbook()
    capa = wb.active
    capa.title = "Capa"
    capa["B2"] = "Relatório"; capa["B2"].font = Font(name="Segoe UI", size=18, bold=True)
    capa.sheet_view.showGridLines = False
    ws = wb.create_sheet("Dados")
    ws.sheet_view.showGridLines = False
    ws.append(["Regional", "Diocese", "Valor"])
    for i in range(60):
        ws.append([REG[i // 15], f"Diocese {i:02d}", i * 10])
    for row in ws.iter_rows():
        for c in row:
            c.font = F
    for r in range(1, 62):
        ws.row_dimensions[r].height = 15
    ws.column_dimensions["A"].width = 16
    ws.column_dimensions["B"].width = 18
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = "A1:C61"
    if ajuste:
        ajuste(wb, ws)
    wb.save(os.path.join(AQUI, f"{nome}.xlsx"))


base("bom")
base("grade-visivel", lambda wb, ws: setattr(ws.sheet_view, "showGridLines", True))
base("abre-no-meio", lambda wb, ws: setattr(wb, "active", 1))
base("sem-congelar", lambda wb, ws: setattr(ws, "freeze_panes", None))


def suprime(wb, ws):  # armadilha 4: rótulo repetido apagado na aba de filtro
    for r in range(2, 62):
        if (r - 2) % 15:
            ws.cell(r, 1).value = None
base("supressao-no-filtro", suprime)


def corta(wb, ws):  # coluna estreita, texto longo, vizinho ocupado
    ws.column_dimensions["B"].width = 6
base("texto-cortado", corta)


def serra(wb, ws):  # wrap_text gera altura variável numa tabela longa
    for r in range(2, 62):
        ws.row_dimensions[r].height = (15, 30, 45)[r % 3]
        ws.cell(r, 2).alignment = Alignment(wrap_text=True)
base("grade-serrada", serra)


def formulas(wb, ws, intruso=False, div0=False):
    for r in range(2, 62):
        ws.cell(r, 4).value = f"=C{r}*2"
    if intruso:
        ws["D30"] = "=C30*3"            # a fórmula que foge do padrão da coluna
    if div0:
        ws["D40"] = "=C40/0"
base("formula-sem-cache", lambda wb, ws: formulas(wb, ws))
base("formula-fora-do-padrao", lambda wb, ws: formulas(wb, ws, intruso=True))
base("_div0-sem-cache", lambda wb, ws: formulas(wb, ws, div0=True))

# Excel recalcula e salva: agora há VALOR EM CACHE, inclusive o #DIV/0!
origem = os.path.join(AQUI, "_div0-sem-cache.xlsx")
destino = os.path.join(AQUI, "formula-com-erro.xlsx")
ps = f"""
$x = New-Object -ComObject Excel.Application; $x.Visible = $false; $x.DisplayAlerts = $false
try {{ $w = $x.Workbooks.Open('{origem}'); $x.CalculateFull(); $w.SaveAs('{destino}', 51); $w.Close($false) }}
finally {{ $x.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($x) }}
"""
if shutil.which("pwsh") or shutil.which("powershell"):
    r = subprocess.run([shutil.which("pwsh") or "powershell", "-NoProfile", "-Command", ps], capture_output=True, text=True, timeout=120)
    print("  excel:", "ok" if os.path.exists(destino) else f"FALHOU {r.stderr[-200:]}")
os.remove(origem)
print("  fixtures de planilha em", AQUI)
