# Padrões de mercado para QA de planilhas (.xlsx) e de repositórios JS/TS — comparação com a esteira-qa

Legenda de natureza da fonte: **[PADRÃO]** = norma/guia publicado por órgão ou corpo profissional; **[FERRAMENTA]** = convenção/comportamento de ferramenta; **[PESQUISA]** = achado empírico publicado. Itens marcados *(não verificado nesta sessão)* vêm de conhecimento prévio sem fetch — tratar como pista, não como citação.

## 1. Pesquisa sobre erros em planilhas e ferramentas de detecção (taxas, precisão/recall)

### Takeaway
Erro em planilha é a regra, não a exceção (≈ 1–5% das células com fórmula erradas; ~90% das planilhas auditadas com ao menos um erro), e só a inspeção célula a célula foi demonstrada eficaz. O detector de "fórmula inconsistente com a vizinhança" da esteira replica a ideia do ExceLint, cuja precisão **média** é 64,1% (mediana 100%) — portanto WARNING, e não FAIL, é a severidade correta.

### Cited Findings
- [PESQUISA] Panko (revisão de 15 anos de estudos): "spreadsheet errors are both common and non-trivial"; somente a inspeção célula a célula (code inspection) foi demonstrada eficaz para reduzir erros — [Panko, "Spreadsheet Errors: What We Know. What We Think We Can Do" (arXiv 0802.3457)](https://arxiv.org/abs/0802.3457)
- [PESQUISA] Auditorias de campo compiladas por Panko mostram taxas de erro por célula (CER) de 0,38% a 2,5%; Panko: "Spreadsheets, even after careful development, contain errors in 1% or more of all formula cells" — via resumo em [Correctness is not enough (arXiv 0808.2045)](https://arxiv.org/pdf/0808.2045) / [planguru](https://planguru.com/blog/88-spreadsheets-errors/) (fonte secundária)
- [PESQUISA] Número frequentemente citado: ~88% (análise de 2008) a ~94% das planilhas reais auditadas têm erro; agregado de 7 auditorias rigorosas (88 planilhas) com CER médio ≈ 5,2% — [SpreadsheetWeb](https://spreadsheetweb.com/how-to-mitigate-spreadsheet-errors/) (fonte **secundária**; os números de Panko variam conforme a revisão do paper — usar com cautela); "Audits find errors in 49 out of 54 spreadsheets" — [Computerworld](https://www.computerworld.com/article/1704893/sidebar-oops.html)
- [PESQUISA] ExceLint (Barowy, Berger, Zorn — OOPSLA 2018): analisa a "forma" das referências de cada fórmula (fingerprint vectors; fórmulas com mesmo formato relativo têm o mesmo vetor) e sinaliza quebras de regularidade. Em 70 planilhas do corpus CUSTODES, mediana de 5 s por planilha — [arXiv 1901.11100](https://arxiv.org/abs/1901.11100)
- [PESQUISA] ExceLint: precisão **média 64,1% (mediana 100%)**, recall **médio 62,1% (mediana 100%)**; CUSTODES (estado da arte anterior, baseado em "smells"): precisão média 20,3% (mediana 0,0%), recall médio 61,2%. Poucos benchmarks (5) concentram a maior parte dos falsos positivos de ambos. Os autores priorizam precisão porque "users find low-precision tools to be untrustworthy" (Bessey et al. 2010). Recall é declaradamente superestimado ("likely that the real recall figures are lower") — [ExceLint PDF, §5](https://arxiv.org/pdf/1901.11100)
- [PESQUISA] Na reanotação dos 70 arquivos: CUSTODES marca 1.199 células como smells, das quais só 102 são erros de fórmula; os autores acharam mais 295 → 397 erros de fórmula no total; ~34 h de auditoria, ≈ 1 erro a cada 5,1 min com a ferramenta; 9.924 "construções incomuns" (fórmulas faltando, operação em não-numérico, "fudge factor" +1000) que não foram contadas como erro — [ExceLint PDF](https://arxiv.org/pdf/1901.11100)
- [PESQUISA] Caso motivador do ExceLint: a análise Reinhart–Rogoff (2010), baseada numa única planilha, teve erro de fórmula descoberto depois — [ExceLint PDF](https://arxiv.org/pdf/1901.11100)
- [PESQUISA] LLMs em planilhas (2025): FLARE — tarefa com erros semeados ("computer chip factory"): Gemini 2.5 Pro 100%, GPT-4 Legacy e Claude 83,33%, Gemini Flash 25% — [FLARE, arXiv 2506.17330](https://arxiv.org/pdf/2506.17330); benchmark de reparo de fórmulas Excel com 618 amostras de erros de runtime, avaliado com GPT-4o/GPT-4.1/Phi-3/Mistral; correção automática de erros semânticos "remains an open problem" — [arXiv 2508.11715](https://arxiv.org/html/2508.11715v1)

### Inferences
- A severidade WARNING da regra "fórmula inconsistente com ≥80% da coluna" está alinhada com a literatura: a ferramenta de referência tem precisão média de ~64%, então FAIL geraria reprovação injusta em ~1/3 dos casos. Manter WARNING; reportar como "suspeita para inspeção", nunca como erro.
- A esteira usa assinatura R1C1 por coluna com limiar de 80%. O ExceLint usa vizinhança 2-D e entropia (não um limiar fixo), e expõe o limiar como parâmetro ajustável pelo usuário. Calibração possível: considerar também linhas (modelos financeiros têm fórmulas consistentes **ao longo da linha/timeline**, ver §2) e ignorar a última linha de totais (o `=SUM(...)` de rodapé é a principal fonte esperada de "inconsistência" legítima).
- O "NÃO MEDIDO" para valores em cache ausentes (arquivo gerado por openpyxl) é correto e honesto; a forma padrão de medir seria recalcular (LibreOffice headless `--convert-to xlsx` recalcula e grava cache) e então ler os erros — vale como melhoria.
- Como a pesquisa diz que só inspeção humana é eficaz, a esteira deveria se apresentar como triagem (reduz o espaço a inspecionar), não como certificação de correção — coerente com a regra interna "reportado não é verificado".
- LLM como auditor ainda tem desempenho instável entre modelos (25%–100% num único benchmark semeado) — útil como segunda opinião, não como gate.

### Gaps
- Não obtive a tabela primária de Panko (panko.com/ssr só tem índice); os 88%/94%/5,2% vêm de fontes secundárias e variam por versão do paper.
- Melford (Singh et al., detecção por rede neural), AmCheck (Dou et al., ICSE 2016, smells de "ambiguous computation"), WARDER, os smells de Hermans (Hermans, Pinzger, van Deursen — "Detecting and visualizing inter-worksheet smells", ICSE 2012 / "Detecting code smells in spreadsheet formulas", ICSM 2012) e o Microsoft Inquire/Spreadsheet Compare: *(não verificado nesta sessão)* — sem números de precisão/recall coletados.
- Repositório de "horror stories" da EuSpRIG (eusprig.org/horror-stories) não foi consultado nesta sessão.

## 2. Padrões de modelagem/apresentação (FAST, ICAEW, SSRB, governo, pesquisa de apresentação de tabelas)

### Takeaway
Os padrões de **modelagem financeira** (FAST, ICAEW) falam de consistência de fórmula, inputs separados e proibição de merge; quase nada dizem sobre linhas de grade ou altura de linha. O padrão de **publicação de dados** mais detalhado (UK Government Analysis Function) é o mais próximo do caso "base navegável" — e ele **contradiz** a esteira em dois pontos: recomenda NÃO usar freeze panes/filtros por acessibilidade, e salvar com o cursor em A1 da **primeira** aba (a capa).

### Cited Findings
- [PADRÃO] FAST Standard: evitar "merge cells" (seleção de linhas/colunas fica confusa, desfazer merge é trabalhoso e causa problemas de referência); quando a mesclagem é só visual em saídas, usar "Center Across Selection" — [eFinancialModels sobre FAST](https://www.efinancialmodels.com/formatting-and-design-matters/)
- [PADRÃO] ICAEW Financial Modelling Code: nunca embutir número fixo em fórmula — toda premissa vai numa célula de input rotulada; "Use consistent formulas": uma fórmula deve cobrir a linha inteira (timeline) e, às vezes, o bloco; usar ancoragem ($) pensando em copiar — [ICAEW, Intro to financial modelling part 6](https://www.icaew.com/technical/technology/excel-community/excel-community-articles/2020/intro-to-financial-modelling-part-6); [Financial Modelling Code (PDF)](https://www.icaew.com/-/media/corporate/files/technical/technology/excel-community/financial-modelling-code.ashx)
- [PADRÃO] UK Government Analysis Function, "Releasing statistics in spreadsheets" (jun/2021), requisitos **essenciais** (ligados a WCAG 2.2): tabelas marcadas como Tabela; uma linha de cabeçalho, todas as colunas com cabeçalho único; **sem células mescladas/divididas nem tabelas aninhadas**; **sem linhas/colunas em branco dentro de tabelas**; sem linhas/colunas ocultas; **cor nunca como único meio** de comunicar e texto em cor automática; fonte sans serif ≥10 (pref. 12); sem texto vertical; **todo texto da célula visível** (wrap + largura) para evitar leitura "overflowing/cropped" pelo leitor de tela; notas como "[note 1]", nunca sobrescrito — [Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/releasing-statistics-in-spreadsheets/)
- [PADRÃO] Mesmo guia: **desaconselha freeze panes e filtros** ("may fail guideline 2.4 navigable"); se usados, explicar em texto na coluna A acima da tabela, com os atalhos de teclado — [Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/releasing-statistics-in-spreadsheets/)
- [PADRÃO] Mesmo guia, "fortemente recomendado": uma tabela por aba; **capa** com título, resumo, data de publicação, próxima atualização, contato, fonte; sumário (table of contents) em pastas com várias abas; aba de Notas separada; tabelas e abas com nomes significativos; tabela encostada à esquerda; nada abaixo da tabela; fonte em cada aba; remover macros/fórmulas (gravar valores); formatos ODS e CSV+metadados; **salvar com cursor em A1 da primeira aba e zoom 100%** — [Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/releasing-statistics-in-spreadsheets/)

### Inferences
- **Freeze panes (WARNING, limiar arbitrário >30 linhas)**: é convenção de usabilidade (planilha-premium), não padrão; o único padrão governamental encontrado é contrário por acessibilidade. Recomendação: rebaixar para INFO, ou manter WARNING mas exigir que, quando houver congelamento/filtro, exista instrução textual acima da tabela (alinhado ao guia). O limiar de 30 linhas não tem fonte — melhor derivar de "a tabela excede uma tela" (≈ altura visível a 100% de zoom, ~35–45 linhas em 1080p), declarado como heurística.
- **Abrir na primeira aba (capa) = WARNING**: o guia governamental manda exatamente o contrário (cursor em A1 da primeira aba, que é a capa). Se a régua interna quer abrir nos dados, isso é preferência de produto, não padrão de mercado → rebaixar para INFO ou inverter (avisar quando NÃO abre em A1 da primeira aba).
- **Rótulos repetidos suprimidos em faixa de autofiltro = FAIL**: fortemente sustentado — "sem células em branco dentro da tabela" é essencial no guia governamental e é a regra de tidy data; além disso, filtro em coluna com rótulo suprimido devolve linhas órfãs (defeito funcional, não estético). Manter FAIL.
- **Merge dentro da faixa de filtro = WARNING**: FAST, Analysis Function (essencial) e Microsoft Accessibility Checker convergem contra merge em tabela de dados. Há argumento para subir a FAIL quando o merge estiver dentro da faixa do autofiltro (quebra ordenação/filtro); merge em capa/título pode continuar livre (FAST permite em saídas, preferindo Center Across Selection).
- **Texto cortado = WARNING**: o guia governamental torna "todo texto visível" requisito essencial. O achado de 3.138 células cortadas num entregável aprovado sugere que a regra é válida mas o limiar está ruidoso: recalibrar com (a) só contar células cuja vizinha é não-vazia (já faz), (b) ignorar colunas de texto livre longo em que o corte é intencional e há wrap/coluna de detalhe, (c) reportar por **coluna** (ex.: "col D: 2.900 cortes, mediana 9%") em vez de por célula, e (d) separar "corte leve" (<15%) de "corte grave" (>50% ou >2×). Assim o WARNING vira acionável.
- **Gridlines ocultas = WARNING** e **>2 alturas de linha = WARNING**: não encontrei padrão que exija nenhum dos dois; são convenções estéticas internas → INFO/"régua da marca", não régua universal.
- **Faltam na esteira (presentes nos padrões)**: constantes embutidas em fórmula (ICAEW); linhas/colunas ocultas (Analysis Function, essencial); linhas em branco dentro da tabela; cabeçalho ausente/duplicado; nomes de aba padrão ("Planilha1"/"Sheet1"); cor como único portador de informação; fórmulas externas/links para outros arquivos.

### Gaps
- Não acessei o texto integral do FAST Standard (fast-standard.org) nem os "Best Practice Spreadsheet Modelling Standards" do SSRB, nem o UK Aqua Book / HM Treasury Review of QA of Government Models (2013); portanto não há citação deles sobre capa, gridlines ou freeze panes. *(não verificado)*: o Aqua Book trata de QA proporcional ao risco e de documentação/verificação, não de formatação.
- Pesquisa de apresentação de tabelas (Stephen Few, "Show Me the Numbers"; Dona Wong, WSJ Guide) — não consultadas; sem citações sobre gridlines/zebra.
- Broman & Woo (2018) "Data Organization in Spreadsheets" (The American Statistician) e Wickham (2014) "Tidy Data" (J. Stat. Software) *(não verificado nesta sessão)*: recomendam preencher todas as células, não mesclar, não usar cor como dado, uma observação por linha — consistentes com o guia governamental.

## 3. Acessibilidade e padrões de compartilhamento de dados

### Takeaway
O Microsoft Accessibility Checker trata merge/estrutura não-simples e nomes de aba padrão como **avisos**, e cabeçalho de tabela ausente, alt text e "vermelho como único sinal de negativo" como **erros** — a esteira não cobre nenhum dos "erros" do checker.

### Cited Findings
- [FERRAMENTA] Microsoft Accessibility Checker (Excel) — **Erros**: objetos sem alt text; tabelas sem linha de cabeçalho; números negativos indicados só por vermelho; acesso restrito por IRM. **Avisos**: estrutura de tabela simples (sem células divididas/mescladas/aninhadas); nomes de aba significativos (não "Sheet1"); contraste texto-fundo suficiente — [Microsoft Support, Rules for the Accessibility Checker](https://support.microsoft.com/en-us/office/rules-for-the-accessibility-checker-651e08f2-0fc3-4e10-aaca-74b4a67101c1)
- [PADRÃO] Analysis Function: formatos ODS (acessível) e CSV com arquivo de metadados (legível por máquina) — [Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/releasing-statistics-in-spreadsheets/)

### Inferences
- Checks baratos e com respaldo de padrão a adicionar: (1) aba com nome padrão → WARNING; (2) faixa de dados sem Tabela/cabeçalho definido → WARNING; (3) formatação condicional/número que usa só vermelho para negativo → WARNING; (4) contraste de cor de fonte × preenchimento abaixo de 4,5:1 (WCAG AA) → WARNING; (5) imagens/gráficos sem descrição → INFO.
- Em "base navegável", marcar a faixa como Tabela do Excel (ListObject) resolve de uma vez cabeçalho, filtro e navegação por leitor de tela.

### Gaps
- Padrões brasileiros de dados abertos (Portal dados.gov.br, Manual de Dados Abertos/CGU, eMAG) não foram pesquisados nesta sessão.

## 4. Varredura de segredos (gitleaks × TruffleHog × GitHub)

### Takeaway
Regex de prefixo fixo é o método de **maior precisão**, mas é o de menor cobertura; o estudo comparativo de referência mostra trade-off forte (GitHub: maior precisão; gitleaks: maior recall). O ponto cego "tokens do Cloudflare sem prefixo" agora é parcialmente resolvível: o Cloudflare adotou tokens com prefixo (`cfut_`, `cfat_`, `cfk_`) + checksum.

### Cited Findings
- [PESQUISA] Basak et al., ESEM 2023 (SecretBench, 5 ferramentas open source + 4 proprietárias): **precisão** — GitHub Secret Scanner 75%, Gitleaks 46%, "Commercial X" 25%; **recall** — Gitleaks 88%, SpectralOps 67%, TruffleHog 52%. FP vêm de regex genéricas e cálculo de entropia ineficaz; FN vêm de regex defeituosas, tipos de arquivo pulados e regras insuficientes; recomendação: escolher a ferramenta conforme os tipos de segredo do projeto — [arXiv 2307.00714](https://arxiv.org/abs/2307.00714v1); [ESEM 2023](https://conf.researchr.org/details/esem-2023/esem-2023-technical-track/7/A-Comparative-Study-of-Software-Secrets-Reporting-by-Secret-Detection-Tools)
- [PESQUISA] Meli, McNiece, Reaves (NDSS 2019): primeira análise longitudinal em larga escala; vazamento afeta >100.000 repositórios, milhares de segredos novos e únicos vazam por dia; foco em chaves privadas e 11 plataformas com formato de chave **distintivo** (prefixo) — "rampant and far from a solved problem" — [NDSS](https://ndss-symposium.org/ndss-paper/how-bad-can-it-git-characterizing-secret-leakage-in-public-github-repositories); [PDF](https://ndss-symposium.org/wp-content/uploads/2019/02/ndss2019_04B-3_Meli_paper.pdf)
- [FERRAMENTA] Cloudflare — formatos "scannable": Global API Key `cfk_[40 chars][checksum]`, User API Token `cfut_[40][checksum]`, Account API Token `cfat_[40][checksum]`; o checksum permite detecção de alta confiança; Cloudflare faz parceria com scanners e **revoga automaticamente** token vazado e avisa o dono por e-mail — [Cloudflare, Token formats](https://developers.cloudflare.com/fundamentals/api/get-started/token-formats); changelog de formato de service token (26/08/2026) — [Cloudflare changelog](https://developers.cloudflare.com/changelog/post/2026-08-26-service-token-secret-format/)
- [FERRAMENTA] gitleaks (config padrão): regras `cloudflare-api-key` (keyword "cloudflare" + 40 chars `[a-z0-9_-]`), `cloudflare-global-api-key` (keyword + 37 hex), `cloudflare-origin-ca-key` (`v1.0-[a-f0-9]{24}-[a-f0-9]{146}`) — ou seja, para tokens legados sem prefixo, o gitleaks exige a palavra "cloudflare" perto da atribuição; `generic-api-key` usa entropia ≥3,5 com keywords (access, api, auth, key, credential, creds, passwd, password, secret, token); allowlists globais por caminho/regex e ~45 stopwords ("example", etc.) para cortar FP — [gitleaks.toml](https://raw.githubusercontent.com/gitleaks/gitleaks/master/config/gitleaks.toml)
- [FERRAMENTA] TruffleHog: >800 detectores; verifica cada candidato contra a API do provedor e classifica em verified / unverified / unknown; `--results=verified` mostra só os confirmados — [trufflehog README](https://github.com/trufflesecurity/trufflehog)
- [FERRAMENTA] GitHub push protection: bloqueia o push (CLI, UI, upload, REST API) quando detecta segredo; habilitado por padrão para usuários em contas pessoais no GitHub.com para pushes a repositórios públicos; bypass exige motivo ("used in tests"/"false positive" fecham o alerta; "fix later" deixa aberto) e gera alerta + audit log; organizações podem definir padrões customizados — [GitHub Docs, About push protection](https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection)

### Inferences
- A esteira já faz o que a literatura aponta como mais preciso (prefixo fixo + allowlist de chaves EXAMPLE + reportar só arquivo:linha, sem eco do segredo — este último coerente com "credencial nunca redigitada"). Manter FAIL para prefixos fixos.
- **Adicionar já**: `cfut_`, `cfat_`, `cfk_` (prefixo + 40 chars; validar checksum se o formato for documentado) → FAIL; regra estilo gitleaks "keyword cloudflare/CF_API_TOKEN/CLOUDFLARE_API_TOKEN + 40 chars `[A-Za-z0-9_-]`" para tokens legados → WARNING (precisão menor).
- **Entropia genérica** (estilo `generic-api-key`) só como WARNING: é a fonte nº1 de falso positivo segundo Basak et al.
- Verificação ativa (TruffleHog) dá a melhor precisão mas envia o candidato à API do provedor — num gate local de agência, preferir rodar TruffleHog `--results=verified` como passo opcional/manual, não automático.
- Varrer **histórico git** (não só o working tree): segredo apagado num commit posterior continua exposto. Regra de mercado: rotacionar/revogar primeiro, reescrever histórico depois (git filter-repo/BFG) — *(não verificado nesta sessão; doc GitHub "Removing sensitive data from a repository" não foi lida)*.
- `.env` versionado: checar `git ls-files | grep -E '(^|/)\.env(\..*)?$'` excluindo `.env.example` → FAIL independente do conteúdo; e `.gitignore` sem `.env` → WARNING. Lacuna atual da esteira.
- Para Workers Cloudflare: `wrangler.toml`/`wrangler.jsonc` com `vars` contendo segredos (em vez de `wrangler secret`) é padrão de vazamento específico da stack do Pedro — vale regra dedicada.

### Gaps
- Números exatos de Meli et al. (ex.: % de segredos que permanecem após remoção, tempo até exploração) não extraídos — só o resumo.
- Não confirmei se o gitleaks já incluiu regra para `cfut_`/`cfat_` (a config lida mostra só as três regras legadas) nem se o GitHub tem `cfut_` como partner pattern.
- Estudo "Boundary-Mutation Testing for Pattern-Based Secret Detection" (arXiv 2609.02983, 2026) apareceu na busca mas não foi lido.

## 5. Análise estática JS/TS, dependências e gates mínimos para equipe pequena

### Takeaway
Para TypeScript, o gate de mercado é `tsc --noEmit` (type-check), não `no-undef` do ESLint — o typescript-eslint recomenda explicitamente **desligar** `no-undef` em TS. A esteira marca TS como "não medido" (WARNING); a calibração de maior retorno é rodar `tsc --noEmit` quando houver `tsconfig.json`, e somar varredura de dependências vulneráveis (ausente hoje).

### Cited Findings
- [FERRAMENTA] typescript-eslint: "We strongly recommend that you do not use the `no-undef` lint rule on TypeScript projects. The checks it provides are already provided by TypeScript without the need for configuration - TypeScript just does this significantly better." — [typescript-eslint FAQ](https://typescript-eslint.io/troubleshooting/faqs/eslint/)
- [PADRÃO/FERRAMENTA] OpenSSF Scorecard — checks e risco: Dangerous-Workflow (crítico), Webhooks (crítico); Binary-Artifacts, Branch-Protection, Code-Review, Dependency-Update-Tool, Maintained, Signed-Releases, Token-Permissions, **Vulnerabilities** (alto); Fuzzing, Packaging, Pinned-Dependencies, **SAST**, SBOM, Security-Policy (médio); CI-Tests, CII-Best-Practices, Contributors, **License** (baixo) — [OpenSSF Scorecard checks](https://github.com/ossf/scorecard/blob/main/docs/checks.md)

### Inferences
- **TS não medido = WARNING**: trocar por `npx tsc --noEmit -p <tsconfig>` → erros = FAIL (equivalente TS de `no-undef`/erro de sintaxe). Sem `tsconfig`, manter "NÃO MEDIDO". Em arquivos TS, desligar `no-undef` para não gerar FP (globais de tipo, `declare`).
- **ESLint `no-undef` = FAIL em JS** está ok, desde que o `env/globals` correto seja aplicado (browser, node, worker — Workers Cloudflare têm globais próprios como `caches`, `HTMLRewriter`; sem isso viram FP).
- **debugger/dupe-keys/unreachable = WARNING**: no `eslint:recommended` esses são "error"; `no-dupe-keys` em particular é bug real (a chave anterior é sobrescrita silenciosamente) → candidato a FAIL. *(classificação do eslint recommended não verificada nesta sessão)*
- **console.log / unused vars = info**: adequado.
- **Gates faltantes, por custo-benefício para dev solo**, mapeados aos checks do Scorecard: (1) Vulnerabilities — `npm audit --audit-level=high` ou `osv-scanner` no lockfile → high/critical = FAIL, moderate = WARNING; (2) lockfile presente e coerente com package.json (Pinned-Dependencies) → WARNING se ausente; (3) Binary-Artifacts — binários/zip/.exe versionados → WARNING; (4) License — LICENSE no repo público → INFO; e licenças de dependências incompatíveis (GPL/AGPL em projeto de cliente) → WARNING; (5) Dependency-Update-Tool (Dependabot/Renovate) → INFO; (6) `.env` versionado (ver §4) → FAIL.
- Itens do Scorecard que dependem de equipe (Code-Review, Branch-Protection, Contributors) não se aplicam a dev solo e não devem pesar na régua.

### Gaps
- Não consultei nesta sessão: documentação do `npm audit`/OSV-Scanner (flags, base de dados), OWASP ASVS (nível 1 como mínimo para apps web), Google Engineering Practices, e a lista exata de regras do `eslint:recommended` / `typescript-eslint` `recommended` vs `strict`. As recomendações acima sobre esses itens são inferência de prática comum, não citação.
- Nenhum estudo de precisão/recall de ESLint/tsc como "gate" foi buscado.
