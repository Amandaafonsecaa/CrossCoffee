# A Gazeta do Dia

Site (e depois app de celular e jogo na Steam) que imita um **jornal de época folheável**, com **palavra cruzada e sudoku como atração principal**. O visual é jornal antigo (sépia, tipografia clássica, papel com textura) e a abertura é uma cena animada em primeira pessoa numa varanda.

O dono do projeto fala português do Brasil. **Toda a interface e a conversa são em pt-BR.** A ideia completa está em `docs/CONCEITO.md`.

## Estado atual (protótipo v0.2)

Pronto e testado em Chromium com tela de celular (390×844):

- **Cena da varanda** (`js/cutscene.js`): SVG em camadas + Web Animations API. Varanda branca e azul, rua americana de manhã, jornaleiro de bicicleta, jornal arremessado nos pés, mãos pegam, o mundo perde a cor (sépia), o jornal vira a capa. Dura cerca de 10 s, tem botão **Pular**. Toca só na **primeira visita** (flag `localStorage["gazeta:cutscene"]`) e na capa há o botão **"Reviver a entrega"**.
- **Abertura curta** (`js/crumple.js` + `js/print.js`): nas demais visitas, uma **bola de jornal amassada em 3D (Three.js)** se abre até cobrir a tela (~3,4 s; ~1,6 s na mesma sessão). A textura da bola é uma "foto" das páginas reais feita por `GazetaPrint.rasterize()` (lê posição de cada palavra, borda e fundo do DOM), então a troca 3D → página não pula. Sem WebGL ou com movimento reduzido: entra direto.
- **Jornal em tela cheia**: celular = uma página; computador (≥ 900 px e paisagem, classe `html.spread`) = duas páginas abertas, a da direita vira sobre a lombada. Capa no estilo de jornal antigo (orelhas, faixa de data, manchete de faixa, foto em retícula desenhada em canvas, colunas finas, anúncio). Página 4: Classificados.
- **Mãos do leitor e virada física** (`js/reader3d.js`): mãos 3D low-poly com esqueleto (punho, 3 falanges por dedo, polegar), geradas em código, 1 SkinnedMesh por mão (~1.200 triângulos cada; 5 draw calls no total, com o oclusor e as sombras de contato). Seguram os cantos de baixo (dedos na frente, polegar atrás). Ao folhear: soltar → alcançar → pinçar → puxar (a folha é uma malha que curva, com a "foto" da página na frente e no verso) → soltar → voltar. Computador: mão direita vira para a frente e a esquerda para trás; celular: a direita joga a folha para fora pela esquerda e a esquerda traz a anterior de volta. Só desenha quando algo se mexe. Movimento reduzido: troca simples por opacidade. Sem WebGL: cai na virada antiga em CSS. Teste em câmera lenta com `#debug` e `window.__readerTimeScale = 0.2`.
- **Jornal com margem estreita** (`#book` em `css/style.css`): o fundo escuro aparece nas bordas, para os cantos de baixo (e as mãos) ficarem visíveis. A barra de páginas fica na margem de baixo.
- **Folhear** (`js/main.js`): virar página 3D (Web Animations API), por setas, abas, teclado ou deslizar o dedo.
- **Palavra cruzada nº 1** (`js/crossword.js`, `js/crossword-data.js`): grade 5×5, teclado do celular via `<input>` escondido, dicas, verificar, limpar, carimbo "Resolvido!".
- **Sudoku nº 1** (`js/sudoku.js`): 9×9, anotações a lápis, teclado numérico, dica, verificar, limpar, carimbo.
- Progresso dos dois jogos salvo em `localStorage` (`gazeta:cw-001`, `gazeta:sd-001`).

Sem build, sem backend, sem dependências. JavaScript sem módulos (IIFE, `var`) de propósito, para abrir direto por `file://`.

## Estrutura

```
index.html              marcação das páginas, cena, abertura
css/style.css           todo o visual (variáveis no :root)
js/main.js              abertura, ligação da cena, modo 1/2 páginas, virar páginas, abas, gestos, mãos
js/crumple.js           abertura 3D: bola de papel que se abre (Three.js, build UMD em vendor/)
js/reader3d.js          mãos 3D articuladas + folha que vira (Three.js); poses em POSES, repouso em REST
js/print.js             foto em retícula (halftone) e "fotografia" do DOM num canvas (textura do 3D)
js/cutscene.js          cena da varanda (arte em SVG gerada no código + linha do tempo)
js/crossword.js         lógica da cruzada
js/crossword-data.js    grade e dicas da cruzada (troque aqui para criar outra)
js/sudoku.js            lógica do sudoku (PUZZLE e SOLUTION no topo)
scripts/vendor.mjs      copia GSAP, Three.js e fontes de node_modules para vendor/, fonts/ e gera css/fonts.css
docs/CONCEITO.md        a visão do projeto nas palavras do dono
```

## Como rodar

```
npm start            # python3 -m http.server 8000  → http://localhost:8000
```
Ou abra `index.html` direto. Para ver a cena de novo: limpe `localStorage` (ou use o botão "Reviver a entrega").

## Convenções

