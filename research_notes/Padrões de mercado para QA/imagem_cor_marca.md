# Padrões de mercado para QA de imagem, arte e fidelidade de cor de marca (vs. esteira-qa)

Notas de pesquisa — 08/10/2026. Convenção de rótulos usada abaixo:
**[NORMA]** = requisito de norma/especificação; **[PLATAFORMA-oficial]** = comportamento declarado pela própria plataforma; **[PLATAFORMA-relato]** = comportamento relatado por terceiros, sem método de medição publicado; **[CONVENÇÃO]** = prática de mercado/fornecedor; **[LITERATURA]** = pesquisa acadêmica.

Limite honesto desta rodada: ~20 chamadas de busca/fetch. A página de ajuda do Instagram (help.instagram.com) não renderizou via fetch; nenhum documento oficial do WhatsApp/Meta sobre recompressão foi obtido. Tudo sobre recompressão de plataforma abaixo é **relato**, não medição.

---

## 1. Tolerâncias de diferença de cor (ΔE00) — tela × impressão × marca; limiar de "neutro"

### Takeaway
ΔE00 ≈ 1 é a JND de projeto da fórmula; ΔE00 2,0 é exatamente a meta de produção da Pantone para tinta de marca e é mais rígido que a tolerância (informativa) da ISO 12647-2:2013 para sólidos de processo (3,5 / 5,0). Para tokens CSS (valores exatos em hex) 2,0 é **frouxo**; para cores dominantes extraídas de raster comprimido é **adequado a levemente apertado**. O limiar de neutro C*ab ≤ 1,0 é mais rígido que a tolerância de balanço de cinza do G7 (a*, b* dentro de ±1,5).

