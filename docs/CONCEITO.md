# Conceito — A Gazeta do Dia

Resumo das ideias do dono do projeto, para quem for continuar o trabalho.

## A ideia

Um site que imita **literalmente um jornal**, que a pessoa **folheia**. A estrela principal são os **jogos que existem nele**: palavra cruzada e sudoku (talvez também horóscopo, tirinha). A experiência deve ser **animada, criativa e bonita**, não um site de puzzles comum.

Plataformas planejadas: **site, aplicativo de celular e Steam**, a partir de um único código.

## Abertura (dois começos)

1. **Tela de carregamento = o jornal se desdobrando.** Ele começa amassado e vai desamassando enquanto o site carrega. Curto e útil. Aparece nas visitas seguintes.
2. **Cena em primeira pessoa (cutscene).** A pessoa está na **varanda, se balançando**. O **jornaleiro passa de bicicleta**, "bem filme mesmo", e **joga o jornal nos pés** do personagem. Ele pega o jornal e a história começa. O mundo começa **colorido**; quando ele pega o jornal, **o mundo vai ficando da cor do jornal** (sépia), e o jornal vira a primeira página do site.

Preocupação do dono: a cena pode ser "demais" ou cansativa. Decisões já tomadas para isso:

- **Botão de pular**, visível desde o primeiro segundo.
- A cena só toca na **primeira visita**; depois fica disponível como **"Reviver a entrega"**.
- Duração curta (~10 s).

## Visual

- **Jornal antigo**: sépia, papel com textura e grão, tipografia clássica, manchetes em caixa-alta, colunas, filetes duplos.
- **Cena**: vibe de **rua americana**, casas aconchegantes, vizinhança com grama e arborizada. **Varanda com detalhes brancos e azuis**. **Céu de manhã**. O jornaleiro de bike joga o jornal nos pés do personagem principal.
- Detalhes desejados: sombra de papel, mãos de leitor, som de folha (opcional, com mudo fácil).

## Folhear

Virar página com efeito de dobra. Cada página é uma seção: capa com manchetes, palavra cruzada, sudoku, depois talvez horóscopo e tirinha.

## Tecnologia (decidida)

- Front: HTML + CSS + SVG + JavaScript. **GSAP** para animação (pendente de instalar; hoje em Web Animations API).
- **Three.js só na abertura** (decisão de nov/2026): a bola de jornal amassada que se abre precisa de 3D de verdade. O resto continua 2D (a cena da varanda é parallax em SVG). Sem React: as animações vêm de Three.js/GSAP, não do framework.
- **Sem back-end** na primeira versão (progresso em `localStorage`). Back só se houver puzzles novos por servidor, login, ranking.
- Celular: Capacitor. Steam: Electron ou Tauri.

## Referências encontradas (buscas, nem todas abertas e avaliadas)

- **Puzzmo** (Zach Gage e Orta Therox): página de jogos estruturada como página de revista. A referência mais próxima em espírito.
- **The Daily Baffle**, **The Daily Spell** (itch.io), **Pencil and Paper** (Steam): jogos diários com estética de jornal.
- Seções de jogos de jornais: News Tribune, Telegraph Puzzles, plataformas PuzzleMe (Amuse Labs).
- Nenhum encontrado reunia: jornal de época folheável + cena de varanda + jogos como estrela. O dono acredita que a combinação é original.

## Prioridade sugerida

Primeiro a menor fatia que mostre a alma da ideia (abertura, uma cruzada jogável, visual sépia), lançar no site e testar com gente de verdade, depois cena, sudoku e demais plataformas. (Fatia e cena já existem no protótipo v0.2.)
