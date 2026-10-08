# Padrões de mercado para QA de PDF e de saída HTML→PDF (relatórios, propostas, atas)

Escopo: comparar os checks da esteira-qa com o que normas ISO (PDF/A, PDF/UA, PDF/X), a especificação GWG e ferramentas de preflight/validação dizem. Pesquisa feita em 08/10/2026. Fonte primária mais forte: os perfis de validação do veraPDF (XML legível por máquina, um por norma) e o PDF da especificação GWG2015 (família Heatset/Coldset, baixado de gwg.org). Notação: **[ISO]** = exigência normativa ("shall"); **[GWG]** = especificação da indústria com severidade explícita; **[convenção]** = prática de mercado sem âncora normativa.

## 1. O que PDF/A, PDF/UA e PDF/X exigem sobre fontes Type3, embedding, ToUnicode, .notdef e metadados — e se Type3 vetorial com ToUnicode é conforme

### Takeaway
Nenhuma norma ISO de PDF que verifiquei proíbe fontes Type3. PDF/A-2/3/4 e PDF/UA-1/2 tratam Type3 como "embutida por definição" e exigem: (a) que os glifos referenciados existam, (b) nenhuma referência a `.notdef`, (c) ToUnicode presente, mas só nos níveis PDF/A "U"/"A" e em PDF/UA (no PDF/A-*b não). Então uma Type3 vetorial com ToUnicode válido é **conforme** em PDF/A-2u/3u/4 e PDF/UA-1/2. O WARNING da esteira para ela é *mais rígido* que as normas: é uma escolha de política, justificável pelo risco de pré-impressão, e não uma exigência normativa. Já o FAIL para "Type3 sem ToUnicode desenhando texto" bate com PDF/UA e PDF/A-U.

