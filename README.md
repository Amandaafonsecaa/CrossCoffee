# A Gazeta do Dia — protótipo v0.2

Jornal de época folheável com palavra cruzada e sudoku jogáveis. HTML + CSS + JavaScript puro, sem build e sem backend.

Para quem vai continuar o desenvolvimento (incluindo o Claude): leia o **`CLAUDE.md`**. Ele tem o estado atual, a estrutura e a lista do que ficou pendente.

## Como abrir

- Mais simples: dois cliques em `index.html`.
- Ou: `npm start` (ou `python3 -m http.server 8000`) e abra http://localhost:8000
- No celular: rode o servidor e abra `http://<IP-do-seu-Mac>:8000` (mesmo Wi-Fi).

As fontes vêm do Google Fonts. Sem internet, o site usa Georgia e continua funcionando.

## O que tem

- **Cena da varanda** na primeira visita (bike do jornaleiro, jornal nos pés, mundo virando sépia), com botão **Pular**. Depois, na capa: **"Reviver a entrega do jornal"**.
- **Abertura curta**: jornal amassado se desdobrando, nas visitas seguintes.
- **Folhear**: virar página em 3D, por setas, abas, teclado ou deslizar o dedo.
- **Palavra cruzada nº 1** e **Sudoku nº 1** jogáveis, com dicas, verificar, limpar, carimbo de vitória e progresso salvo.

## Estrutura

```
index.html · css/style.css
js/main.js · js/cutscene.js · js/crossword.js · js/crossword-data.js · js/sudoku.js
scripts/vendor.mjs   (instala GSAP e fontes locais depois do npm install)
docs/CONCEITO.md · CLAUDE.md
```

## Observações

- As matérias da capa são texto de exemplo.
- Testado em Chromium simulando celular. Falta testar em iPhone e Android reais (veja `CLAUDE.md`).
