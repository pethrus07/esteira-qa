# esteira-qa

[English](README.md)

Uma esteira de QA universal. Mede qualquer peça antes de ela chegar a uma pessoa (PDF, documento HTML, imagem, áudio, vídeo, planilha, página web, código, sistema logado) e reprova o que está quebrado. Ela reprova; não aprova. Gosto, tom e adequação ao cliente continuam sendo julgamento humano.

## Status

Ativo (2026-11). Repositório privado (`github.com/pethrus07/esteira-qa`). Usado todo dia como a skill `qa` do Claude Code.

## O problema

Nasceu de uma nota 8,5 dada a vídeos que ninguém tinha assistido, e de 35 scripts de QA reescritos do zero em 10 projetos. Cada projeto media de um jeito, e algumas "aprovações" eram opinião. Aqui cada formato tem um instrumento, cada limite diz de onde vem, e formato sem instrumento sai INCOMPLETO, nunca "passou".

## Formatos

| Formato | Entrada | Instrumento | Estado |
|---|---|---|---|
| PDF | `.pdf` | `instrumentos/pdf.py` | 8 fixtures, variância zero, 10 PDFs reais |
| Documento HTML | `.html` (com `@page`) | `instrumentos/dom.mjs` | 11 fixtures, variância zero, 8 peças aprovadas |
| Par HTML × PDF | os dois juntos | `instrumentos/cobertura.py` | 4 casos, 0 falso positivo em 4 pares reais |
| Marca | `--marca` / `.qa.json` | `nucleo/marca.mjs` + `regua/marcas/` | 2 marcas completas, 2 parciais |
| Imagem / arte | `.png .jpg .webp .tif` | `instrumentos/imagem.py` | 10 casos, JPEG validado contra verdade conhecida |
| Áudio e vídeo | `.mp4 .webm .wav .mp3 .m4a` | `instrumentos/midia.mjs` | 11 casos, `--perfil tutorial` |
| Planilha | `.xlsx` | `instrumentos/planilha.py` | 10 casos |
| Web | URL, ou `--web` num HTML | `instrumentos/web.mjs` | 6 casos, variância do LCP medida |
| Sistema logado | um `.json` de perfil do sistema | `instrumentos/sistema.mjs` | fixture com um defeito por camada e uma versão boa; trava de escrita testada por mutação; relatório de N0 a N4 |
| Código | `.js .mjs` ou uma pasta | `instrumentos/codigo.mjs` | 7 casos; TypeScript ainda não medido (aparece como aviso) |

## A régua, em camadas

```
regua/padrao.json              universal: todo limite declara de onde vem
  └─ regua/marcas/<marca>      fontes, paleta (ΔE2000), P&B, naming
       └─ regua/perfis/<tipo>  limites ancorados num TIPO de peça (tutorial...)
            └─ .qa.json         o que é só do projeto: {"marca": "ryze", "perfil": "tutorial"}
```

Cada veredito sai com a procedência ao lado: `norma` (WCAG, ISO, EBU), `ancora` (calibrado em peça com veredito humano), `estrutural` (defeito binário), `mercado` (convenção sem estudo), `arbitrado?` (ninguém mediu).

## Stack

Node.js (ES modules) com Playwright 1.62, axe-core e ESLint. Python 3 com PyMuPDF, Pillow e openpyxl para PDF, imagem e planilha. ffmpeg e ffprobe para mídia. Chrome para imprimir HTML em PDF. Modelos opcionais de qualidade de voz e de transcrição, cada um na sua venv (caminhos em `nucleo/ambiente.mjs`).

## Rodar localmente

```
npm install
node qa.mjs <peça|pasta|url> [outra ...] [--marca ryze] [--perfil tutorial] [--destino tela|impressao|grafica] [--json]
# sistema logado (só leitura): node qa.mjs <perfil-do-sistema>.json [--contas a,b]
# mídia: --voz (qualidade da voz) · --fala texto.txt (transcrição reversa) · imagem: --tamanho-mm 150
```

Saída: `0` passou, `1` reprovado ou ilegível, `3` incompleto.

O modo de sistema logado entra em sistema real de produção com credencial do 1Password, e só lê. Perfil de sistema de cliente mora no repositório do projeto do cliente, não aqui. O único perfil daqui é a fixture de teste (`fixtures/sistema/`).

`nucleo/ambiente.mjs` aponta para executáveis na máquina Windows do autor. Em outra máquina, ajuste esses caminhos antes.

## Testes

```
npm test
```

Roda `testes/todos.mjs`: 11 suítes, uma por instrumento mais cor e marca. Cada suíte gera uma fixture por defeito pelo mecanismo real, confere se o instrumento enxerga o defeito, e se a versão boa passa. Um dos testes roda o instrumento de código no próprio repositório. Tudo contra servidor local (127.0.0.1). Ainda não há CI.

## Pastas

```
qa.mjs                 o comando único
instrumentos/          medem e devolvem JSON; não julgam
nucleo/                ambiente (executáveis), régua, cor, marca, credencial
regua/                 limites com procedência; marcas; perfis de peça
fixtures/              um arquivo por defeito, gerado pelo mecanismo real
testes/                assinatura do defeito mais a medida do instrumento
ferramentas/           apoio para sessão ao vivo (não são instrumentos)
claude/skills/qa/      a skill do Claude Code que conduz a esteira
docs/arquitetura/      diagramas (UML, BPMN, C4)
reports/, research_notes/             a régua comparada com normas
```

## Decisões e limites conhecidos

- Medir é separado de julgar: o instrumento devolve número, a régua decide.
- Limite sem procedência medida aparece como `arbitrado?`, em vez de ficar escondido.
- `ferramentas/sessao.mjs` não tem trava de escrita (é a ferramenta do nível 2, onde cada passo é escrito e lido à mão antes de mandar). O instrumento de sistema logado tem.
- Lições com a medição de cada uma: [LICOES.md](LICOES.md).
- O método: [claude/skills/qa/SKILL.md](claude/skills/qa/SKILL.md).

## Arquitetura

Ver [docs/arquitetura/](docs/arquitetura/).

## Licença

MIT. Veja [LICENSE](LICENSE).
