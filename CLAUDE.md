# CLAUDE.md — esteira-qa

Esteira de QA universal do Pedro: instrumentos que **medem** uma peça (PDF, HTML,
par HTML×PDF, imagem, áudio/vídeo, planilha, web, código, sistema logado) e
**reprovam** o que está quebrado antes de ela chegar a uma pessoa. Ela reprova; não
aprova. Gosto, tom, timbre e adequação ao cliente seguem julgamento humano.

## Rodar e testar

Comandos conferidos em `package.json` e `README.md`:

```bash
npm test                      # = node testes/todos.mjs — roda todas as testes/*.test.mjs
npm run qa -- <peça>          # = node qa.mjs
node qa.mjs <peça|pasta|url> [outra ...] [--marca ryze] [--perfil tutorial] [--destino tela|impressao|grafica] [--json]
node qa.mjs <perfil-do-sistema>.json [--contas a,b]  # sistema logado (só leitura); perfis de cliente moram no repo do projeto
# mídia: --voz (NISQA) · --fala texto.txt · imagem: --tamanho-mm 150 · HTML como página: --web
```

- Saída do `qa.mjs`: `0` passou · `1` reprovado/ilegível · `3` incompleto.
- `npm test` só usa servidor local (127.0.0.1) e escreve em `fixtures/`: temporários
  ignorados (`fixtures/dom/_pdf/`, `fixtures/_tmp-cobertura/`, PDFs) e reescreve
  `fixtures/marca/*.html` (rastreados) — conferir `git status` depois.
- Fixtures se regeneram pelos geradores em `fixtures/gerar-*.mjs|py`.
- Não há CI. Instrumento só entra no `qa.mjs` depois de passar no `npm test`.
- `node qa.mjs <perfil>.json` e `ferramentas/sessao.mjs` **entram em produção logados**
  (senha do 1Password, o Pedro aprova o pedido do app na tela). Só rodar com pedido
  explícito do Pedro. `ferramentas/sessao.mjs` **não tem trava de escrita** (é a
  ferramenta do nível 2): cada passo é escrito à mão e lido antes de mandar.

## Onde está a arquitetura

- `README.md` — tabela de formatos × instrumento × estado, régua em camadas, estrutura.
- `claude/skills/qa/SKILL.md` — o método, como reportar, como estender.
- `LICOES.md` — o que custou caro, por formato, com a medição de cada lição.
- Cabeçalho de cada arquivo em `instrumentos/` — "por que existe", vereditos e o que
  **não** cobre (`nao_cobre` também está no `qa.mjs`).
- `regua/padrao.json` → `regua/marcas/*.json` → `regua/perfis/*.json` → `.qa.json` do projeto.
- `reports/Padrões de mercado para QA.md` + `research_notes/` — régua comparada com normas.
- `decisoes/regua-decisoes-2026-10-08.docx` — decisões e parâmetros da régua a decidir.
- Perfis de sistema logado de cliente (contas e telas) e os passos do nível 2 do Suíte X moram no repositório do projeto (`qa-empresa/suite-x-n2/`) desde 01/11/2026. Aqui fica só a fixture (`fixtures/sistema/`).

## Relação com a skill `qa`

`~/.claude/skills/qa` é **junction** para `claude/skills/qa/` deste repo. Editar a skill
é editar o repo (e vice-versa): mudança no `SKILL.md` entra no commit daqui.

## Regras (não negociáveis)

- **Nunca dar nota a peça não medida.** Opinião sem instrumento não vale. Formato sem
  instrumento sai **INCOMPLETO**, nunca "passou".
- Reportar em três estados, nunca misturados: **medido e passou** (com número) ·
  **medido e reprovou** (número, limite e procedência do limite) · **não medido** (e por quê).
  Relato de terceiro não é verificação.
- Limite `arbitrado?` nunca é apresentado como régua. O que a marca não documenta sai
  `? a confirmar` e vai ao Pedro como pergunta.
