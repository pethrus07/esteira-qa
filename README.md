# esteira-qa

Mede qualquer peça antes de ela chegar a uma pessoa, e **reprova** o que
está quebrado. Gosto, tom e adequação continuam sendo julgamento humano.

```bash
node qa.mjs <peça> [outra ...] [--marca ryze] [--destino tela|impressao|grafica] [--json]
npm test        # prova que cada instrumento enxerga o que diz enxergar
```

Nasceu de uma nota 8,5 dada a vídeos que nunca foram assistidos e de 35
scripts de QA reescritos do zero em 10 projetos. O método está em
[`claude/skills/qa/SKILL.md`](claude/skills/qa/SKILL.md); o que custou caro, com
a medição de cada lição, em [`LICOES.md`](LICOES.md).

## Formatos

| formato | extensão | instrumento | estado |
|---|---|---|---|
| PDF | `.pdf` | `instrumentos/pdf.py` | ✓ 8 fixtures · variância 0 · calibrado em 10 PDFs reais |
| documento HTML / página | `.html` | `instrumentos/dom.mjs` | ✓ 11 fixtures · variância 0 · calibrado em 8 peças aprovadas |
| par HTML × PDF | os dois juntos | `instrumentos/cobertura.py` | ✓ 4 casos · 0 falso positivo em 4 pares reais |
| marca | `--marca` / `.qa.json` | `nucleo/marca.mjs` + `regua/marcas/` | ✓ RYZE, Desbravando · parcial: Empresa A, Celiware |
| imagem / arte | `.png .jpg .webp .svg` | — | a construir |
| áudio | `.wav .mp3 .m4a` | protótipo em `qa-empresa/tutoriais/esteira` | a generalizar |
| vídeo | `.mp4 .webm` | protótipo em `qa-empresa/tutoriais/esteira` | a generalizar |
| planilha | `.xlsx` | checklist da skill `planilha-premium` | a transformar em medição |
| web (tela, acessibilidade, peso) | URL | — | a construir |
| código | `.js .ts .mjs` | — | a construir |

Formato sem instrumento sai **INCOMPLETO**, nunca "passou".

## A régua em três camadas

```
regua/padrao.json            universal — todo limite declara procedência
  └─ regua/marcas/<marca>    fontes, paleta (ΔE2000), P&B, naming
       └─ .qa.json            o que é só do projeto: {"marca": "ryze", "pdf": {...}}
```

Procedência impressa ao lado de cada veredito: `norma` (WCAG, ISO, EBU) ·
`ancora` (calibrado em peça com veredito humano) · `estrutural` (defeito
binário) · `mercado` (convenção sem estudo) · `arbitrado?` (ninguém mediu).

## Estrutura

```
qa.mjs                 o comando único
instrumentos/          medem e devolvem JSON; não julgam
nucleo/                ambiente (executáveis), régua, cor, marca
regua/                 limites com procedência; marcas
fixtures/              um arquivo por defeito, gerado pelo mecanismo real
testes/                assinatura do defeito + medida do instrumento
claude/skills/qa/      a skill (junction em ~/.claude/skills/qa)
```
