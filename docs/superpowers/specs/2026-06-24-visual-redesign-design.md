# Redesign visual do "Fake It" — design

## Contexto

Protótipo HTML/CSS/JS vanilla (sem build step) de um jogo de impostor para grupo, jogado em um único celular passado de mão em mão. Três telas: Setup, Jogador (card com swipe-to-reveal) e Timer de discussão. Visual atual: tema escuro com acento vermelho neon usado tanto para marca quanto para o papel "IMPOSTOR".

## Objetivo

Dar ao jogo uma identidade visual clean e moderna (estilo app premium), trocando a base vermelho-neon por um sistema de design consistente com acento indigo/azul-elétrico, mantendo a lógica de jogo (`app.js`) intacta. O vermelho passa a ser usado **apenas** como sinalização semântica do papel "IMPOSTOR", não mais como cor de marca.

## Abordagem

Abordagem C (aprovada): sistema de tokens de design + refino dos componentes existentes, sem reescrever a estrutura/lógica do `app.js` nem o fluxo de telas do `index.html`. Mudanças concentradas em `style.css` e ajustes pontuais de markup (classes/atributos) em `index.html` quando necessário para suportar os novos componentes visuais (ex.: indicador de progresso, anel do timer).

## Sistema de design

**Cores (variáveis CSS em `:root`):**
- `--bg-start: #0a0a0f`, `--bg-end: #13131a` — gradiente de fundo da página.
- `--surface: #16161f` — fundo dos cards/painéis.
- `--surface-alt: #1c1c27` — fundo de elementos dentro do card (chips, inputs).
- `--text: #f4f4f6` — texto principal.
- `--text-muted: #9494a3` — texto secundário/hint.
- `--accent: #6366f1` — indigo, cor primária (botões, destaques, foco).
- `--accent-hover: #818cf8` — estado hover/active do acento.
- `--danger: #ef4444` — vermelho, reservado exclusivamente para o badge/label "IMPOSTOR" e o estado final do timer (últimos segundos).

**Tipografia:**
- Fonte Inter via `<link>` do Google Fonts no `<head>` de `index.html`, pesos 400/500/700/800.
- Fallback: `'Inter', system-ui, 'Segoe UI', Roboto, Arial, sans-serif` — se não houver internet, cai no fallback sem quebrar.
- Números do timer com `font-variant-numeric: tabular-nums`.

**Tokens de forma/elevação:**
- Raio: 12px em controles pequenos (botões, chips, inputs), 20px em cards/painéis.
- Sombra padrão: combinação de uma sombra de contato curta (`0 1px 2px rgba(0,0,0,.4)`) com uma sombra ambiente longa tingida de indigo em baixa opacidade (`0 8px 24px rgba(99,102,241,.12)`), substituindo as sombras vermelhas atuais.
- Transições: 150–200ms ease para hover/active; a transição do banner de revelação (swipe) é mantida como está hoje (240ms), não será alterada.

## Mudanças por tela

**Setup:**
- Jogadores listados como chips com círculo de iniciais (primeira letra do nome) à esquerda do nome.
- Steppers (impostores/duração) com visual "pill" (cápsula), botões `+`/`-` com fundo `--surface-alt` e acento indigo no hover.
- Categorias como tags clicáveis (já existentes via checkbox) com estado ativo em indigo em vez de vermelho.
- Botão "Iniciar Jogo" como botão primário sólido indigo.

**Jogador (card / swipe-reveal):**
- Fundo do card com gradiente radial sutil centrado no topo, usando `--surface` → `--bg-end`.
- Indicador textual de progresso "Jogador X de Y" acima do nome (novo elemento, não existente hoje), usando `players.length` e a posição atual dentro de `order`.
- Seta indicativa de "arraste pra revelar" estilizada com a cor `--text-muted` e leve animação de flutuação (`@keyframes`), substituindo o `::after` estático atual.
- Banner de revelação: papel "JOGADOR" usa `--accent` no label; papel "IMPOSTOR" usa `--danger` no label — única ocorrência de vermelho na UI fora do timer.

**Timer:**
- Número do timer em peso 800, tamanho mantido ou levemente maior, com `tabular-nums`.
- Anel de progresso circular sutil ao redor do número, implementado via `conic-gradient` em CSS puro (sem SVG), preenchendo com `--accent` e passando a `--danger` nos últimos 10% do tempo. Atualizado a cada tick do `setInterval` já existente em `startTimer()`.
- Botões secundários (Pausar, Reiniciar, Mostrar Impostor, Voltar ao Início) em estilo "ghost" (fundo transparente, borda 1px em `--surface-alt`, texto `--text`), com hover preenchendo levemente.

## Fora de escopo

- Não altera a lógica de sorteio de impostores/palavras, o `shuffledIndices`, nem os event listeners de pointer/touch já existentes (apenas o estilo dos elementos que eles manipulam).
- Não adiciona dependências de build (sem bundler, sem framework) — só um `<link>` externo para a fonte.
- Não muda o conteúdo de `palavras.js`.
- Indicador de progresso "Jogador X de Y" requer uma pequena leitura de estado (`currentIndex`, `players.length`) em `app.js` para popular o texto — é a única alteração de lógica prevista, estritamente para exibição.

## Testes

- Verificação manual no navegador (desktop) e no celular via servidor local (`python -m http.server`), cobrindo: gestos de swipe ainda funcionam, botão "Continuar" ainda avança jogador, timer ainda conta corretamente, categorias ainda filtram palavras.
- Sem testes automatizados no projeto atualmente; não serão introduzidos como parte deste redesign (fora de escopo).
