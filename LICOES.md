# Lições da esteira de QA

Registro vivo do que custou caro e do que funcionou. Cada item tem a
**medição** que o sustenta. Continua o
[`LICOES.md` dos tutoriais](../qa-empresa/tutoriais/LICOES.md), de onde
veio o método; aqui fica o que apareceu ao generalizar para outros formatos.

Escrito para quem for mexer na esteira depois, inclusive eu.

---

## Por que a esteira existe: o inventário de 08/10

Antes de escrever uma linha, catalogamos os scripts de QA que já existiam:
**35 scripts em 10 projetos**, quase todos reescritos do zero.

| checagem | reescrita | limites encontrados |
|---|---|---|
| erro de console / `pageerror` | **9×** | — |
| rolagem horizontal | 6× | — |
| fonte Type3 | 5× | sempre "0", sem distinguir emoji (exceto Pesquisa X) |
| número da prosa existe nos dados | 5× | — |
| medida da página | 4× | ±0,3 · ±0,5 mm |
| folha vazia | 4× | **120 · 40 caracteres**, nenhum com procedência |
| contraste | 3× | **2,2 · 3 · 4,5**, o 2,2 "sem justificativa" |

Três limites de contraste para a mesma pergunta é o erro dos "25% de
imagem parada" repetido em outro formato. **Regra:** limite sem
procedência aparece no boletim como `arbitrado?`.

---

## PDF (08/10)

### Erros de INSTRUMENTO (a régua media errado e eu lia confiante)

| o que | sintoma | causa | conserto |
|---|---|---|---|
| console do Git Bash | acentos viraram `�`, pareceu **glifo perdido** num PDF íntegro | Python escreve em cp1252 | `PYTHONIOENCODING=utf-8` em todo Python; contar **dentro** do instrumento |
| fonte "não embutida" | Type3 contada como não embutida, dobrando o defeito | PyMuPDF dá `ext="n/a"` para Type3 (os glifos são procedimentos, não arquivo) | não embutida = não-Type3 com `n/a` |
| glifo perdido | **0** num arquivo com 2 glifos perdidos | procurava U+FFFD e uso privado; o Chrome grava **U+0000** (`.notdef`) | contar caractere de controle |
| texto em Type3 | **0 caractere** num PDF 100% Type3 | o span se chama `"Type3 (4 0 R)"`, não `F4` como na lista de fontes | casar pelo número do objeto |
| Type3 defeituosa | **reprovou o Pesquisa X Vol. II ENTREGUE** | as 2 fontes "defeituosas" só desenhavam 🙏 e 👉 de respondentes | defeituosa só se desenha texto que não é emoji |
| ppi efetivo | 72 ppi na capa do Pesquisa X entregue | gradiente de fundo rasterizado do tamanho da folha | fundo (≥90% da folha) fora da conta |

O caso do Pesquisa X Vol. II mostra **a âncora funcionando**: uma peça aceita foi
reprovada, e isso levou ao defeito do instrumento. O limite continuou 0.
Afrouxar a régua para a peça passar seria o erro nº 6 do protótipo.

### Erros de MÉTODO

**Fixture sem defeito testa nada.** Os primeiros arquivos de defeito
saíram do `page.setContent` + `page.pdf` do Playwright, e **3 de 6 não
tinham o defeito**. A fonte variável não carregou (`about:blank` não lê
`file://`) e a folha extra não nasceu (`page.pdf` não é o caminho do
`--print-to-pdf`). Com o instrumento medindo 0 "corretamente", tudo parecia
certo. **Regra:** cada fixture é conferida pela **assinatura** do defeito,
lida sem o instrumento (bytes crus, páginas no PDF × folhas no HTML), e
gerada pelo **mesmo caminho** da produção (`chrome.exe --print-to-pdf`).

**Três medidas iguais eram três nadas.** Para medir a variância, rodei o
instrumento 3× e saíram 3 hashes idênticos: `d41d8cd9…`, o MD5 de arquivo
vazio. O `/usr/bin/time` não existe no Git Bash e o comando nem rodou. É a
lição 3 do protótipo ("número igual demais"), e caí nela na hora. Medida
refeita: 1444 bytes, idêntica nas 3 → **variância zero, medida**.

**Teste que nunca falha não testa.** O caminho "Type3 bitmap com texto
reprova" não tem fixture real: tentei dígitos em Segoe UI Emoji e saíram
Type0. Em vez de fingir, a regra virou função pura testada com entrada
**marcada SINTÉTICA**. E a suíte passou por **mutação**: com a regra
estragada de volta ao erro do Pesquisa X, os dois testes acusaram.

### Descobertas que corrigem regras antigas

- **Type3 ≠ texto perdido.** Nos PDFs do Atas, todos os 896 glifos Type3
  são **vetor** e têm `/ToUnicode`: o texto é pesquisável e imprime nítido.
  A nota antiga ("Type3 = não selecionável") valia para o caso sem
  ToUnicode. Type3 vetorial virou **aviso**; bitmap ou sem ToUnicode,
  desenhando texto, **reprova**.