### Cited Findings
- Todas as fórmulas ΔE foram concebidas para que 1,0 represente uma JND (diferença apenas perceptível); para CIEDE2000 com fatores paramétricos padrão (kL=kC=kH=1), ~1 unidade ≈ JND — [Wikipedia: Color difference](https://en.wikipedia.org/wiki/Color_difference); [Metricgate: ΔE CIEDE2000](https://metricgate.com/docs/delta-e-ciede2000/)
- Faixas interpretativas de uso comum (não normativas): ΔE00 < 1 geralmente imperceptível; 1–2 perceptível só em comparação lado a lado próxima; ≥ 2 discrepância cada vez mais óbvia que "tipicamente falha tolerâncias apertadas" **[CONVENÇÃO]** — [Metricgate](https://metricgate.com/docs/delta-e-ciede2000/)
- ISO 12647-2:2013 adotou ΔE00 para avaliação de desvio, mas **os valores de tolerância em ΔE00 são apenas informativos**; desvio dos sólidos: C 3,5, M 3,5, Y 3,5, K 5,0 ΔE00 **[NORMA, informativa]** — [Chung et al., TAGA 2015 / RIT: Factors influencing tolerancing](https://s3.cad.rit.edu/cadgallery_production/storage/media/uploads/projects/1581/documents/304/yu-l_chung_myers_factors-influencing-tolerancing.pdf); [RIT repository](https://repository.rit.edu/theses/8640)
- A mesma pesquisa (RIT) mostra que 3,5 para CMY e 5 para K produz taxas de aprovação desiguais; com abordagem de "%Pass igual", K não precisaria de tolerância maior e Y poderia ser menor **[LITERATURA]** — [Chung et al., TAGA 2015](https://s3.cad.rit.edu/cadgallery_production/storage/media/uploads/projects/1581/documents/304/yu-l_chung_myers_factors-influencing-tolerancing.pdf)
- Estudo sobre tolerância de impressão: ΔE*ab = 5 corresponde a 0,95–6,42 ΔE00 (média 3,30), sugerindo ΔE00 3,3–3,5 como tolerância para a indústria gráfica **[LITERATURA]** — [ResearchGate: Printing color difference tolerance by CIEDE2000](https://www.researchgate.net/publication/258589926_A_Discussion_on_Printing_Color_Difference_Tolerance_by_CIEDE2000_Color_Difference_Formula)
- Pantone: formula a tinta para ficar dentro de 1 ΔE00, com meta < 2 ΔE00 para todas as cores; >90% das cores do Formula Guide Coated atingem o alvo em máquina. Pantone vende um "Digital Tolerance Guide" para visualizar como ΔE 2,0 ou 3,0 aparece **[CONVENÇÃO-fornecedor]** — [Printplanet: Pantone answers some important questions](https://printplanet.com/goto/post?id=291511) (resposta atribuída à Pantone em fórum; não é página oficial da Pantone)
- Escala em tintas/pintura citada pela Datacolor/Techkon: "Grade A" ΔE00 1,6–3,2 = pouco perceptível, considerado a mesma cor; "Grade AA" ΔE00 0,8–1,6 = leve diferença percebida em adjacência **[CONVENÇÃO]** — [Datacolor/Techkon: Demystifying ΔE 2000](https://techkon.datacolor.com/demystifying-the-cie-delta-e-2000-formula/)
- G7 (Idealliance): define escala CMY que deve parecer neutra e exige a*, b* dentro de ±1,5 do neutro para os patches de balanço de cinza; ChromaChecker usa ΔCh (só CMY) < 1,0 média e < 2 máximo; G7 usa ΔL e ΔCh ponderados **[NORMA-de-processo / CONVENÇÃO]** — [Idealliance G7 System – ChromaChecker ADS (PDF)](https://idealliance.org/wp-content/uploads/2022/03/Idealliance-G7-System_ChromaChecker_ADS.pdf); [Science of G7](https://connect.idealliance.org/g7/about/scienceofg7); [ChromaChecker G7 Curve Inspector](https://chromachecker.com/insp-g7-curve-inspector)
- Literatura sobre tolerância ΔCh para patches quase neutros ainda está em desenvolvimento (proposta de ΔCh não ponderado vs. ponderado) **[LITERATURA]** — [TAGA 2013 proceedings (PDF)](https://library-files.taga.org/2013-proceedings/T20130380.pdf)

### Inferences
- **ΔE00 2,0 como régua de marca**: alinhado ao topo da meta Pantone (<2) e ao limite superior de "AA"/inferior de "A" — defensável como "on-brand" para *produção física* e para cores dominantes extraídas de raster. Ancorar a proveniência do limiar em Pantone (meta < 2 ΔE00) em vez de deixá-lo sem âncora.
- **Tokens CSS**: um token é um valor exato. A diferença entre um hex e o "mesmo" hex arredondado em 8 bits é muito menor que 1 ΔE00 (inferência minha; não encontrei fonte que tabule o erro de quantização sRGB 8-bit em ΔE00). Logo, para CSS faz mais sentido dois níveis: **igual ao token (ΔE00 ≤ ~0,5, para absorver conversões rgb/hsl/hex) = OK; 0,5–2,0 = WARNING "quase-token" (provável hex digitado à mão/eyedropper); > 2,0 = fora da paleta**. Hoje a esteira trata 1,9 como "na marca", o que deixa passar tokens divergentes.
- **Raster (cores dominantes ≥ 5% de área)**: compressão JPEG com subamostragem 4:2:0, antialiasing e conversão de perfil deslocam cor. Sugestão: manter 2,0 como WARNING para PNG/fonte e considerar 3,0 para JPEG/derivados de plataforma, documentando a razão. (Inferência; sem estudo encontrado que meça o deslocamento típico de cor de marca após JPEG q80–90.)
- **Empresa A, dois roxos com ΔE00 11,5**: está muito acima de qualquer tolerância de mercado (até a de impressão, 3,5–5). Não é ruído de medição; são duas cores distintas. Pela régua de mercado e pela regra interna "divergência não é defeito", isto deve virar **pergunta ao dono da marca** ("são dois tokens oficiais, ex. primário e secundário/hover, ou um é erro?") — não um FAIL automático.
- **Neutro C*ab ≤ 1,0**: mais rígido que G7 (±1,5 em a*/b* → C* até ~2,1 no pior caso diagonal). Ancoragem interna (peças P&B medem 0,00) justifica 1,0 para marcas P&B estritas. Para marcas não-P&B, um limiar G7-alinhado de **C* ≤ 1,5** seria defensável com proveniência "norma de processo".
- **RYZE, cinzas azulados C* 7–11**: por qualquer régua (G7 ±1,5; JND ~1) isso não é "quase neutro", é uma cor fria intencional ou desvio. Também é pergunta: se for intencional, entra na paleta como token "cinza frio"; se não, é inconsistência entre peças.

### Gaps
- Não encontrei norma específica de tolerância ΔE00 para **tela/design system** (ex. Material, Carbon, ferramentas de brand compliance como Frontify/Bynder com limiar declarado). O ΔE "on-brand" de design system parece não ser padronizado publicamente.
- Não obtive o texto da ISO 12647-2:2013 nem da ISO/PAS 15339 / ISO 12647-7 (prova) diretamente; valores vêm de literatura secundária (RIT/TAGA).
- JND em ΔE00 medida especificamente em displays (vs. amostras de superfície) — não encontrei estudo nesta rodada.

---

## 2. Gestão de cor para web/redes sociais; specs de dimensão e recompressão

### Takeaway
O padrão web é: imagem sem perfil = sRGB (CSS Color 4); navegadores gerenciam imagens com perfil embutido. Redes sociais (relato) convertem/descartam perfil e recomprimem; a recomendação de mercado é exportar sRGB, 1080 px de largura, JPEG 85–90. O WARNING da esteira para ICC ≠ sRGB está alinhado — e o caso "perfil do display do laptop" é pior do que "wide gamut": é perfil de dispositivo embutido por engano.

### Cited Findings
- CSS Color 4 especifica que imagens sem perfil devem ser tratadas como sRGB; W3C determinou que gráficos sem tag são assumidos sRGB **[NORMA]** — [W3C CSSWG minutes 2009](https://lists.w3.org/Archives/Public/www-style/2009Nov/0250.html); [WPT test css-color/untagged-images-001](https://searchfox.org/mozilla-central/source/testing/web-platform/tests/css/css-color/untagged-images-001.html)
- A maioria dos navegadores assume sRGB para imagem sem perfil; Firefox, por padrão, gerencia cor apenas de imagens com tag; perfis às vezes são removidos para reduzir tamanho, gerando super-saturação em monitores wide-gamut se o navegador não assumir sRGB — [Cameratico: Web browser color management guide](https://cameratico.com/guides/web-browser-color-management-guide/); [Image Science: web browsers and colour management](https://imagescience.com.au/knowledge/web-browsers-and-colour-management)
- Instagram remove o perfil se a imagem for redimensionada; arquivos exportados em Adobe RGB ou Display P3 aparecem dessaturados — o Instagram converte o perfil no upload sem preservar o gamut **[PLATAFORMA-relato]** — [RevelRaw: Export settings for Instagram (2026)](https://revelraw.com/blog/export-settings-for-instagram.html)
- Recomendação de exportação para Instagram: 1080 px de largura, sRGB, JPEG qualidade 85–90%; outra fonte: JPEG ou PNG, sRGB, < 8 MB **[CONVENÇÃO]** — [RevelRaw](https://revelraw.com/blog/export-settings-for-instagram.html); [AdLibrary: Best size for Instagram photos 2026](https://adlibrary.com/posts/best-size-for-instagram-photos)
- WhatsApp: imagens reduzidas para lado maior ≤ 1600 px (ou 2048 px com o toggle HD), recodificadas a "aproximadamente JPEG 70–80%", EXIF removido (GPS, perfil de câmera, espaço de cor), achatado para sRGB **[PLATAFORMA-relato]** — [DEV Community: WhatsApp image dimensions & compression 2026](https://dev.to/eldhopaulose/whatsapp-image-dimensions-compression-guide-2026-cheatsheet-client-side-resizer-pipeline-5h2b). **Atenção**: o artigo não descreve método de medição nem cita documentação oficial ("typically", "roughly").
- Proporções Meta 2026: Feed 4:5 (1080×1350); Stories/Reels 9:16 (1080×1920); 3:4 (1080×1440) otimizado para a grade do perfil do Instagram; 1:1 (1080×1080) para carrossel **[CONVENÇÃO / agregadores]** — [AdsUploader: Meta ads aspect ratios](https://adsuploader.com/blog/meta-ads-aspect-ratios); [Cadenus: Instagram safe zone 2026](https://cadenus.io/resources/blog/instagram-safe-zone/)
- Conversão de Display P3 → sRGB preservando aparência é tema de discussão técnica (ImageMagick), i.e., não é trivial nem automática — [ImageMagick Discussion #5694](https://github.com/ImageMagick/ImageMagick/discussions/5694)

### Inferences
- **CMYK para tela = FAIL**: consistente com o padrão (web assume RGB/sRGB; CMYK JPEG tem suporte e renderização inconsistentes). Manter.
- **ICC ≠ sRGB = WARNING**: correto como severidade para destinos sociais (onde o perfil é convertido/descartado). Calibração sugerida: separar dois casos com mensagens distintas — (a) **Display P3/Adobe RGB padrão** embutido: WARNING para social ("converta para sRGB antes de exportar"), OK/INFO para site (navegadores gerenciam perfis); (b) **perfil de dispositivo** (ex.: perfil calibrado do painel do laptop, descrição não-padrão): WARNING mais forte/FAIL para qualquer destino, porque descreve um monitor específico e não um espaço de trabalho — sinal de exportação mal configurada. (Inferência; não achei fonte que trate esse caso específico.)
- **Faltando na esteira**: checagem de **dimensão/proporção por destino** (1080×1350, 1080×1920, 1080×1440, 1080×1080) e de **lado maior** — exportar acima do que a plataforma mantém só aumenta recompressão.

### Gaps
- Nenhuma documentação oficial Meta/WhatsApp/LinkedIn sobre qualidade de recompressão ou tratamento de ICC foi obtida (help.instagram.com não renderizou). Os números do WhatsApp (1600/2048 px, q 70–80) e o comportamento do Instagram são relatos sem método; uma medição própria (enviar arquivo de teste, baixar, estimar quantização com o estimador IJG já validado da esteira) fecharia isto.
- Specs do LinkedIn e do Status do WhatsApp não foram verificadas nesta rodada.
- Suporte de Display P3 em CSS (`color(display-p3 …)`) e em `<img>` com perfil — não busquei a fonte primária (MDN/web.dev).

---

## 3. Qualidade JPEG: piso q ≥ 80, métricas perceptuais e formatos modernos

### Takeaway
O Lighthouse usa **q85** como referência de recompressão; SSIMULACRA2 80 ("qualidade muito alta", não perceptível lado a lado) corresponde a ~libjpeg-turbo q85 4:2:2. Logo **q80 é um piso razoável como WARNING**, levemente abaixo da referência de mercado — a âncora mais citável é o Lighthouse (85). q70 está claramente abaixo.

### Cited Findings
- Lighthouse ("Efficiently encode images"): coleta JPEG/BMP, **recomprime cada um em qualidade 85** e compara; se a economia potencial for ≥ 4 KiB, sinaliza a imagem; recomenda WebP (a página não menciona AVIF) **[CONVENÇÃO-ferramenta]** — [Chrome for Developers: uses-optimized-images](https://developer.chrome.com/docs/lighthouse/performance/uses-optimized-images)
- SSIMULACRA2: faixa prática 60 (média) a 90 (visualmente sem perda). 80 = "muito alta": distorção não perceptível por observador médio em comparação lado a lado 1:1 a distância normal — **corresponde à saída típica de libjpeg-turbo 4:2:2 q85**; 85 = "excelente" (não perceptível nem em comparação in-place/flicker); 90 = visualmente sem perda **[LITERATURA/ferramenta]** — [GitHub cloudinary/ssimulacra2](https://github.com/cloudinary/ssimulacra2)
- Visualmente sem perda (SSIMULACRA2 90) ≈ 8:1 (3 bpp) com AVIF/JPEG XL, ≈ 6:1 (4 bpp) com JPEG; alta qualidade (80) atingível ~16:1 — [Cloudinary: JPEG XL and the Pareto front](https://cloudinary.com/blog/jpeg-xl-and-the-pareto-front)
- Para alvo SSIMULACRA2 80, JPEG precisou de q89 num experimento (varia com imagem/encoder) — [Alan Orth: Evaluating JPEG, WebP and AVIF](https://alanorth.github.io/improved-dspace-thumbnails/evaluating-jpeg-webp-avif.html)
- Butteraugli e SSIMULACRA2 como métricas de referência completa para decidir qualidade — [Inverity: Butteraugli vs SSIMULACRA2](https://www.inverity.ai/posts/butteraugli-ssimulacra2-perceptual-metrics); [x266 wiki: SSIMULACRA2](https://wiki.x266.mov/docs/metrics/SSIMULACRA2)
- Mercado recomenda subir para Instagram em JPEG 85–90 (para sobreviver à recompressão) **[CONVENÇÃO]** — [RevelRaw](https://revelraw.com/blog/export-settings-for-instagram.html)

### Inferences
- **Proveniência do q80**: hoje "mercado (sem âncora)". Pode ser ancorado assim: "Lighthouse referencia q85; SSIMULACRA2 80 ≈ libjpeg-turbo q85 4:2:2 → q80 é piso de WARNING 5 pontos abaixo da referência". Opcional: WARNING < 85 (alinhado ao Lighthouse) e FAIL < 70 (abaixo do que o próprio WhatsApp supostamente aplica).
- **Fator de qualidade não é tudo**: o mesmo q com **subamostragem 4:2:0 vs 4:4:4** muda muito o resultado em arte com texto colorido e bordas de cor de marca (borra croma). A esteira já lê as tabelas de quantização; ler também o fator de amostragem do SOF é barato e é uma checagem faltante relevante para arte gráfica. (Inferência; a referência SSIMULACRA2 já diferencia 4:2:2.)
- **Melhor que estimar q**: quando houver o original (PNG/master), medir SSIMULACRA2 do entregável contra o original e reprovar abaixo de ~80 (WARNING) / ~70 (FAIL) — métrica com referência completa, válida para arte gráfica, ao contrário de NR-IQA.
- **Arte chapada/texto**: PNG ou WebP lossless costuma ser a escolha correta; um JPEG de arte vetorial é por si só um WARNING de formato. WebP é o que o Lighthouse sugere; AVIF não aparece no texto da auditoria.

### Gaps
- Não encontrei estudo perceptual público que tabule "fator q IJG × % de observadores que notam artefato" para gráficos/texto (a maioria é para fotos naturais).
- Squoosh/web.dev não tem um "piso" de qualidade documentado que eu tenha encontrado.

---

## 4. Resolução efetiva para impressão (offset, grande formato, adesivos)

### Takeaway
A especificação de preflight de mercado (GWG 2022) dá **erro < 95 ppi e aviso < 149 ppi** para imagens cor/cinza — muito mais leniente que o FAIL da esteira em 300 ppi. 300 ppi é a convenção "2 × 150 lpi" para offset de qualidade, mas como FAIL é mais rígido que o mercado; grande formato depende de distância de visualização.

### Cited Findings
- Especificações GWG: imagens em cor e tons de cinza → **erro abaixo de 95 ppi, aviso abaixo de 149 ppi**; imagens 1-bit → erro < 349 ppi, aviso < 599 ppi **[NORMA-de-indústria / preflight]** — [Printplanet (citando GWG)](https://printplanet.com/goto/post?id=290275); [GWG Digital printing (PDF)](https://gwg.org/wp-content/uploads/2021/05/GWG_Digital_printing.pdf)
- GWG define resolução efetiva pelas chaves Width/Height da imagem combinadas com a matriz de transformação (CTM); se diferir entre eixos, vale o menor **[NORMA-de-indústria]** — [Printplanet/GWG](https://printplanet.com/goto/post?id=290275); [CI HUB: Effective PPI (PDF)](https://ci-hub.com/hubfs/001_Effective_PPI.pdf)
- GWG 2022 foca em reduzir falsos positivos de preflight ("erros que nunca causariam problema de produção") — [GWG: GWG 2022 release](https://gwg.org/es/2022/03/30/ghent-workgroup-releases-new-specification-gwg-2022); [Large Format Review](https://www.largeformatreview.com/print-software/ghent-workgroup-releases-new-specification-gwg-2022/)
- Gelato (impressão sob demanda) sinaliza imagens entre **150 e 225 ppi** dentro do bleedbox como checagem de preflight **[CONVENÇÃO-fornecedor]** — [Gelato support](https://support.gelato.com/en/articles/8996580-resolution-of-color-and-grayscale-images-larger-than-16x16-pixel-is-between-150-and-225-ppi-inside-bleedbox)
- Regra de distância: PPI mínimo ≈ 3438 ÷ distância de visualização (polegadas); 8×10" → 300 ppi; 24×36" → 150–240; ≥ 40×60" → 100–150; banners vistos a 3+ m → 72–100 ppi no tamanho final; outdoor 10–20 ppi **[CONVENÇÃO]** — [Iris Shop: Mastering resolution for large format](https://irisshop.pixfizz.com/site/blog/Mastering-Resolution-for-Large-Format-Printing); [Northlight Images: print resolution × viewing distance](https://www.northlight-images.co.uk/?p=7040)

### Inferences
- **Calibração sugerida por classe de produto**: (a) offset/digital de perto (cartão, folder, adesivo pequeno, ≤ A3): FAIL < 150 ppi (≈ GWG aviso 149), WARNING 150–299, OK ≥ 300 (convenção 2×lpi); (b) grande formato: limiar calculado por distância (3438/d) com piso de 72–100 ppi; (c) outdoor: 10–20 ppi. O FAIL em 300 universal gera falso positivo em banner/lona — exatamente o tipo de ruído que a GWG 2022 tentou eliminar.
- Adesivo pequeno visto de perto se comporta como offset (300); adesivo/envelopamento grande, como grande formato.
- Checagens de impressão faltando na esteira que a GWG cobre (inferência a partir do escopo de GWG; valores não verificados aqui): limite de cobertura total de tinta (TAC), sangria, preto rico em texto pequeno, imagens 1-bit (limiares acima), fontes incorporadas.

### Gaps
- Exigências típicas de gráficas brasileiras (ex. "300 dpi, CMYK, 3–5 mm de sangria, TAC 300%"): não encontrei fonte primária nesta rodada; seria preciso coletar as páginas "como enviar arquivo" de 2–3 gráficas online BR (ex. Printi, Gráfica Eskenazi, Zap Gráfica) para ancorar.
- Não acessei o texto oficial da GWG 2022 (apenas citações secundárias dos limiares 95/149).

---

## 5. NR-IQA (sem referência) em 2025–2026 e aplicabilidade a arte gráfica

### Takeaway
A decisão da esteira de **não** usar BRISQUE/NIQE em arte gráfica é corroborada pela literatura: modelos NR treinados em fotos naturais falham em imagens de conteúdo de tela (texto, gráficos chapados). Os modelos modernos (MUSIQ, CLIP-IQA, TOPIQ, LIQE, Q-Align) continuam treinados majoritariamente em bases de fotos (KonIQ, SPAQ, etc.), e benchmarks de 2026 mostram que até VLMs têm "lacunas claras" em avaliar estética de design gráfico.

### Cited Findings
- A maioria dos algoritmos NR-IQA foi desenvolvida para imagens naturais e não funciona bem em imagens de conteúdo de tela (SCI); SCIs contêm mais texto, gráficos e layout, não seguem as estatísticas de cena natural (NSS), têm menos cores, formas simples e muitas linhas finas **[LITERATURA]** — [Gu et al. 2017 (PDF)](https://www.colorado.edu/lab/live/publications/gu2017no.pdf); [arXiv 1903.00705: Deep optimization model for SCI QA](https://ar5iv.labs.arxiv.org/html/1903.00705); [arXiv 2008.08561](https://ar5iv.labs.arxiv.org/html/2008.08561)
- Existe base dedicada SIQAD (980 imagens de conteúdo de tela) e métodos específicos que tratam regiões de texto, gráfico e imagem separadamente **[LITERATURA]** — [arXiv 2006.03783](https://arxiv.org/pdf/2006.03783); [arXiv 1903.00705](https://ar5iv.labs.arxiv.org/html/1903.00705)
- pyiqa implementa NR: Q-Align, QualiCLIP, LIQE, ARNIQA, TOPIQ-NR (variantes koniq/flive/spaq), MUSIQ (koniq/spaq/paq2piq/ava), CLIP-IQA(+), BRISQUE e NIQE (estes dois "menor é melhor") — [pyiqa Model Cards](https://iqa-pytorch.readthedocs.io/en/latest/ModelCard.html)
- TOPIQ: abordagem top-down usando semântica para guiar atenção a distorções; competitivo nos benchmarks públicos FR e NR — [IEEE TIP 2024: TOPIQ](https://dl.acm.org/doi/10.1109/TIP.2024.3378466)
- Q-Align (ICML 2024) ensina LMMs a pontuar por níveis textuais discretos — [pyiqa docs](https://iqa-pytorch.readthedocs.io/)
- Métodos CLIP (CLIP-IQA+, LIQE) empatam ou perdem para MUSIQ intra-base, mas generalizam melhor entre bases; QualiCLIP com forte generalização cross-dataset sem anotação humana **[LITERATURA]** — [arXiv 2403.11176 (QualiCLIP)](https://arxiv.org/html/2403.11176v2)
- ICLR 2026 — "Can Vision-Language Models Assess Graphic Design Aesthetics?": AesEval-Bench (4 dimensões, 12 indicadores, 3 tarefas: julgamento estético, seleção de região, localização precisa); avaliação de VLMs proprietários, abertos e com raciocínio revela "clear performance gaps against the nuanced demands of aesthetic assessment" **[LITERATURA]** — [arXiv 2603.01083](https://arxiv.org/abs/2603.01083); [ICLR 2026 poster](https://iclr.cc/virtual/2026/poster/10009602)
- DesignSense (Adobe): modelos de preferência/recompensa treinados em text-to-image **não generalizam** para avaliação de layout, onde o arranjo espacial dos mesmos elementos define a qualidade; também existe GraphicDesignBench (GDB) para tarefas profissionais de design — [arXiv 2602.23438 / busca](https://arxiv.org/html/2602.23438); [arXiv 2604.04192](https://arxiv.org/html/2604.04192v1)
- AesthetiQ (CVPR 2025) — trabalho sobre alinhamento estético em geração de layout gráfico — [CVPR 2025 supplemental](https://openaccess.thecvf.com/content/CVPR2025/supplemental/Patnaik_AesthetiQ_Enhancing_Graphic_CVPR_2025_supplemental.pdf)

### Inferences
- Manter NR-IQA fora do gate é a escolha alinhada ao estado da arte. Para **fotos** dentro das peças (foto de produto, retrato), um NR moderno (TOPIQ-NR/QualiCLIP/MUSIQ-koniq) poderia rodar como **INFO** só na região fotográfica, nunca na arte inteira.
- Para arte gráfica, as checagens objetivas valem mais que NR-IQA: FR (SSIMULACRA2/Butteraugli contra o master), resolução, subamostragem, contraste de texto, cor de marca.
- VLM como "crítico de design" (ex. o próprio Claude) pode ser usado como **sugestão humana-revisada**, não como nota — os benchmarks de 2026 mostram lacunas.

### Gaps
- Não obtive tabela de SRCC/PLCC por modelo (a página de benchmark do pyiqa não veio no fetch); números como "Q-Align SRCC ~0,94 em KonIQ" não foram verificados nesta rodada.
- Não encontrei avaliação de MUSIQ/CLIP-IQA/Q-Align especificamente em SIQAD/SCID (conteúdo de tela) em 2025–2026.

---

## 6. Acessibilidade de imagens e zonas seguras de redes sociais

### Takeaway
WCAG aplica os mesmos contrastes de texto (4,5:1; 3:1 para texto grande) a **imagens de texto** e prefere texto real a imagem de texto quando possível (1.4.5). Meta unificou a zona segura 9:16 (Stories/Reels FB+IG): ~14% topo, ~35% base, ~6% laterais para anúncios. A esteira não tem nenhuma dessas checagens hoje.

### Cited Findings
- SC 1.4.3 (AA): apresentação visual de texto **e imagens de texto** com contraste ≥ 4,5:1; texto grande e imagens de texto grande ≥ 3:1; exceções: texto incidental, decorativo, logotipo, ou parte de imagem com outro conteúdo visual significativo (ex. placa numa foto) **[NORMA]** — [W3C: Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum)
- SC 1.4.5 (AA) Imagens de texto: se a apresentação puder ser feita com tecnologia web, usar texto real em vez de imagem de texto **[NORMA]** — [WCAG 1.4.5 explicação](https://wcag.dock.codes/rewrite/en/wcag145); [W3C 1.4.3 (referência cruzada)](https://w3c.github.io/wcag/understanding/contrast-minimum)
- Zona segura Stories/Reels (anúncios Meta, 1080×1920): evitar 14% superior (~269 px), 35% inferior (~672 px), 6% laterais (~65 px); para Stories orgânicos, ~14% topo e ~20% base (~385 px) **[PLATAFORMA-relato via agregadores; Meta Ads Guide é a origem declarada]** — [Cadenus 2026](https://cadenus.io/resources/blog/instagram-safe-zone/); [AdsUploader: Meta ads safe zones](https://adsuploader.com/blog/meta-ads-safe-zones); [1ClickReport 2026](https://www.1clickreport.com/blog/meta-ads-creative-safe-zones-2026-guide)
- Meta consolidou FB Stories, FB Reels, IG Stories e IG Reels numa zona segura 9:16 única **[PLATAFORMA-relato]** — [AdsUploader](https://adsuploader.com/blog/meta-ads-safe-zones); [Solid Labs: Social safe zones 2026](https://www.solidlabs.com/social-safe-zones)

### Inferences
- **Checagens faltantes de maior valor**: (1) contraste do texto na arte (OCR/ou camadas do arquivo-fonte → razão WCAG ≥ 4,5:1, ou ≥ 3:1 para títulos grandes) — FAIL/WARNING com proveniência [NORMA]; (2) zona segura para peças 9:16 (texto/logo fora das faixas 14/35/6%) — WARNING [PLATAFORMA]; (3) presença de alt text quando a imagem vai para site (WCAG 1.1.1, não verificado nesta rodada).
- Para marcas P&B estritas (Desbravando etc.) contraste costuma passar trivialmente; o risco real é texto sobre foto.

### Gaps
- Não obtive a página oficial do Meta Ads Guide com os percentuais (apenas agregadores consistentes entre si).
- Zonas seguras de LinkedIn e Status do WhatsApp: não pesquisadas.
- WCAG 1.1.1 (alt text) e diretrizes de alt text em redes (Instagram "texto alternativo") não foram buscadas nesta rodada.

---

## 7. Metadados EXIF/privacidade e LGPD

### Takeaway
Remover GPS/autor/câmera antes de publicar é boa prática; geolocalização é dado pessoal. WhatsApp supostamente remove EXIF, mas site, e-mail, Drive e entregas diretas de arquivo **não** — logo o WARNING da esteira é pertinente principalmente para entregas fora do WhatsApp. Não encontrei guia da ANPD específico sobre metadados de imagem.

### Cited Findings
- WhatsApp remove todo EXIF (GPS, perfil de câmera, espaço de cor) **[PLATAFORMA-relato, sem método]** — [DEV Community 2026](https://dev.to/eldhopaulose/whatsapp-image-dimensions-compression-guide-2026-cheatsheet-client-side-resizer-pipeline-5h2b)
- Geolocalização é citada como exemplo de dado pessoal sob a LGPD (discussão do Idec sobre dados de localização) — [Idec: coronavírus e geolocalização](https://idec.org.br/noticia/coronavirus-e-geolocalizacao-idec-propoe-diretrizes-para-o-uso-de-dados)
- A ANPD abriu consulta sobre Guia de Anonimização e Pseudonimização, que inclui técnicas para dados estruturados e **imagens** — [Mattos Filho](https://www.mattosfilho.com.br/unico/anonimizacao-pseudonimizacao-direitos-titulares/); [Cescon Barrieu](https://cesconbarrieu.com.br/anpd-abre-consulta-a-sociedade-sobre-proposta-de-guia-de-anonimizacao-e-pseudonimizacao-para-protecao-de-dados-pessoais/)

### Inferences
- WARNING para GPS/autor/câmera está adequado. Calibração sugerida: **GPS presente em peça destinada a site/download público = FAIL** (dado de localização exposto diretamente e indexável); autor/câmera/serial = WARNING; destino WhatsApp = INFO (relato de remoção). Também considerar XMP/IPTC (não só EXIF) e miniaturas EXIF embutidas (thumbnail pode conter a imagem original antes do recorte) — inferência a partir de prática forense comum, sem fonte nesta rodada.
- Imagem de pessoa identificável é dado pessoal por si (rosto), independentemente de metadado — fora do escopo de checagem automática, mas cabe um lembrete de autorização de uso de imagem em peças com pessoas.

### Gaps
- Não encontrei guia oficial da ANPD sobre fotografias/metadados; a afirmação "dado de localização é dado pessoal" depende da definição ampla do art. 5º, I da LGPD (texto legal não buscado nesta rodada).
- Comportamento oficial de Instagram/Facebook/LinkedIn quanto a EXIF não foi verificado.

---

## Quadro-resumo: esteira-qa × mercado (para o redator)

| Checagem da esteira | Mercado / norma | Posição da esteira | Calibração sugerida |
|---|---|---|---|
| CMYK para tela = FAIL | Web assume sRGB (CSS Color 4) | Alinhada | Manter |
| ICC ≠ sRGB = WARNING | IG converte/descarta (relato); navegadores gerenciam perfis | Alinhada (social); rígida (site) | Separar "P3 padrão" de "perfil de dispositivo"; INFO para site |
| JPEG q ≥ 80 (sem âncora) | Lighthouse q85; SSIMULACRA2 80 ≈ q85 4:2:2 | Levemente mais frouxa | Ancorar no Lighthouse; adicionar subamostragem; SSIMULACRA2 vs master |
| 300 ppi FAIL (gráfica) | GWG: erro < 95, aviso < 149; Gelato aviso 150–225 | **Muito mais rígida** | FAIL < 150, WARNING 150–299; grande formato por distância |
| EXIF = WARNING | Boa prática; geolocalização = dado pessoal | Alinhada | GPS em destino público = FAIL; incluir XMP/IPTC |
| Sem NR-IQA em arte | NR treinado em foto falha em SCI; VLMs com lacunas (ICLR 2026) | Alinhada com a literatura | Opcional INFO só em regiões fotográficas |
| ΔE00 2,0 marca | Pantone < 2 (meta 1); ISO 12647-2 3,5/5 (informativo) | Alinhada (raster); frouxa (CSS) | CSS: ≤ 0,5 OK, 0,5–2 "quase-token"; raster JPEG talvez 3,0 |
| Neutro C* ≤ 1,0 | G7 a*/b* ±1,5; ΔCh < 1 média, < 2 máx | Mais rígida que G7 | Manter 1,0 para P&B estrito; 1,5 (G7) para demais |
| — (faltando) | WCAG 1.4.3 em imagens de texto; zona segura 9:16; dimensões por plataforma; subamostragem croma; TAC/sangria | Ausente | Adicionar |