### Cited Findings
- **Type3 dispensada da exigência de embedding (PDF/A-2, 6.2.11.4.1):** "The font programs for all fonts used for rendering within a conforming file shall be embedded". O teste de máquina do veraPDF é `Subtype == "Type3" || Subtype == "Type0" || renderingMode == 3 || containsFontFile == true`, ou seja, Type3 passa automaticamente. — [veraPDF profile PDFA-2B.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_A/PDFA-2B.xml)
- A mesma regra, com o mesmo teste que isenta a Type3, aparece no PDF/A-4 (6.2.10.4.1), no PDF/UA-1 (7.21.4.1) e no PDF/UA-2 (8.4.5.5.1). — [PDFA-4.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_A/PDFA-4.xml); [PDFUA-1.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_UA/PDFUA-1.xml); [PDFUA-2.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_UA/PDFUA-2.xml)
- Type3 consta da lista de subtipos de fonte válidos (PDF/A-2 6.2.11.2, teste `Subtype == "Type1" || … || Subtype == "Type3" || …`). — [PDFA-2B.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_A/PDFA-2B.xml)
- **Glifo ausente:** "Embedded fonts shall define all glyphs referenced for rendering" (PDF/A-2 6.2.11.4.1 teste 2; PDF/UA-1 7.21.4.1 teste 2). Fontes usadas só em rendering mode 3 (texto invisível, como em camada OCR) ficam isentas. — [PDFA-2B.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_A/PDFA-2B.xml); [PDFUA-1.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_UA/PDFUA-1.xml)
- **.notdef proibido em todos os níveis, inclusive "b":** "shall not contain a reference to the .notdef glyph from any of the text showing operators, regardless of text rendering mode" (PDF/A-2 6.2.11.8; PDF/A-3 6.2.11.8; PDF/A-4 6.2.10.9; PDF/UA-1 7.21.8; PDF/UA-2 8.4.5.9). — [PDFA-2B.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_A/PDFA-2B.xml); [Ghostscript bug 708479 (PDF/A-3b reprovado por .notdef)](https://bugs.ghostscript.com/show_bug.cgi?id=708479)
- **ToUnicode, nível U (PDF/A-2u, 6.2.11.7.2):** "The Font dictionary of all fonts shall define the map of all used character codes to Unicode values, either via a ToUnicode entry, or other mechanisms" (teste `toUnicode != null`). Além disso, "The Unicode values specified in the ToUnicode CMap shall all be greater than zero (0), but not equal to either U+FEFF or U+FFFE". — [veraPDF PDFA-2U.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_A/PDFA-2U.xml)
- **PDF/A-4** não tem mais os níveis a/b/u. Mantém só a regra "*if* a ToUnicode CMap is present, values > 0 and ≠ U+FEFF/U+FFFE" (6.2.10.7): a presença de ToUnicode **não** é obrigatória no PDF/A-4 básico. — [PDFA-4.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_A/PDFA-4.xml)
- **PDF/UA-1 7.21.7 e PDF/UA-2 8.4.5.8:** mapa Unicode obrigatório para todas as fontes (`toUnicode != null`), incluindo Type3. — [PDFUA-1.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_UA/PDFUA-1.xml); [PDFUA-2.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_UA/PDFUA-2.xml)
- **Área de uso privado (PUA), PDF/UA-2:** 8.4.3 diz "where real content maps to Unicode PUA values, an ActualText or Alt entry shall be present". 8.6 diz "Text strings intended to be human readable shall not use the Unicode PUA". — [PDFUA-2.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_UA/PDFUA-2.xml)
- **Larguras dos glifos:** dicionário e programa da fonte devem bater, com tolerância de 1 unidade (`Math.abs(widthFromFontProgram - widthFromDictionary) <= 1`) (PDF/A-2 6.2.11.5; PDF/UA-1 7.21.5). — [PDFA-2B.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_A/PDFA-2B.xml)
- **Metadados, PDF/UA-1 7.1:** "The Metadata stream … shall contain a dc:title entry" (teste 9) e "ViewerPreferences dictionary containing a DisplayDocTitle key, whose value shall be true" (teste 10). PDF/UA-2 repete as duas regras (8.11.1 e 8.11.2). — [PDFUA-1.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_UA/PDFUA-1.xml); [PDFUA-2.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_UA/PDFUA-2.xml)
- **Idioma:** PDF/UA-2 8.4.4 exige "Lang entry, with a non-empty value, in the catalog dictionary". No PDF/UA-1 7.2, o idioma do texto da página tem de ser determinável (`gContainsCatalogLang == true || Lang != null`). — [PDFUA-2.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_UA/PDFUA-2.xml); [PDFUA-1.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_UA/PDFUA-1.xml)
- **Cor no PDF/A-2 (6.2.4.3):** DeviceRGB/CMYK/Gray só são permitidos com espaço de cor Default* independente de dispositivo ou com um OutputIntent PDF/A compatível. Na prática, um PDF do Chrome (DeviceRGB, sem OutputIntent) não é PDF/A sem pós-processamento. — [PDFA-2B.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_A/PDFA-2B.xml)
- O Matterhorn Protocol 1.1 é o algoritmo de conformidade para PDF/UA-1. Seus checkpoints 31-027/028/029 tratam de extração de texto e mapeamento Unicode. A página da PDF Association devolveu 403 e não consegui abrir o PDF do protocolo. — [busca: pdfa.org](https://pdfa.org/?p=162697); [axes4 support](https://support.axes4.com/hc/en-us/articles/7371586760210)
- Sem ToUnicode, "the text content of type 3 glyphs is generally not recoverable". — [ABCpdf docs, Type3 ToUnicode](https://websupergoo.com/helppdfnet/source/9-abcpdf.elements/09-text/1266-type3fontelement/2-properties/12-entrytounicode.htm)

### Inferences
- Situação da esteira por check:
  - **Type3 vetorial + ToUnicode = WARNING** → mais rígida que PDF/A-2u/3u/4 e PDF/UA-1/2, que a aceitam. Manter como WARNING é defensável pelo risco de pré-impressão (seção 2), mas a proveniência deve ser "política interna / risco de RIP", **não** ISO.
  - **Type3 sem ToUnicode = FAIL** → bate com PDF/UA (7.21.7 / 8.4.5.8) e PDF/A-2u/3u. Para PDF/A-2b/4 seria apenas não-acessível, não não-conforme.
  - **Type3 bitmap = FAIL** → nenhuma norma ISO proíbe bitmap Type3. É política de qualidade (legibilidade e ampliação), não norma.
- **"Fonte não embutida = FAIL, cita ISO 19005"** → correto. Refinar: a regra isenta fontes usadas só em rendering mode 3 (texto invisível). Se a esteira reprova texto invisível não embutido, é mais rígida que a norma.
- **"Glifo faltando (U+0000/.notdef, U+FFFD) = FAIL"** → bate com a norma no caso .notdef (proibido até no nível b) e no caso U+0000 no ToUnicode (proibido em PDF/A-U, PDF/A-4 e PDF/UA). U+FFFD no ToUnicode não é proibido nominalmente por nenhuma regra que encontrei; o FAIL aqui é política (texto extraído corrompido).
- **"PUA = WARNING"** → mais frouxa que PDF/UA-2, que exige ActualText/Alt quando conteúdo real mapeia para PUA. Para emoji e ícones (ex.: fontes de ícone), o correto pela PDF/UA-2 seria marcar como artefato ou dar Alt.
- **"dc:title ausente = info (cita PDF/UA)"** → mais frouxa que a norma citada. No PDF/UA, dc:title é *shall*, e DisplayDocTitle=true também é obrigatório. Se a citação for PDF/UA, a severidade coerente é WARNING (ou FAIL quando o alvo for acessibilidade). Falta checar DisplayDocTitle e /Lang.
- Uma "verificação de norma" de verdade passa por rodar o veraPDF com o perfil apropriado em vez de reimplementar regras. A esteira cobre só a fatia de fontes e glifos.

### Gaps
- **PDF/X-4 (ISO 15930-7:2010) e Type3:** não consegui o texto normativo. A GWG2015 (baseada em PDF/X-4) não tem nenhuma regra específica sobre Type3 (grep em "Type 3" no PDF da spec: zero ocorrências), o que sugere que PDF/X-4 aceita Type3, já que ela é embutida por definição. Isso não está confirmado.
- **Texto do Matterhorn 1.1:** não acessado (pdfa.org devolveu 403). Os números dos failure conditions do checkpoint 31 (fontes) não foram confirmados individualmente além de 31-027/028/029.
- **PDF/A-1 (ISO 19005-1):** não extraí o perfil. Lembrança não verificada: nível 1a exige ToUnicode em certas condições.
- **Transparência no PDF/X-4 vs PDF/X-1a:** não verificado nesta rodada. A noção de que PDF/X-1a proíbe transparência e RGB é conhecimento comum, mas não foi verificada aqui.

## 2. Preflight de impressão: GWG, Acrobat, callas, PitStop — resolução, fonte mínima, filete, cobertura de tinta, sangria; 300 ppi é exigência ou convenção; o que a gráfica brasileira pede

### Takeaway
A GWG2015 (sobre PDF/X-4) define imagem colorida/cinza com **ERROR ≤149 ppi e WARNING ≤224 ppi** (offset folha, revista, rotativa). Para jornal: ERROR ≤99 e WARNING ≤149. Para imagem 1-bit: ERROR ≤549 e WARNING ≤799. Ou seja, **300 ppi não é limite de reprovação em nenhuma variante GWG**. É convenção (2 × lineatura de 150 lpi), repetida pelas gráficas brasileiras como "mínimo 300 dpi". O FAIL em 300 ppi do perfil "gráfica" é **muito mais rígido** que o padrão da indústria. Defensável só se a gráfica alvo exigir isso por escrito.

### Cited Findings
- **Fonte:** PDF "GWG2015-Specification_Release.pdf" (família Heatset/Coldset, "Based on PDF/X-4:2010", 28 p., hospedado em gwg.org/wp-content/uploads/2026/05/). — [GWG 2015 Specification (download)](https://gwg.org/download/gwg-2015-specification/); [PDF direto](https://gwg.org/wp-content/uploads/2026/05/GWG2015-Specification_Release.pdf)
- **Definição (3.13):** "Effective image resolution is defined by the Width and Height keys of the Image dictionary combined with the current transformation matrix. If the effective image resolution differs between the Width and Height directions, the smaller of the two values applies." — [GWG2015 PDF](https://gwg.org/wp-content/uploads/2026/05/GWG2015-Specification_Release.pdf)
- **Regra 4.26:** a resolução efetiva de imagens de tom contínuo "shall not be lower than or equal to the value defined in the table … unless its width or height is 16 pixels or less". A 4.27 traz o mesmo para 1-bit. — [GWG2015 PDF](https://gwg.org/wp-content/uploads/2026/05/GWG2015-Specification_Release.pdf)
- **Regra 4.28, Single Image Page:** imagem única que cobre ao menos o TrimBox, sem outro conteúdo, tem ERROR ≤149 ppi e WARNING ≤450 ppi (MagazineAds, SheetCmyk, WebCmyk). — [GWG2015 PDF](https://gwg.org/wp-content/uploads/2026/05/GWG2015-Specification_Release.pdf)
- **Tabela por variante, extraída do PDF:**

  | Variante | Texto pequeno (4.16) | Filete (4.17) | TAC (4.22) | Cor/cinza (4.26) err/warn | 1-bit (4.27) err/warn |
  |---|---|---|---|---|---|
  | SheetCmyk/SheetSpot 2015 (offset folha) | Warning 8.0 pt | Warning 0.25 pt | Warning 320% (B=15 mm) | ≤149 / ≤224 ppi | ≤549 / ≤799 ppi |
  | MagazineAds 2015 | Warning 9.0 pt | Warning 0.25 pt | Warning 305% | ≤149 / ≤224 | ≤549 / ≤799 |
  | WebCmyk/WebSpot 2015 (rotativa heatset) | Warning 9.0 pt | Warning 0.25 pt | Warning 305% | ≤149 / ≤224 | ≤549 / ≤799 |
  | NewspaperAds / WebCmykNews 2015 | Warning 10.0 pt | Warning 0.25 pt | Warning 245% | ≤99 / ≤149 | ≤549 / ≤799 |

  — [GWG2015 PDF](https://gwg.org/wp-content/uploads/2026/05/GWG2015-Specification_Release.pdf)
- **Escopo do texto pequeno e do filete:** 4.16 vale só para texto "colored with all colorants having a value equal to 0.0 [vazado/branco] or colored with more than 1 colorant" (texto vazado ou de várias tintas). 4.17 tem o mesmo escopo. Texto preto 100% em uma tinta só **não** tem mínimo na GWG. — [GWG2015 PDF](https://gwg.org/wp-content/uploads/2026/05/GWG2015-Specification_Release.pdf)
- **Outras regras com números:** preto 100% < 12 pt deve sobreimprimir (4.10). Filete preto 100% < 2.0 pt deve sobreimprimir (4.12). Fonte com nome exatamente "Courier" gera warning (4.14). Rich black text com K=0.85, T=2.8 (MagazineAds). Spot colors: 0 permitidas em MagazineAds (Error). — [GWG2015 PDF](https://gwg.org/wp-content/uploads/2026/05/GWG2015-Specification_Release.pdf)
- **Página vazia (4.5):** "A PDF file shall not contain a page which does not contain any print content at all". É ERROR em MagazineAds. A definição é por *objeto* (conteúdo de impressão dentro do BleedBox/TrimBox), não por tinta medida. — [GWG2015 PDF](https://gwg.org/wp-content/uploads/2026/05/GWG2015-Specification_Release.pdf)
- **Page Scaling (4.2)** e **Crop Box (4.3)** são Error, e há a regra de ISO Compliancy = PDF/X-4:2010 (Error). — [GWG2015 PDF](https://gwg.org/wp-content/uploads/2026/05/GWG2015-Specification_Release.pdf)
- A GWG publica configurações de aplicativo "GWG2015_…_250ppi" e "…_350ppi" como alvo de *downsampling* (não de reprovação), com a fórmula "resolution = screening x 2.54 x quality factor". Recomenda limiar de downsampling igual ao dobro do alvo e embedding de fonte em 100%. — [GWG2015 PDF/X Workflow (cópia silo.tips)](https://silo.tips/download/gwg2015-pdf-x-workflow-version-publication-date-february)
- Para offset comercial, a GWG recomenda rejeitar imagem cor/cinza abaixo de 150 ppi e 1-bit abaixo de 550 ppi. O máximo citado é 450 ppi (cor/cinza) e 3600 ppi (1-bit). — [prepressure.com, PDF preflighting](https://www.prepressure.com/pdf/basics/preflight) (agregador, consistente com a spec)
- **Gráficas brasileiras (convenção):** guia da Gráfica da UFRJ: "resolução mínima de imagens … no mínimo, 300 dpi", sangria "de 3 mm a 5 mm além da área de corte", PDF/X-1a com marcas de corte recomendado, fontes não incorporáveis devem virar curvas. — [Gráfica UFRJ, Guia (2024)](https://grafica.ufrj.br/wp-content/uploads/2024/01/GUIA_Versao-Final-1-1.pdf) (conteúdo visto pelo snippet da busca; o PDF não foi aberto integralmente)
- Tutoriais brasileiros repetem PDF/X-1a e marcas de corte como "a forma mais confiável". — [Tecnoblog, fechar arquivo no InDesign](https://tecnoblog.net/355690/como-fechar-um-arquivo-para-impressao-no-indesign/)
- **Type3 e pré-impressão:** "some print and prepress workflows refuse Type 3 outright, which matters for a tool whose output is meant to reach a printer". — [grimoire-press issue #9](https://github.com/Seigiard/grimoire-press/issues/9) (relato de projeto, não norma)

### Inferences
- **Calibração sugerida para o ppi:**
  - perfil "print": WARNING <225 ppi, alinhado à GWG.
  - perfil "gráfica": FAIL <150 ppi e WARNING <225 ppi (GWG SheetCmyk), com opção de elevar para FAIL <300 só quando a gráfica exigir. A proveniência passa de "mercado: 2 × 150 lpi" para "GWG2015 4.26 (SheetCmyk_2015): Error ≤149 / Warning ≤224; gráficas BR pedem 300 por convenção (ex.: UFRJ)".
  - Isentar imagens com ≤16 px de largura ou altura (regra GWG).
  - Usar o menor dos dois eixos (3.13).
  - Tratar 1-bit (line art) com outro limiar (FAIL ≤549, WARN ≤799).
- **A exclusão de "fundo ≥90% da página" do cálculo de ppi diverge da GWG.** A GWG faz o oposto: a imagem que cobre a página inteira (4.28) é verificada com o mesmo erro (≤149) e um warning *mais alto* (≤450). Para fundos decorativos desfocados a exclusão é pragmática, mas é desvio documentável, não alinhamento.
- **Faltando na esteira** (aplicável só ao perfil "gráfica"):
  - tamanho mínimo de texto vazado ou multicor (8 pt offset folha);
  - filete mínimo de 0,25 pt;
  - TAC (320% folha / 305% rotativa / 245% jornal);
  - sangria (TrimBox/BleedBox; 3–5 mm no Brasil);
  - espaço de cor (o Chrome gera RGB e a gráfica BR pede PDF/X-1a = CMYK);
  - conformidade PDF/X;
  - sobreimpressão de preto 100%.
- Para relatórios, propostas e atas que vão a tela ou impressora de escritório, nada disso se aplica. O perfil "gráfica" deveria apontar explicitamente que o PDF do Chrome **não** é PDF/X e precisa de conversão (Ghostscript/callas/Acrobat) ou de aceite da gráfica.
- **"Mixed page sizes = WARNING":** a GWG não tem regra de tamanho único entre páginas na família lida, mas MagazineAds exige exatamente 1 página (4.6). Manter WARNING é razoável.

### Gaps
- A especificação **GWG 2022** (sucessora) não foi lida. A página "Differences between the GWG 2015 and 2022 specifications" existe, mas não a abri ([gwg.org](https://gwg.org/download-category/specifications/)). Os números podem ter mudado.
- A família **sheetfed/commercial print da GWG** pode estar em outro PDF (o lido é "Heatset and Coldset", mas contém as variantes SheetCmyk_2015). A spec de impressão digital ([GWG Digital printing](https://gwg.org/wp-content/uploads/2021/05/GWG_Digital_printing.pdf)) não foi lida, e é a mais próxima de "gráfica rápida digital" no Brasil.
- Os padrões dos perfis Acrobat Preflight, callas pdfToolbox e Enfocus PitStop não foram verificados diretamente. Esses fornecedores implementam os perfis GWG certificados ([Ricoh, certificação GWG2015](https://www.ricoh-europe.com/news-events/news/ricoh-awarded-ghent-workgroup-2015-pdf-preflight-certification/)), então os números GWG acima são o proxy mais forte.
- Não há levantamento sistemático de requisitos de várias gráficas brasileiras. Encontrei só UFRJ e tutoriais.

## 3. Ferramentas open source e checks que a esteira não tem

### Takeaway
O veraPDF é o validador de referência open source para PDF/A (1–4) e PDF/UA (1–2). Seus perfis XML são machine-checkable e cobrem o que a esteira reimplementa (fontes, glifos, ToUnicode) e muito mais: tags, idioma, Alt, DisplayDocTitle, espaços de cor, XMP válido, anexos. As lacunas mais relevantes da esteira, por custo/benefício para entregáveis de cliente: /Lang, DisplayDocTitle, links quebrados, criptografia/permissões e estrutura com tags.

### Cited Findings
- Perfis veraPDF contados nesta pesquisa: PDFA-2B = 144 regras; PDFA-4 = 111; PDFUA-1 = 106; PDFUA-2 = 92. Cada regra tem cláusula ISO, descrição e teste booleano. — [veraPDF-validation-profiles (GitHub)](https://github.com/veraPDF/veraPDF-validation-profiles)
- **PDF/UA-1 (veraPDF) tem regras que a esteira não cobre:**
  - 7.18.5: links devem ter descrição alternativa via `Contents`;
  - 7.18.1: anotações precisam de Contents ou Alt;
  - 7.7: fórmulas com Alt/ActualText;
  - 7.2: idioma determinável para outline, Alt, ActualText e texto da página;
  - 7.2 teste 29: valor de Lang no formato BCP-47 (`/^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$/`).

  — [PDFUA-1.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_UA/PDFUA-1.xml)
- **PDF/UA-2:** Figure exige Alt ou ActualText (8.2.5.28.2). Quando a anotação tem Contents e o elemento de estrutura tem Alt, os dois devem ser iguais (8.9.4.2). Arquivos embutidos precisam de Desc (8.14.1). — [PDFUA-2.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_UA/PDFUA-2.xml)
- **PDF/A-2:** XMP deve ser bem formado (6.6.2.1). Arquivos embutidos devem ser PDF/A (6.8). O PDF/A-4 exige `AFRelationship` em anexos (6.9). — [PDFA-2B.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_A/PDFA-2B.xml); [PDFA-4.xml](https://raw.githubusercontent.com/veraPDF/veraPDF-validation-profiles/integration/PDF_A/PDFA-4.xml)

### Inferences
- Mapeamento prático (a fonte de cada capacidade fica no conhecimento geral das ferramentas, sem verificação nesta rodada; ver Gaps):
  - **veraPDF:** conformidade PDF/A e PDF/UA completa.
  - **pdffonts (poppler):** tabela nome/tipo/encoding/emb/sub/uni, que já dá Type3 e ToUnicode por fonte.
  - **qpdf --check:** integridade estrutural (xref, streams); um PDF corrompido passaria pelos checks visuais da esteira.
  - **pikepdf / PyMuPDF:** links (`page.get_links()`), criptografia, `/Lang`, `/ViewerPreferences`, `/MarkInfo /Marked`, presença de StructTreeRoot.
  - **fontTools:** fsType (bit 0x0002 = Restricted License, não embutível; 0x0200 = só bitmap). É relevante para fontes comerciais, irrelevante para Google Fonts (OFL).
- **Lacunas de maior valor**, por ordem:
  1. links internos e externos quebrados (o destino de URL e as âncoras `#` do HTML viram /Link; checar HTTP status e destinos nomeados);
  2. `/Lang` = pt-BR;
  3. DisplayDocTitle + dc:title, juntos;
  4. criptografia/permissões não intencionais;
  5. PDF com tags (o Chrome gera tags com `--generate-pdf-document-outline` / tagged PDF por padrão nas versões recentes; *não verificado aqui*);
  6. integridade estrutural (qpdf);
  7. tamanho de arquivo.

### Gaps
- Não busquei a documentação oficial de pdffonts, qpdf, mutool, pikepdf e PyMuPDF nesta rodada. As capacidades listadas acima vêm do conhecimento geral das ferramentas e não foram verificadas nas docs. Antes de citar ao cliente, conferir em https://docs.verapdf.org, https://qpdf.readthedocs.io e https://pymupdf.readthedocs.io.
- Não confirmei se o Chrome atual (2026) emite PDF com tags por padrão em `--print-to-pdf` / Puppeteer `tagged: true`.

## 4. Armadilhas do Chrome print-to-PDF / CSS Paged Media e como Paged.js, WeasyPrint e Prince lidam

### Takeaway
A conversão de fontes variáveis em Type3 pelo Chrome/Skia está documentada pela comunidade e não depende só da variabilidade: algumas famílias continuam Type3 mesmo fixadas em instância estática. O texto continua extraível. O shrink-to-fit é comportamento padrão do Puppeteer/Chrome quando `preferCSSPageSize` é falso. GUI e headless produzem PDFs diferentes, e o headless ignora `url()` dentro de `@page`.

### Cited Findings
- No Chromium, fontes variáveis "embed as Type 3 fonts, which store each glyph as a PDF drawing procedure rather than as an outline font program". Com instâncias estáticas, "Vollkorn properly embed[s] as CID TrueType, while … Alegreya remain[s] as Type 3": "something in that face itself, rather than variability alone, is keeping Chromium on the Type 3 path". "text still extracts and the page still looks right". — [grimoire-press issue #9](https://github.com/Seigiard/grimoire-press/issues/9)
- "Neither OpenType Variable nor OpenType SVG fonts are natively supported in PDF … The workaround is to create and subset embed standard OpenType CFF or TTF fonts corresponding to each 'instance' of the variable font." — [Adobe Community (resumo da busca)](https://community.adobe.com/t5/adobe-fonts-discussions/adobe-fonts-and-otf-variable-fonts/m-p/11631961/highlight/true)
- O Skia tem trabalho de subsetting de Type3 "(fallback) fonts" e correções no ToUnicode de Type3 para melhorar a extração. — [skia.googlesource.com commit](https://skia.googlesource.com/skia/+/88b138da99328b04cae9a8ee19c3882b8847a550) (pelo resumo da busca; o commit não foi aberto)
- `preferCSSPageSize`: "give any CSS @page size declared in the page priority over what is declared in width and height or format options"; o padrão "will scale the content to fit the paper size". `page.pdf()` usa media `print`. — [puppeteer-html-pdf (npm)](https://npmjs.com/package/puppeteer-html-pdf) (via snippet)
- "Graphical Chrome won't respect CSS-set page dimensions and uses window size instead", enquanto o headless respeita. "headless Chrome will silently refuse to fetch any resources referenced in your `@page` CSS rules, so your `url()` images are fully invisible" (solução: data URL base64). As DevTools não mostram a paginação real. — [André Arko, "Chrome headless print to PDF" (2025)](https://andre.arko.net/2025/05/25/chrome-headless-print-to-pdf/)
- Variáveis de reprodução que mudam o PDF: "exact production HTML, CSS, fonts, Chrome/Chromium build, Puppeteer version, OS, and PDF options". — [SitePoint thread (via snippet)](https://www.sitepoint.com/community/t/set-html-page-to-pdf-size-for-dynamically-converting-to-pdf-using-headless-chrome/489336)

### Inferences
- O check de DOM da esteira ("conteúdo mais largo que a página faz o Chrome encolher silenciosamente") é corroborado pela documentação do Puppeteer. Ele é complementar à regra GWG 4.2 "Page Scaling" (Error), que olha o mesmo problema pelo lado do PDF.
- Para eliminar a WARNING de Type3 na raiz, o caminho documentado é servir **instâncias estáticas** (TTF/OTF por peso) em vez do variable font do Google Fonts. A memória do usuário já registra "fonte variável congelada em TTF" no pipeline de PDF branded, o que é coerente. Como algumas famílias continuam Type3 mesmo estáticas, o check deve continuar existindo.
- Itens a acrescentar na esteira a partir das armadilhas: imagem em `@page` não renderizada (comparar a cobertura de recursos); gravar a versão do Chromium no relatório de QA (reprodutibilidade).

### Gaps
- Não encontrei o bug oficial no tracker do Chromium sobre variable font → Type3, só o relato de projeto. Também não achei documentação sobre CSS `filter`/`backdrop-filter`/`mix-blend-mode` causando rasterização no PDF do Chrome.
- Não pesquisei como WeasyPrint, Prince e Paged.js tratam fontes variáveis, `break-inside` ou rasterização. Fica sem dado nesta rodada. Paged.js roda sobre o próprio Chrome, então herda o comportamento de fonte do Skia (inferência).
- Os comportamentos de `break-inside: avoid` em flex/grid no Chrome não foram verificados no CSS WG (css-break-3) nesta rodada.

## 5. Convenções para detectar página em branco e sobreposição de texto em QA automatizado de documentos

### Takeaway
Para página vazia, a referência de indústria (GWG 4.5, Error) usa critério de **objeto**: "nenhum conteúdo de impressão". A esteira usa critério de **tinta medida** (<0,1% de pixels). São complementares, e o da esteira é mais forte para páginas "quase vazias" (só cabeçalho ou rodapé). Não achei literatura nem convenção de ferramenta para o limiar de sobreposição de blocos de texto (≥30%).

### Cited Findings
- GWG2015 4.5: "A PDF file shall not contain a page which does not contain any print content at all". Print content = elementos que "do not lie completely outside the BleedBox, or if no BleedBox is defined, outside the TrimBox". — [GWG2015 PDF](https://gwg.org/wp-content/uploads/2026/05/GWG2015-Specification_Release.pdf)

### Inferences
- O critério GWG não pega a página que tem só rodapé ou número de página (tem conteúdo, mas está "em branco" para o leitor). O de tinta <0,1% pega. A recomendação é manter o de tinta e documentar a proveniência como "política interna, mais rígida que GWG 4.5 (por objeto)". Opcionalmente, somar o check por objeto (página sem nenhum operador de desenho dentro do TrimBox) como FAIL independente.
- Para sobreposição de texto, a literatura de layout analysis usa IoU como métrica de avaliação de detecção, mas isso é métrica de *avaliação de modelo*, não regra de QA. O limiar de 30% da esteira deve ficar rotulado como "calibração de projeto". O caminho para torná-lo evidência é medir falsos positivos e negativos nos documentos já entregues.

### Gaps
- Não achei fonte (norma, ferramenta ou artigo) com limiar numérico de sobreposição de texto para QA de documento. Também não achei convenção de limiar de tinta para "página em branco" (ex.: digitalização de documentos, que usa limiares por scanner, sem verificação aqui).

## 6. Verificar números da prosa contra os dados de origem: boas práticas

### Takeaway
O estado da arte em verificação de afirmações numéricas contra tabelas é **execução**: transformar a afirmação em consulta ou programa (SQL/Python) e rodá-la contra a fonte. Comparar strings não basta. O check de cobertura HTML×PDF da esteira verifica *consistência de render* (o PDF não está desatualizado), não *veracidade* (o número bate com o dado). É uma camada diferente. Para a segunda, a boa prática é gerar a prosa a partir dos dados e auditar a ligação número → célula.

### Cited Findings
- AggChecker: "automatically verifies natural language claims about numerical aggregates against the underlying raw data, translating each claim into a semantically equivalent SQL query and evaluating it against the database". — [AggChecker (Google Research)](https://research.google/pubs/aggchecker-a-fact-checking-system-for-text-summaries-of-relational-data-sets/)
- Verificação por execução: cada inferência gerada é traduzida "into a Python verification function that is executed against the source table". — [From Tables to Quantified Statements (arXiv 2609.23966)](https://arxiv.org/pdf/2609.23966)
- Métrica sem referência que decompõe fidelidade em alinhamento afirmação ↔ célula via NLI. — [STAF/LOOMSUM (arXiv 2609.00241)](https://arxiv.org/pdf/2609.00241) (pelo snippet; o atributo exato de qual paper define STAF não foi confirmado)
- Benchmark de geração de relatórios a partir de tabelas industriais. — [T2R-bench (arXiv 2508.19813)](https://arxiv.org/pdf/2508.19813)
- Sistema de fact-checking de afirmações estatísticas, Vlachos et al. — [EACL 2017 demo, E17-3010](https://eprints.whiterose.ac.uk/id/eprint/116023/1/E17-3010.pdf)
- Ferramenta interativa de fact-check de texto com dados. — [Stasko et al., UIST'24](https://faculty.cc.gatech.edu/~john.stasko/papers/uist24-factcheck.pdf)

### Inferences
- Duas camadas recomendadas:
  - (1) **render**: o HTML×PDF que a esteira já tem.
  - (2) **fonte → texto**: todo número na prosa vem de uma variável do dataset (template), e um auditor extrai os números do texto final e casa cada um com um valor do dataset, dentro de uma tolerância de arredondamento. Número sem origem = FAIL. A memória do usuário já registra o padrão "dados→render→auditar→build que aborta", o que bate com a literatura de verificação por execução.
- Para afirmações derivadas ("cresceu 12%", "o maior"), a prática da literatura é traduzir em expressão executável (AggChecker/PAL). Para entregáveis gerados por pipeline próprio, o custo menor é gerar a afirmação já como expressão (o texto sai do cálculo), em vez de verificar depois.

### Gaps
- Não achei guia normativo (tipo ISO ou manual de redação de dados) com "boas práticas" de verificação numérica em relatórios. As ferramentas de jornalismo de dados (ClaimBuster, Full Fact) não foram pesquisadas nesta rodada. Os papers arXiv 2609.* são de setembro de 2026, recentes e possivelmente sem revisão por pares.