- UI em pt-BR. Palavras cruzadas **sem acento** (padrão do gênero), maiúsculas.
- Cores e fontes só pelas variáveis do `:root` em `css/style.css`. Paleta: papel `#e7d7ac`, tinta `#2a1f15`, carimbo `#8a2f1d`, azul da varanda `#3f6aa8`.
- Fontes (locais, em `fonts/`): UnifrakturCook (título gótico), Playfair Display (manchetes), Old Standard TT (texto impresso do jornal), Libre Baskerville (interface).
- `vendor/` e `fonts/` saem de `npm install && npm run vendor`. Three.js fixado em 0.160 (último com `build/three.min.js`; para atualizar, migrar para módulos/Vite).
- Toda animação da cena passa pela função `A()` em `js/cutscene.js`. É o ponto único para trocar por GSAP.
- Respeitar `prefers-reduced-motion` (hoje: sem cena, abertura instantânea).
- Mobile primeiro: o "livro" tem no máximo 600 px de largura, centralizado. Teste sempre em 390×844.
- Não commitar sem o dono pedir. O repositório git **ainda não foi iniciado**.

## O que NÃO deu para fazer no celular/nuvem (pendências para o notebook)

Este protótipo foi feito num ambiente na nuvem **sem acesso ao npm e a CDNs** (só a um proxy restrito). Por isso, ficou pendente tudo o que depende de baixar pacotes ou de aparelhos reais. Em ordem sugerida:

1. **Instalar dependências e fontes locais**
   - ✅ Feito no notebook (nov/2026): `npm install`, `npm run vendor`, fontes locais no `index.html`.
2. **Migrar as animações para GSAP**
   - `js/cutscene.js`: reescrever `A()` (e `at()`) com `gsap.timeline()`. As frases de tempo (`t`, `d`) já são em segundos. Atenção: loops com `iterations: Infinity` viram `repeat: -1, yoyo: true`.
   - A abertura agora é 3D (`js/crumple.js`); o laço `frame` pode virar `gsap.to` num proxy `{p}` se quiser easing do GSAP.
   - Virar página (`goTo`) já usa Web Animations API; pode ficar ou ir para GSAP (Flip/ScrollTrigger não são necessários).
3. **Testar em aparelhos reais** (nada disso foi testado fora do Chromium simulado):
   - iPhone/Safari: desempenho do WebGL da abertura, container queries (`cqi`), `clip-path`, `inert`.
   - Android/Chrome: teclado virtual da palavra cruzada (o `<input>` escondido usa o truque do `_` sentinela para detectar Backspace).
   - Desempenho da cena (SVG animado + `filter` CSS no `<svg>` inteiro). Se travar, reduzir o filtro para só a fase final.
   - Notch/safe-area e orientação paisagem.
4. **Arte final da cena**: hoje a arte é desenhada em código (`sceneSVG()`), no estilo simples. Quando houver ilustração de verdade, exportar as camadas como SVG (fundo, casas, varanda, bicicleta, mãos, jornal) e carregar no lugar, mantendo os mesmos `id` (`#bike`, `#flyPaper`, `#handL`, `#handR`, `#held`, `#cs-tilt`, `#cs-sway`). Com servidor de desenvolvimento dá para usar `fetch`; por `file://` não.
5. **Som** (opcional, com botão de mudo): Howler.js; sons de bicicleta, jornal caindo, papel amassando, virar página.
6. **Conteúdo**: mais puzzles (arquivos JSON por dia), gerador de sudoku, tirinha e horóscopo (já pensados), edição diária.
7. **Empacotar**:
   - Celular: Capacitor (`@capacitor/core`, `@capacitor/cli`, plataformas iOS e Android). Precisa de Xcode (macOS) e Android Studio.
   - Steam: Electron ou Tauri + `steamworks.js` (conquistas). Taxa e regras da Steam e das lojas: conferir valores atuais.
   - Considerar migrar para Vite (módulos ES) ao empacotar; quebrar os IIFEs em módulos.
8. **PWA** (opcional): `manifest.webmanifest`, ícones, service worker para jogar offline.
9. **Git**: `git init`, primeiro commit, repositório remoto.
10. **Qualidade**: acessibilidade da cena (legenda ou alternativa para quem pula), contraste, leitores de tela na grade, testes automatizados (Playwright já serviu para os testes manuais).

## Notas técnicas que economizam tempo

- Animações encadeadas na mesma propriedade (ex.: `transform` das mãos) usam `fill: "forwards"` nas seguintes. Com `fill: "both"`, o preenchimento "para trás" da animação seguinte sobrescreve a anterior.
- `transform-origin` em elementos SVG com valores em `px` usa o sistema de coordenadas local do elemento. Assim giram corretamente as rodas, pernas e o braço do jornaleiro.
- A cena usa `viewBox="0 0 400 800"` com `preserveAspectRatio="xMidYMid slice"`. Mantenha o que importa entre `y=120` e `y=720`.
- Linha do tempo da cena (segundos): fade-in 0–1; bicicleta 1,2–4,9; arremesso 3,45; jornal pousa ≈4,8; câmera olha para baixo 5–6; mãos 5,55–7,3; cor vira sépia 6,3–8,2; capa cresce 7,3–8,6; fim 9,5.
- `crossword.js` calcula a numeração e as palavras a partir da grade (`#` = casa preta). O CSS da grade (`.cw-grid`) está fixo em 5 colunas; para outro tamanho, ajuste `grid-template-columns`.
- Chrome/Playwright servem para testar: simule 390×844 com `isMobile` e `hasTouch`.