- Mídia: eu não tenho audição. "Vou escutar" não existe; o que substitui é transcrição
  reversa (`--fala`), LUFS/pico, freezedetect. Timbre é julgamento humano.
- Documento: medir no DOM (Playwright + `emulateMedia('print')`), não no PDF; HTML e
  PDF da mesma peça vão **juntos** (só o par pega PDF defasado).
- **Sistema logado é só leitura** (nível 1): trava de escrita desde o 1º carregamento,
  204 local para POST/PUT/PATCH/DELETE; nunca clicar sair/excluir/desativar nem COMANDO
  (salvar, enviar…). Nível 2 (escrita) só com OK do Pedro na hora. Botão de ação é
  sempre pelo nome EXATO.
- **GET de admin pode executar ação** (WordPress: link com `_wpnonce`, `admin-post`,
  `action=`). Nunca visitar barra de admin nem URL com token/nonce/action. A trava de
  `ctx.route` não cobre `ctx.request`.
- Achado de JS/visual tirado em headless precisa de reteste no Chrome real
  (`ferramentas/sessao.mjs --chrome`) antes de ir ao time.
- `saidas/` fica fora do git: prints podem ter dado real de cliente.

## Ao estender (ordem da skill, sem pular)

Ler antes as fontes do Sinapse sobre o formato (`~/Projetos/sinapse/07-FONTES/`) e o
`reports/`. Depois: fixture pelo mecanismo real → assinatura conferida sem o instrumento
→ instrumento acusa a fixture e poupa o bom → mutação → variância (hash **e** tamanho)
→ calibração em peça real aprovada → veredito no cabeçalho do instrumento e no `LICOES.md`.

## Armadilhas já documentadas

- Git Bash: Python escreve em cp1252 (o núcleo força `PYTHONIOENCODING=utf-8`).
- **Patch com regex vai por arquivo (Write/Edit), nunca `node -e` inline no Bash**:
  a contrabarra some sem erro e gera código válido e errado.
- Chrome: `--print-to-pdf` com caminho relativo grava em outra pasta; fonte variável
  do Google (`css2`) sai Type3; conteúdo mais largo que a folha reduz a escala de tudo.
- Sonda CDP altera o medido: fotografar console e rede antes.
- `op` (1Password) não falha, **espera** ~60 s: sempre com `timeout`, todas as
  credenciais buscadas antes de abrir o navegador; `whoami` não dispara o pedido do app,
  `vault list` sim. Ver `nucleo/credencial.mjs`.
- `PLAYWRIGHT_BROWSERS_PATH` = `%LOCALAPPDATA%\ms-playwright` (os instrumentos já setam).
- O relógio desta máquina já mentiu 44 s: "o servidor está X" exige referência externa.

## Segredos

- Nunca copiar senha, token ou credencial para código, fixture, `CLAUDE.md` ou commit.
  Credencial vive no 1Password (sessão do app) e fica só em memória.
- Fixture com cara de segredo: `fixtures/codigo/credencial-de-exemplo.mjs` (gerada por
  `fixtures/gerar-codigo.mjs`) usa a chave AWS **de exemplo da documentação**, de
  propósito; `instrumentos/codigo.mjs` contém as regex do detector de segredos; o teste
  em `testes/codigo.test.mjs` monta uma chave de formato real só em pasta temporária;
  `testes/sistema.test.mjs` usa credencial falsa de fixture.
  Se o gitleaks acusar, a allowlist fica em `C:\Users\olive\.gitleaks.toml` — não no repo.

## Git

- Commits em português, **sem** trailer `Co-Authored-By` e sem linha "Generated with
  Claude Code" (regra do Pedro, sobrepõe o default).
- Hook global: gitleaks em `C:\Users\olive\.git-hooks\pre-commit` (via `core.hooksPath`
  global), que encadeia o hook local do repo. **Nunca usar `--no-verify`.**
- Remoto `origin` = `github.com/pethrus07/esteira-qa` (privado), branch `main`.
