---
name: qa
description: Esteira de QA do Pedro — mede qualquer peça ANTES de ela chegar a uma pessoa (PDF, HTML/documento, arte, áudio, vídeo, planilha, página web, código) e reprova o que está quebrado, com régua universal + régua da marca (RYZE, Empresa A, Celiware, Desbravando…). Use SEMPRE antes de entregar, enviar ou dar opinião/nota sobre uma peça, e quando o Pedro disser "/qa", "revisa", "confere", "faz o QA", "passa na esteira", "tá bom pra mandar?", "confere o PDF/o vídeo/a arte", "está no padrão da marca?". Nunca dê nota a peça não medida.
---

# Esteira de QA

A esteira mora em `~/Projetos/esteira-qa` (repo git). Esta skill é um link
para dentro dele: o método e o código andam juntos.

## Por que existe

Em 03/09/2026 dei nota 8,5 a quatro vídeos que nunca assisti. O Pedro
apresentou com base nela e passou vergonha. O defeito (94% de imagem parada)
levava 3 minutos para medir. Desde então: **nada sai sem instrumento.**
Opinião sobre peça não medida não vale, principalmente a minha.

## Como usar

```bash
node ~/Projetos/esteira-qa/qa.mjs <peça|pasta|url> [outra ...] [--marca ryze] [--perfil tutorial] [--destino tela|impressao|grafica] [--json]
# áudio/vídeo: --voz (NISQA) · --fala texto.txt · imagem: --tamanho-mm 150 · HTML como página: --web
```

PDF, HTML, imagem, áudio, vídeo, planilha, página no ar (URL) e código
(arquivo `.js` ou pasta de projeto) já têm instrumento.

- **Perfil** (`--perfil tutorial`, ou `"perfil"` no `.qa.json`): limite
  ancorado num **tipo** de peça. Os limites de tela morta vieram de
  tutoriais e só valem com o perfil; fora dele, informam.

- **HTML e PDF da mesma peça juntos** (`x.html x.pdf`): mede os dois e o
  **par** (cobertura). Só o par pega o PDF defasado, com o HTML corrigido e
  o PDF velho, que foi "o pior erro da série".
- **Marca:** `--marca` ou `.qa.json` na pasta do projeto: `{"marca": "ryze"}`.
  Marcas em `regua/marcas/`. O que a marca não documenta sai como
  `? a confirmar`; leve ao Pedro como pergunta, não invente.
- Saída: `0` passou · `1` reprovado/ilegível · `3` incompleto.

Formatos com instrumento hoje: ver a tabela do `README.md` do repo. Formato
sem instrumento sai **INCOMPLETO**, nunca "passou".

## Como reportar ao Pedro

Três estados, nunca misturados (regra "reportado não é verificado"):

- **medido e passou** (com o número);
- **medido e reprovou** (com o número, o limite e de onde o limite vem);
- **não medido** (e por quê).

O boletim imprime a **procedência** de cada limite: `norma` · `ancora` ·
`estrutural` · `mercado` · `arbitrado?`. Limite arbitrado nunca é
apresentado como régua.

A esteira **reprova; ela não aprova.** Gosto, tom, adequação ao cliente e
timbre seguem julgamento humano. Diga isso quando passar.

## O método (vale para tudo, inclusive para estender a esteira)

1. **Nada sai sem instrumento.**
2. **Medir a variância do instrumento antes de otimizar contra ele.**
   Diferença menor que o ruído da medida é superstição.
3. **Medir na granularidade que o produto produz.** O DOM medido a 1440px
   não via o que se corta a 794px; amostra curta escolheu a voz errada.
4. **Calibrar limite em âncora com veredito humano**, nunca em número
   arbitrado. Gate que reprova o que o dono aprovou mede opinião.
   **Exceção:** âncora não revoga **norma** publicada (WCAG, EBU R128). Aí o
   achado sobe como pergunta.
5. **A esteira reprova, não aprova.**
6. **Zero medido ≠ zero por falta de medição ≠ não se aplica.** Arquivo
   ilegível é ILEGÍVEL; instrumento que falhou deixa INCOMPLETO.
7. **Número que não se move quando tudo em volta se move aponta para o
   que ficou de fora.** E três números idênticos podem ser três nadas
   (o MD5 `d41d8cd9…` é de arquivo vazio).

## Ao estender (novo formato, nova checagem, nova marca)

Na ordem, sem pular:

1. **Fixture de defeito gerada pelo mecanismo REAL** da produção (o
   `page.pdf` não reproduziu o que o `chrome --print-to-pdf` reproduz).
2. **Assinatura conferida sem o instrumento**: o defeito existe mesmo?
   (3 de 6 fixtures nasceram sem defeito.)
3. **O instrumento acusa** a fixture e **poupa** o arquivo bom.
4. **Mutação**: estrague a regra e veja o teste falhar.
5. **Variância**: 3 execuções; confira hash **e tamanho**.
6. **Calibração em peça real aprovada.** Se reprovar a aprovada, o
   suspeito é o instrumento (Pesquisa X Vol. II: eram emoji de respondente).
7. **Veredito escrito** no cabeçalho do instrumento e no `LICOES.md`,
   com a medição. Ideia descartada fica registrada para não voltar.

`npm test` no repo roda todas as suítes. Instrumento só entra no `qa.mjs`
depois de passar nelas.

## Armadilhas que já custaram caro

- Git Bash: Python escreve em cp1252 (acento vira `�` e **parece** glifo
  perdido): o núcleo força `PYTHONIOENCODING=utf-8`. Regex via `sed`/`node -e`
  perde contrabarra **sem erro**: patch com regex vai de Edit/Write.
- Chrome: `--print-to-pdf` com caminho relativo grava em outra pasta.
  Fonte variável do Google Fonts (`css2`) sai Type3. Conteúdo mais largo
  que a folha faz o Chrome **reduzir a escala de tudo** sem avisar.
- Sonda CDP altera o medido (efeito do observador): fotografe console e
  rede antes.
