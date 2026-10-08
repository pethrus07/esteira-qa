# Padrões de mercado para QA web: acessibilidade, estabilidade de layout, desempenho e peso de página (foco Brasil, out/2026)

Convenção de rótulos usada nestas notas: **[LEI]** = obrigação legal no Brasil; **[NORMA]** = norma técnica/padrão (W3C, ABNT, ISO); **[CONVENÇÃO]** = prática de mercado/plataforma (Google, Apple, Mozilla etc.); **[PESQUISA]** = estudo empírico. Pesquisa feita em 08/10/2026.

## 1. Status do WCAG 2.2, do WCAG 3.0 e do APCA: 4,5:1 continua sendo a referência?

### Takeaway
WCAG 2.2 é a referência vigente (Recomendação W3C desde 05/10/2023 e ISO/IEC 40500:2025 desde 21/10/2025). WCAG 3.0 ainda é Working Draft (última versão 10/09/2026), sem algoritmo de contraste definido; o APCA saiu do rascunho em 2023. Para conformidade e uso jurídico, 4,5:1 / 3:1 (SC 1.4.3) continua sendo a régua. O APCA pode servir como informação complementar, nunca para substituir o 4,5:1.

### Cited Findings
- [NORMA] O WCAG 2.2 foi publicado em 05/10/2023 com 9 critérios novos: 2.4.11 Focus Not Obscured (Minimum) **AA**, 2.4.12 (AAA), 2.4.13 Focus Appearance (AAA), 2.5.7 Dragging Movements **AA**, 2.5.8 Target Size (Minimum) **AA**, 3.2.6 Consistent Help (A), 3.3.7 Redundant Entry (A), 3.3.8 Accessible Authentication (Minimum) **AA** e 3.3.9 (AAA). O 4.1.1 Parsing foi removido. — [W3C WAI, What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [NORMA] O WCAG 2.2 foi aprovado como norma ISO, a ISO/IEC 40500:2025, em 21/10/2025. Isso facilita a adoção formal por outros países. — [W3C WAI news, 2025-10-21](https://www.w3.org/WAI/news/2025-10-21/wcag22-iso)
- [NORMA] O WCAG 3.0 é um W3C Working Draft datado de 10/09/2026. O texto diz: "The contrast algorithm used in WCAG 3 is yet to be determined", afirma que "it still has several years of work. Details will change" e que "WCAG 3 does not replace WCAG 2. WCAG 2 is used around the world and will still be required by different countries for a long time to come." — [W3C TR WCAG 3.0](https://www.w3.org/TR/wcag-3.0/)
- O APCA foi marcado para remoção no início de 2023 e retirado do Working Draft de julho de 2023. No Editor's Draft de 08/04/2026, o contraste é só um placeholder. O 4,5:1 do WCAG 2 "remains the current legal and compliance standard". Roselli recomenda escolher cores que também passem no WCAG 2 ou documentar as falhas com uma resposta pronta. Ele projeta o WCAG 3 final para 2030, no mínimo. — [Adrian Roselli, WCAG3 Contrast as of April 2026](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)
- Fontes secundárias projetam a Candidate Recommendation do WCAG 3 para o 4º trimestre de 2027 e a Recommendation para 2028 ou depois. Isso diverge dos "2030 at the earliest" de Roselli. Nenhuma data é oficial do W3C. — [ADA Compliance Pros](https://www.adacompliancepros.com/blog/wcag-3-draft-status-procurement); contraposto por [Roselli](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)

### Inferences
- A regra atual da esteira (1.4.3, com 4,5:1 normal e 3:1 grande, FAIL na web) está alinhada com o padrão legal e técnico. Os textos secundários das duas marcas, com 3,20:1 e 3,48:1, **reprovam** no AA para texto normal. Só passariam se fossem "texto grande" (≥ 24 px, ou ≥ 18,66 px em negrito). Esse limiar de texto grande vem do conhecimento de base sobre o WCAG e não foi rebuscado nesta sessão.
- Pode-se acrescentar o valor Lc do APCA como **info** (rótulo "experimental, não normativo") para orientar escolhas de design. Ele nunca deve decidir FAIL/PASS.
- Vale atualizar a lista de tags do axe: a esteira já inclui `wcag22aa`, o que está correto. O 4.1.1 Parsing não deve mais pesar, porque foi removido no 2.2.

### Gaps
- Não confirmei se o Lc do APCA (ex.: Lc 75 para corpo de texto) tem alguma adoção normativa em algum país. Não achei fonte que indique isso.
- A data oficial do W3C para a Candidate Recommendation do WCAG 3 não foi encontrada. Só há projeções de terceiros, e elas divergem.

## 2. Brasil: LBI art. 63, eMAG 3.1 e ABNT NBR 17225:2025

### Takeaway
**[LEI]** A LBI (Lei 13.146/2015), art. 63, já obriga a acessibilidade nos sites de **empresas com sede ou representação no país** e de órgãos de governo, "conforme as melhores práticas e diretrizes adotadas internacionalmente". Na prática, isso remete ao WCAG. Falta regulamentação federal: o MPF entrou com ação em 06/2026 para forçá-la. **[NORMA]** A ABNT NBR 17225:2025 (11/03/2025) é a norma técnica nacional, baseada no WCAG 2.2. A "conformidade regular" dela equivale ao nível AA. **[NORMA/obrigação pública]** O eMAG 3.1 é obrigatório só para a administração pública federal (SISP).

### Cited Findings
- [LEI] Art. 63 da LBI: "É obrigatória a acessibilidade nos sítios da internet mantidos por empresas com sede ou representação comercial no País ou por órgãos de governo, para uso da pessoa com deficiência, garantindo-lhe acesso às informações disponíveis, conforme as melhores práticas e diretrizes de acessibilidade adotadas internacionalmente." — [Lei 13.146/2015 (Planalto)](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm); texto conferido via [Modelo Inicial, art. 63](https://modeloinicial.com.br/lei/L-13146-2015/lei-brasileira-inclusao-pessoa-deficiencia-estatuto-pessoa-deficiencia/art-63)
- [LEI/enforcement] Em 10/06/2026, o MPF (PR-SP) ajuizou ação civil pública para obrigar a União a regulamentar o art. 63 em 60 dias e a apresentar um plano de transição para os sites dela em 120 dias. A ação pede dano moral coletivo de pelo menos **R$ 144 milhões**. Ela registra que, mais de 10 anos depois da lei, não há regulamentação, e que o MPF havia expedido recomendações em 08/2025, sem cumprimento. Segundo a ação, e-commerces, prestadores de serviço e instituições financeiras usam a falta de diretrizes técnicas como justificativa para manter sites inacessíveis. A ação cita a NBR 17225/2025. — [MPF, "MPF exige que a União defina regras..."](https://www.mpf.mp.br/o-mpf/unidades/pr-sp/noticias/mpf-exige-que-a-uniao-defina-regras-para-garantir-acessibilidade-em-sites-publicos-e-privados)
- Outra ACP do MPF/SP busca proibir publicidade do governo federal em sites não acessíveis. O inquérito apontou que, de dez grandes sites de notícias, nenhum cumpre totalmente a LBI. — [WPT, sobre a ação do MPF](https://mwpt.com.br/falta-de-acessibilidade-nos-sites-e-tema-de-acao-do-ministerio-publico-federal/)
- Uma agência de marketing afirma que já houve multas acima de R$ 1 milhão e exigência judicial de auditoria. A fonte é secundária e comercial, sem caso nomeado: **não verificado**. — [Agência Ape](https://www.agenciaape.com.br/acessibilidade-digital-lei-lbi-site/)
- [NORMA] A ABNT NBR 17225 (Acessibilidade em conteúdo e aplicações web: requisitos) foi lançada em 11/03/2025. É baseada no WCAG 2.2 e organizada por tema (teclado, imagens, semântica, links/botões, formulários, contraste, mídia, animação/tempo). Fontes secundárias falam em "146 recomendações". — [Hand Talk](https://www.handtalk.me/br/blog/nbr-17225-acessibilidade-site/); [Biblioteca Anvisa (registro da norma)](https://bibliotecadigital.anvisa.gov.br/jspui/handle/anvisa/20335)
- [NORMA] A norma tem dois níveis. A **conformidade regular** cumpre todos os "requisitos" e está alinhada aos níveis A+AA do WCAG 2.2. A **conformidade plena** cumpre requisitos e recomendações e exige justificativa para cada recomendação não atendida. Item 5.8.7: alvo mínimo de **24×24 px** (requisito). Item 5.8.6: **44×44 px** (recomendação). Item 5.11.3: contraste de **4,5:1** (requisito). Item 5.11.2: **7:1** (recomendação). A norma traz checklist de conformidade e uma seção sobre CAPTCHA e biometria. Ela não trata de obrigação legal. — [Ceweb.br / Todos na Web, correspondência WCAG 2.2 × NBR 17225](https://todosnaweb.ceweb.br/publicacoes/wcag-2-2-abnt-17225)
- [NORMA pública] A Portaria SLTI nº 3, de 07/05/2007, institucionalizou o e-MAG no SISP, com adoção obrigatória pelos órgãos do SISP. O eMAG adapta o WCAG ao contexto brasileiro. A versão vigente é a 3.1. — [Portaria SLTI 3/2007 (gov.br)](https://www.gov.br/governodigital/pt-br/legislacao/portaria3_eMAG1.pdf); [LegisWeb](https://www.legisweb.com.br/legislacao/?id=199385)

### Inferences
- Para cliente **privado** (ex.: o site Wix), o enquadramento correto é este. A obrigação legal genérica já existe (art. 63 da LBI). O parâmetro técnico mais defensável é a NBR 17225, em conformidade regular, que equivale a WCAG 2.2 AA. Ainda não há regulamento federal com sanção específica. O risco é de ACP, Procon/consumidor e reputação, não de multa administrativa tabelada.
- A esteira pode rotular os achados com dupla referência ("WCAG 2.2 SC 1.4.3 / NBR 17225 item 5.11.3"). Isso dá peso local ao relatório para o cliente.
- O eMAG 3.1 é baseado em versões antigas do WCAG e só obriga o governo federal. Ele só deve virar régua para clientes públicos.
- A política de 24 px = FAIL e 44 px = info coincide exatamente com a NBR 17225 (requisito × recomendação). A esteira pode citar isso.

### Gaps
- O § 1º do art. 63 (símbolo de acessibilidade em destaque) e os parágrafos seguintes não foram conferidos nesta sessão: a página do Planalto deu ECONNRESET.
- Não achei sentença judicial nomeada contra empresa privada com base no art. 63 e valor confirmado em fonte primária.
- O texto integral da NBR 17225 é pago. Os números de itens vêm da tabela de correspondência do Ceweb.br, não da norma.

## 3. Cobertura da automação e benchmark (Deque, GDS, WebAIM Million)

### Takeaway
O axe acha cerca de 57% dos problemas **por volume** (Deque, 2021). Pela contagem de critérios automatizáveis, a cobertura fica em 20–30%. Uma auditoria da GDS (2018) achou 29% das barreiras plantadas com o axe. No WebAIM Million 2026, 83,9% das home pages têm texto de baixo contraste (média de 34 ocorrências por página), e páginas Wix têm em média 33,3 erros. Os 17 erros de contraste do site do cliente ficam abaixo da média geral de 34, mas mostram falha sistêmica de paleta.

### Cited Findings
- [PESQUISA] Deque: o teste automatizado identificou 57% das questões em mais de 2.000 auditorias, com mais de 13.000 páginas (só primeiras avaliações) e quase 300.000 issues, usando axe-core. A métrica é o **volume total de issues**, não o número de critérios de sucesso. O "20–30%" da indústria se refere à contagem de critérios automatizáveis. O axe-core prioriza não gerar falsos positivos. — [Deque blog](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues)
- [PESQUISA] A auditoria da GDS (Reino Unido), de 13/04/2018, plantou 142 barreiras e rodou 13 ferramentas. A melhor achou 40% (50% contando "potenciais"), a pior 13%. O aXe achou 29% (30% com potenciais). Conclusão: revisão humana é necessária. — [GDS accessibility-tool-audit](https://alphagov.github.io/accessibility-tool-audit/)
- [PESQUISA] WebAIM Million 2026 (análise de fevereiro): 56.114.377 erros, média de **56,1 erros por página** (+10,1% sobre 51 em 2025). **95,9%** das home pages têm falhas WCAG 2 A/AA detectáveis. Principais falhas: baixo contraste **83,9%**; alt ausente 53,1%; input sem label 51%; link vazio 46,3%; botão vazio 30,6%; idioma do documento ausente 13,5%. Esses seis tipos somam 96% dos erros. O baixo contraste aparece em média **34 vezes por página** (+15%). — [WebAIM Million](https://webaim.org/projects/million/)
- [PESQUISA] WebAIM Million 2026 por plataforma: Wix com 33,3 erros médios (−40,6% em relação à média), Squarespace 33,0 (−41,2%), WordPress 52,8 (−5,8%). O relatório avisa que "absence of detected errors does not indicate that a page is accessible or conformant". — [WebAIM Million](https://webaim.org/projects/million/)
- Em 2025, o baixo contraste estava em 79,1% das home pages. Em 2026 subiu para 83,9%, e o relatório associa isso à moda do texto cinza. — [Priority Pixels, resumo do relatório de 2026](https://prioritypixels.co.uk/insights/web-accessibility-is-getting-worse-according-to-the-2026-webaim-million-report/)

### Inferences
- A afirmação da esteira ("axe cobre cerca de 57% por volume, zero violações ≠ acessível") está correta e bem fundamentada. Vale acrescentar a nuance de 20–30% por critério de sucesso e o dado da GDS (axe 29% de barreiras plantadas, 2018). Assim fica claro que "57%" é teto otimista.
- Benchmark do site Wix do cliente: 17 falhas de contraste ficam **abaixo** da média de 34 do WebAIM, mas o site está entre os 83,9% que falham. O relatório pode dizer exatamente isso, sem dramatizar.
- As seis falhas mais comuns do WebAIM (contraste, alt, label, link vazio, botão vazio, `lang`) já são cobertas pelo axe nas tags atuais. A esteira está calibrada para o que mais aparece.

### Gaps
- A participação do contraste (1.4.3) no volume do estudo da Deque não foi confirmada nesta sessão.
- O WebAIM não publica, nesta página, dados por país (Brasil).

## 4. Tamanho de alvo: exceções do 2.5.8, diretrizes de plataforma e pesquisa de toque

### Takeaway
O SC 2.5.8 (AA) pede 24×24 CSS px, com cinco exceções: espaçamento, equivalente, inline, controle do user agent e essencial. A esteira exclui só skip links e links em texto, então precisa implementar a exceção de **espaçamento** (círculo de 24 px) para não gerar falso FAIL. Os 44 pt (Apple) e 48 dp (Material) são convenções de plataforma. A pesquisa de toque com o polegar aponta cerca de 9,2–9,6 mm.

### Cited Findings
- [NORMA] Exceções do 2.5.8. **Spacing**: o alvo menor que 24×24 é aceito se um círculo de 24 CSS px de diâmetro, centrado na bounding box de cada alvo, não intersecta outro alvo nem o círculo de outro alvo pequeno. **Equivalent**: outro controle na página cumpre a mesma função e passa. **Inline**: o alvo está numa frase ou o tamanho é limitado pelo line-height de texto. **User agent control**: tamanho definido pelo navegador e não alterado pelo autor. **Essential**: ex.: pinos de mapa. — [W3C Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [NORMA] A NBR 17225 exige 24×24 px (item 5.8.7) e recomenda 44×44 px (item 5.8.6). — [Ceweb.br](https://todosnaweb.ceweb.br/publicacoes/wcag-2-2-abnt-17225)
- [CONVENÇÃO] Apple HIG: 44×44 pt mínimo. Material Design: 48×48 dp. Ambos equivalem a cerca de 9–12 mm. O SC 2.5.5 (AAA) pede 44×44 CSS px. — [Specification.website, touch target size](https://specification.website/spec/accessibility/touch-target-size/) (fonte secundária)
- [PESQUISA] Parhi et al. estudaram o uso do polegar com uma mão: alvos de 9,2 mm (tarefas discretas) e 9,6 mm (tarefas seriais) bastam, sem diferença significativa de erro acima desses tamanhos. O Understanding do 2.5.8 lista esse estudo como recurso relacionado. — [Microsoft Research, Target Size Study for One-Handed Thumb Use](https://www.microsoft.com/en-us/research/?p=155150); [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

### Inferences
- A esteira deve implementar o teste do círculo de 24 px. Hoje, alvos de 20 px bem espaçados (ícones de rede social, por exemplo) seriam FAIL falso. Quando faltar espaçamento, o resultado continua FAIL. Os controles nativos não estilizados (date picker etc.) entram como exceção de user agent.
- A régua antiga de 24/44/56 tem base para 24 (WCAG AA, NBR) e 44 (Apple, AAA, NBR recomendação). O **56 px não tem lastro** em norma nem em convenção encontrada. O 48 (Material) seria o terceiro degrau defensável.

### Gaps
- Não busquei fonte primária da Apple nem do Material: os valores 44 pt e 48 dp vieram de fonte secundária, embora sejam amplamente conhecidos.

## 5. Core Web Vitals em 2026: limiares, campo × laboratório, variância e medição de CLS em automação

### Takeaway
Os limiares "bons" são LCP ≤ 2,5 s, INP ≤ 200 ms e CLS ≤ 0,1, avaliados no **p75 de dados de campo** (CrUX), separados entre mobile e desktop. O INP substituiu o FID em 2024. O laboratório não mede INP (usa-se TBT como proxy) e só mede CLS da carga. Lighthouse varia de execução para execução: a mediana de 5 execuções é "duas vezes mais estável". FAIL de laboratório só faz sentido sobre agregados.

### Cited Findings
- [CONVENÇÃO Google] Os três CWV estáveis são LCP ≤ 2,5 s, INP ≤ 200 ms e CLS ≤ 0,1, "at the 75th percentile of page loads, segmented across mobile and desktop devices". O INP virou CWV estável em 2024, substituindo o FID. Ferramentas de laboratório (Lighthouse, DevTools) medem LCP e CLS. Lighthouse e similares "cannot measure INP", e o proxy é o TBT. — [web.dev, Web Vitals](https://web.dev/articles/vitals)
- [CONVENÇÃO Google] Lighthouse "may not show the full CLS" porque faz só a carga básica. O CrUX mede o CLS "throughout the full life of the page". Divergência entre CrUX e Lighthouse indica CLS pós-carga. Os user flows do Lighthouse permitem medir além da carga. — [web.dev, Optimize CLS](https://web.dev/articles/optimize-cls)
- [CONVENÇÃO] Variabilidade do Lighthouse: as fontes são o não determinismo da página, as redes local e tier-1, o servidor, o hardware, a contenção de recursos e o navegador. "The median Lighthouse score of 5 runs is twice as stable as 1 run." Para limiares, recomenda-se usar "the median, 90th percentile, or even min/max instead of single test results". Hardware mínimo: 2 núcleos dedicados (4 recomendados) e 2 GB de RAM (4–8 GB recomendados), evitando instâncias burstable. O throttling simulado mitiga mais fontes que o do DevTools. — [Lighthouse docs/variability.md](https://raw.githubusercontent.com/GoogleChrome/lighthouse/HEAD/docs/variability.md)
- [CONVENÇÃO] Throttling padrão do Lighthouse mobile: RTT de 150 ms, 1,6 Mbps de download e 750 Kbps de upload ("Slow 4G", aproximadamente o quartil inferior do 4G) e CPU 4× mais lenta, próxima de um Moto G Power. — [Lighthouse docs/throttling.md](https://raw.githubusercontent.com/GoogleChrome/lighthouse/HEAD/docs/throttling.md) (conteúdo via resultado de busca)
- Medição de CLS em Playwright: PerformanceObserver com `type: 'layout-shift', buffered: true`, ignorando entradas com `hadRecentInput` (shifts até 500 ms depois de input não contam). O observer reporta com atraso, quando a thread principal está ociosa. — [QASkills, CLS debugging](https://qaskills.sh/blog/web-vitals-cls-layout-shift-debugging); [web.dev, Debug layout shifts](https://web.dev/articles/debug-layout-shifts)

### Inferences
- **CLS ≤ 0,1 como FAIL de laboratório**: o limiar é o mesmo do Google, mas o Google aplica o p75 de campo. Recomenda-se rotular "CLS de laboratório (só carga)" e, se houver tráfego suficiente, consultar o CrUX/PSI (p75) como verdade de campo. O FAIL deve vir de um agregado (pior de N execuções ou mediana), não de uma execução isolada.
- **LCP como WARNING**: decisão correta, dada a variância observada (620–1016 ms). Para endurecer, seria preciso rodar 5 vezes, pegar a mediana e usar throttling (Slow 4G + 4× CPU). Sem throttling, um LCP de cerca de 1 s num i9 diz pouco sobre o usuário de celular médio no Brasil.
- **INP** não pode ser checado no laboratório. Como proxy opcional, TBT (convenção do Lighthouse: ≤ 200 ms é "bom", conhecimento de base não rebuscado).
- **Armadilha do `isMobile`+`hasTouch` sem entradas de layout-shift**: hipótese não verificada. Com `hasTouch`, a página pode receber eventos que marcam `hadRecentInput`. Também pode ser comportamento do Chromium sob emulação de dispositivo. Usar a viewport de 390 sem emulação é uma solução de contorno razoável, mas deve ficar documentada como limitação.

### Gaps
- Não achei documentação ou issue do Playwright/Chromium que explique a ausência de entradas `layout-shift` com `isMobile: true`. Recomenda-se um teste mínimo reproduzível antes de afirmar a causa.
- Não achei dados do CrUX específicos do Brasil (percentual de origens BR que passam nos CWV) nesta sessão.

## 6. Peso de página e recursos: Web Almanac 2025 e orçamentos

### Takeaway
Web Almanac 2025 (crawl de julho de 2025), todas as páginas, mobile: mediana de **2.164 KB**, sendo 911 KB de imagens, 646 KB de JS, 79 KB de CSS e 33 KB de HTML, em 72 requisições. O p90 é de 8.337 KB. Home pages são mais pesadas que páginas internas. O "~2 MB" da esteira está correto como ordem de grandeza.

### Cited Findings
- [PESQUISA] Mediana (p50) mobile: total 2.164 KB; imagens 911 KB; JS 646 KB; CSS 79 KB; HTML 33 KB; 72 requisições. Desktop: 2.412 KB; imagens 1.058 KB; JS 708 KB; CSS 83 KB; HTML 35 KB; 77 requisições. p90: 8.337 KB e 179 requisições no mobile; 9.179 KB e 185 requisições no desktop. A mediana da home page desktop é de 2.862 KB, contra 1.963 KB das páginas internas. Crawl de julho de 2025. — [Web Almanac 2025, Page Weight](https://almanac.httparchive.org/en/2025/page-weight)
- Fontes secundárias citam outros números, como 2,3 MB mobile e 2,6 MB desktop, ou 2.452 KB mobile. A diferença provavelmente vem de misturar "home pages" com "todas as páginas" ou de outro mês do HTTP Archive. Prevalece a fonte primária acima. — [CaptainDNS](https://www.captaindns.com/en/blog/median-web-page-weight-2025); contraposto por [Web Almanac 2025](https://almanac.httparchive.org/en/2025/page-weight)
- O JavaScript já supera as imagens em número de requisições (24 arquivos JS contra 18 imagens por página), embora as imagens ainda sejam cerca de 40% do peso. — [CaptainDNS](https://www.captaindns.com/en/blog/median-web-page-weight-2025) (secundária)

### Inferences
- Para o rótulo info, a esteira pode citar "mediana mobile de 2,16 MB (todas as páginas) e p90 de 8,3 MB, Web Almanac 2025". Valores acima do p90 poderiam virar WARNING.
- Um orçamento por tipo (imagens ≤ ~1 MB, JS ≤ ~650 KB) ancorado nas medianas é defensável como convenção ("não pior que a mediana da web"). Isso não é norma.

### Gaps
- Não busquei a orientação específica de performance budgets (web.dev ou Lighthouse budgets) nesta sessão.

## 7. Checagens ausentes que o mercado considera essenciais (e Wix)

### Takeaway
Além do que a esteira já faz, as checagens de uso corrente são: cabeçalhos de segurança (Mozilla HTTP Observatory), consentimento de cookies conforme o guia da ANPD, foco visível e foco não obscurecido (2.4.7 / 2.4.11 AA), `lang` (falha em 13,5% das home pages), links quebrados e SEO básico. O Wix tem média de erros abaixo da web em geral, mas o assistente de acessibilidade dele não pega contraste de paleta customizada nem apps de terceiros.

### Cited Findings
- [CONVENÇÃO] Mozilla HTTP Observatory: base de 100 pontos, com penalidades e depois bônus, só se a nota estiver ≥ 90. O máximo é 145. Escala: A+ ≥ 100, A 90–99 … F 0–24. Penalidades típicas: sem CSP −25, sem HSTS −20, sem X-Frame-Options −20. A CSP é avaliada com rigor, e uma política sem `'unsafe-inline'` é recompensada. — [MDN HTTP Observatory, Tests and scoring](https://developer.mozilla.org/en-US/observatory/docs/tests_and_scoring); [GitHub http-observatory scoring.md](https://github.com/mozilla/http-observatory/blob/main/httpobs/docs/scoring.md)
- [LEI/orientação] A ANPD publicou o Guia Orientativo "Cookies e Proteção de Dados Pessoais" em 18/10/2022. O guia relaciona as bases legais (consentimento × legítimo interesse) às categorias de cookies e **desencoraja fortemente banners com opções pré-selecionadas**. — [Mattos Filho](https://www.mattosfilho.com.br/unico/anpd-guia-cookies-protecao-dados/); [Lefosse](https://lefosse.com/noticias/alerta/anpd-publica-guia-orientativo-sobre-o-uso-de-cookies/)
- [NORMA] 2.4.11 Focus Not Obscured (Minimum) é AA no WCAG 2.2. O 2.4.13 Focus Appearance é AAA. — [W3C WAI, What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [PESQUISA] O idioma do documento ausente aparece em 13,5% das home pages. Links vazios aparecem em 46,3% e botões vazios em 30,6%. — [WebAIM Million](https://webaim.org/projects/million/)
- Wix: o Accessibility Wizard verifica alt text, hierarquia de headings, navegação por teclado e indicador de foco, e gera declaração de acessibilidade. Fontes de terceiros apontam limites: ele **não pega contraste baixo de paletas customizadas** (cinza claro sobre branco), campos de Wix Forms e Bookings podem ficar sem label e erro associados, e apps do App Market (popups, chat, reviews, calendários) renderizam HTML fora do ferramental do Wix. — [Wix Studio Academy, Accessibility Wizard](https://www.wix.com/studio/academy/tutorials/accessibility-wizard); [WCAG Repair, Wix guide](https://wcagrepair.com/blog/wix-accessibility-guide) (secundária e comercial)
- Overlays e widgets de acessibilidade não corrigem problemas estruturais. Em 2024, 1.023 das 4.061 ações da ADA nos EUA (25%) citaram overlays como barreira. — [TestParty](https://testparty.ai/blog/accessibility-overlays-lawsuits-truth) (fonte comercial, contexto dos EUA)

### Inferences
- Checagens a acrescentar, em ordem de custo × valor:
  1. Cabeçalhos HTTP (HSTS, CSP, X-Content-Type-Options, X-Frame-Options/frame-ancestors, Referrer-Policy) como WARNING, com nota estilo Observatory como info. Em sites Wix o controle sobre cabeçalhos é limitado, então o achado deve sair como "limitação da plataforma".
  2. Teste de teclado automatizável: navegar por Tab, verificar que todo foco tem indicador visível (diferença de estilo computado antes e depois do foco, SC 2.4.7, conhecimento de base) e que não fica coberto por header fixo ou banner de cookies (2.4.11 AA). O banner de cookies cobrindo o foco é um caso clássico.
  3. Banner LGPD: presença do banner, ausência de opções pré-marcadas e possibilidade de recusar. Como WARNING, rotulado como orientação da ANPD, não como norma técnica.
  4. Links quebrados (status ≥ 400 em `<a href>` internos), title, meta description, `lang`, canonical, favicon e Open Graph como info ou WARNING. São convenção de SEO e compartilhamento, sem lastro normativo, exceto `lang` (SC 3.1.1 A, já coberto pelo axe) e title (SC 2.4.2 A, já coberto pelo axe).
  5. Movimento reduzido: rodar com `reducedMotion: 'reduce'` no Playwright e conferir se animações longas param (SC 2.3.3 é AAA, então fica como info).
- No Wix, o que falha em contraste é a paleta do tema. A correção é no tema, e um overlay não resolve. Isso dá um bom argumento para o relatório ao cliente.

### Gaps
- Não busquei fontes primárias para as checagens de SEO (title, meta description, canonical, OG) nem para o SC 2.4.7. Ficam como convenção ou conhecimento de base.
- Não achei documentação oficial do Wix listando limitações conhecidas. As fontes de limitação são de terceiros comerciais.
- Não verifiquei se o Wix permite configurar cabeçalhos de segurança customizados (CSP/HSTS) em 2026.