- **`height:297mm` puro não gera mais folha extra no Chrome 154.** Testei 4
  estruturas (break-after sempre, auto na última, break-before, flex) e todas
  deram 2 páginas. A armadilha foi medida em 27/07 numa estrutura que não
  reproduzi, então **não concluo que foi corrigida**, só que esses 4 casos
  não reproduzem. O `296mm` continua sendo a escolha segura.
- **Conteúdo mais largo que a folha faz o Chrome REDUZIR A ESCALA do
  documento inteiro**, sem aviso: uma folha de 230mm encolheu ~9% para
  caber na A4. Não deixa rastro no PDF, então é trabalho do instrumento `dom`.
- **Folha vazia se mede pela tinta**, não por contagem de caracteres.
  Folha de abertura ("Parte II") tem pouco texto e é legítima; a folha
  extra de transbordo não tem tinta nenhuma.

### Achado em peça real

**Os PDFs do Atas saem 100% em Type3** (ata e entregável, 8 mil a 14 mil
caracteres cada). Causa: o HTML puxa as fontes do endpoint `css2` do Google
Fonts, que entrega fonte variável. É a armadilha nº 2 da receita do PDF
RYZE, que o Atas não aplicou. O dano é aviso, não reprovação (ver acima).
O conserto é barato: congelar os pesos em TTF estático.

---

## DOM e cobertura (08/10)

### A pergunta que tirou o nome de classe da régua

O `qa_layout.js` do Pesquisa X procurava `.page`, `.main`, `.ft`, `.duasc`. Aqui a
pergunta é **"existe texto que o leitor não consegue ver?"**: para cada nó
de texto, a caixa real das linhas (`Range.getClientRects`) contra a área
visível de todo ancestral que corta. Funciona em qualquer HTML.

### Erros de INSTRUMENTO

| o que | sintoma | causa | conserto |
|---|---|---|---|
| largura da folha | **as 6 peças APROVADAS** com "excesso" de 174 a 646px | medi numa janela de 1440px; `emulateMedia('print')` não muda a largura, e todo `width:100%` ficou com 1440 | ler o `@page` e pôr a janela na largura da folha **antes** de medir qualquer coisa |
| idem | enfeite "blob" de 968px acusado | peguei o elemento mais largo, inclusive o que um ancestral corta | `scrollWidth` do documento, que é o critério do próprio Chrome |
| `@page` | "não medido" na fixture feita para isso | `rule.style.size` vem vazio no Chrome; e o valor sai `"a4"` minúsculo | `getPropertyValue('size')` + normalizar |
| sobreposição | folha cortada contava o mesmo defeito 2× | os parágrafos cortados continuam no layout, por baixo do rodapé | excluir o bloco já contado como cortado |
| lixo de template | `null` acusaria o guia de NoSQL | herdado de uma UI de jogo (Mesa de Arton) | `null` fora; `undefined`, `NaN`, `{{}}`, `${}` ficam |

O primeiro é o princípio "medir na granularidade que o produto produz",
violado pelo próprio instrumento. Texto que só se corta a 794px nunca
apareceria medido a 1440px.

### Hipótese que NÃO se sustentou

A cobertura (HTML × PDF) nasceu para pegar "o que some na paginação":
bloco com `break-inside:avoid` maior que a coluna, que no Pesquisa X "foi apagado
inteiro". **Em 5 estruturas de documento corrido** (colunas, bloco solto,
flex, inline-block, linha de tabela) **o Chrome 154 não apagou nada**: 70
de 70 parágrafos no PDF. O caso do Pesquisa X acontece em folha de altura fixa, e
esse o DOM já pega sozinho.

O que **só** a cobertura pega é o **PDF defasado** (HTML corrigido, PDF
velho), "o pior erro da série" no documento gerado de dados. Por isso ela
passou a comparar **números**: o 57% que virou 58,4% não muda nenhuma
palavra de 4 letras. Na fixture, 99,05% das palavras bateram, e **1 número**
denunciou o par.

### Calibração

- DOM: 5 peças aprovadas (Pesquisa X Vol. I, Caderno, proposta e fechamento
  Desbravando, entregável Atas) → zero achado. 9 fixtures, cada uma com a
  assinatura conferida **no PDF que o Chrome imprime**, não no instrumento.
- Cobertura: 4 pares aprovados → 100%, inclusive 14.393 palavras e 3.259
  números do Pesquisa X Vol. I. **Zero falso positivo.**
- Variância: DOM com 3 execuções idênticas (720 e 1223 bytes; conferi o
  tamanho junto com o hash, por causa dos "três nadas iguais" do PDF).
- A redução de escala por largura ficou provada por **segunda via**: a
  folha de 230mm impressa sai com corpo de letra < 10,45pt no PDF.

### Armadilha de ambiente, de novo

Patch com regex via `sed` no Git Bash **não aplicou nada**, sem erro. É a
mesma família do `node -e` que come contrabarra. Regex vai de Edit/Write.
