# A Gazeta do Dia

## 1. Visão geral

**A Gazeta do Dia** é um projeto de site interativo, com expansão futura para aplicativo de celular e jogo na Steam, que simula a experiência de ler um **jornal de época folheável**.

O usuário interage com um jornal antigo, visualmente inspirado em publicações impressas tradicionais, com papel envelhecido, tons sépia, tipografia clássica, fotografias em retícula e animações físicas.

O projeto combina três experiências:

1. **Leitura imersiva:** um jornal virtual que pode ser folheado, com mãos 3D e animações de páginas.
2. **Passatempos diários:** palavras-cruzadas e sudoku como atrações principais.
3. **Jornalismo assistido por IA:** notícias reais, obtidas por APIs e processadas por inteligência artificial utilizando técnicas de RAG.

O objetivo é criar uma experiência nostálgica, interativa e recorrente, incentivando o usuário a abrir uma nova edição todos os dias.

**Idiomas:** toda a interface, os textos, as pistas das palavras-cruzadas e a comunicação do projeto devem estar em português brasileiro (pt-BR).

A visão original está documentada em `docs/CONCEITO.md`.

---

## 2. Conceito visual e experiência do usuário

### Identidade visual

O projeto deve preservar a aparência de um jornal antigo:

- Papel envelhecido, em tons sépia.
- Textura sutil de papel impresso.
- Tipografia clássica e títulos expressivos.
- Fotografias com efeito de impressão em retícula (*halftone*).
- Divisão em colunas, manchetes e pequenos anúncios.
- Bordas, sombras e detalhes que transmitam a sensação de um jornal físico.
- Interface minimalista, evitando elementos modernos que prejudiquem a imersão.

### Interação

O leitor deve sentir que está segurando um jornal de verdade.

As mãos são representadas por modelos 3D estilizados em **low-poly**, em perspectiva de primeira pessoa.

Ao mudar de página, as mãos executam uma sequência natural de movimentos:

1. Soltar parcialmente o jornal.
2. Alcançar a borda da folha.
3. Pinçar o papel.
4. Puxar e virar a página.
5. Soltar a folha.
6. Retornar à posição inicial.

As animações precisam ser fluidas, discretas e compatíveis com dispositivos móveis.

---

## 3. Estrutura editorial

Cada edição contém quatro páginas principais.

| Página | Conteúdo | Atualização |
|---|---|---|
| 1 — Capa | Notícias reais, manchetes, imagem e textos jornalísticos | Diária |
| 2 — Palavras-cruzadas | Cruzadinha interativa em português brasileiro | Diária |
| 3 — Sudoku | Desafio lógico interativo | Diária |
| 4 — Classificados | Anúncios e conteúdos complementares de época | Inicialmente estáticos |

As páginas devem preservar a mesma identidade visual, independentemente da origem do conteúdo.

### Princípio editorial

**As notícias são reais; a apresentação é retrô.**

A inteligência artificial pode adaptar a linguagem e organizar a informação, mas não deve inventar acontecimentos, declarações, números, datas ou fontes.

Os conteúdos fictícios, como classificados humorísticos, devem ser identificados ou apresentados de modo que não sejam confundidos com notícias reais.

---

# 4. Sistema de edições diárias — PLANEJADO

Uma das funcionalidades centrais será a publicação automática de uma edição inédita todos os dias.

### Funcionamento esperado

- Cada edição terá uma data única.
- Uma nova edição será disponibilizada diariamente.
- Todos os usuários visualizarão o mesmo conteúdo editorial daquela data.
- A edição não será regenerada a cada atualização da página.
- Notícias, palavras-cruzadas e sudoku serão armazenados de forma persistente.
- Edições anteriores poderão ser consultadas futuramente.
- O progresso dos jogos será independente para cada edição.
- O sistema deverá funcionar mesmo quando uma API externa estiver indisponível.

### Identificação

Utilizar a data no formato `YYYY-MM-DD`.

O fuso horário editorial será `America/Fortaleza`.

Exemplo de identificação:

`gazeta:edition:2026-11-05`

A edição deverá ser gerada e validada antes da publicação, preferencialmente por uma tarefa agendada.

**A geração diária ainda não está implementada.**

---

# 5. Notícias reais com API + IA + RAG — PLANEJADO

## 5.1. Objetivo

Substituir o conteúdo jornalístico estático por notícias reais e recentes, organizadas automaticamente em uma edição diária.

O sistema deverá buscar notícias, selecionar as mais relevantes e produzir textos editoriais originais em português brasileiro, utilizando informações verificáveis.

## 5.2. Fonte de notícias

API inicialmente considerada:

**GNews API**

Documentação: https://docs.gnews.io/

A integração deverá priorizar:

- Notícias publicadas recentemente.
- Fontes identificáveis.
- Conteúdo em português.
- Notícias brasileiras quando apropriado.
- Categorias variadas.
- Metadados como título, data, veículo e URL.

Pesquisar e validar os limites, os custos e as permissões de uso antes de disponibilizar a funcionalidade em produção.

A arquitetura não deve ficar permanentemente dependente de um único fornecedor.

## 5.3. Pipeline de notícias

Fluxo planejado:

**API de notícias → filtragem → recuperação de fontes → IA/RAG → validação → edição diária**

### Etapa 1 — Coleta

Buscar um conjunto de notícias recentes utilizando a API.

Armazenar os metadados e os conteúdos que a licença permitir.

### Etapa 2 — Seleção

Selecionar notícias considerando:

- Relevância.
- Atualidade.
- Diversidade de assuntos.
- Credibilidade e identificação das fontes.
- Duplicação de acontecimentos.
- Quantidade de informação disponível.

### Etapa 3 — Recuperação de informações (RAG)

A inteligência artificial receberá os conteúdos efetivamente recuperados das fontes selecionadas.

O sistema poderá utilizar recuperação tradicional, banco de dados ou busca vetorial, conforme a necessidade real.

**Um banco vetorial não é obrigatório na primeira versão.**

Não utilizar conhecimentos internos do modelo como substitutos de evidências sobre acontecimentos recentes.

### Etapa 4 — Produção editorial com IA

A IA será responsável por:

- Criar títulos jornalísticos originais e fiéis aos fatos.
- Resumir as informações.
- Organizar as notícias em textos apropriados para as colunas.
- Padronizar a linguagem em pt-BR.
- Ajustar o tamanho dos textos à diagramação.
- Preservar a identidade editorial do jornal.

### Etapa 5 — Validação

Antes da publicação, verificar:

- Se os fatos estão presentes nas fontes recuperadas.
- Se datas, nomes e números estão corretos.
- Se não foram inventadas citações.
- Se existem referências para as informações publicadas.
- Se os textos não reproduzem indevidamente materiais protegidos.
- Se a edição contém conteúdo suficiente e legível.

Conteúdos que não puderem ser sustentados pelas fontes devem ser descartados ou encaminhados para revisão.

### Etapa 6 — Publicação

Após a validação, salvar uma versão estável da edição.

A edição deverá apresentar referências às fontes originais, respeitando os direitos e as condições de uso dos fornecedores.

## 5.4. Requisitos de segurança e arquitetura

- Não expor chaves de API no frontend.
- Não chamar modelos de IA diretamente do navegador utilizando credenciais privadas.
- Executar tarefas de geração em um ambiente seguro.
- Utilizar cache e armazenamento persistente.
- Definir limites de consumo e custos.
- Registrar erros de geração.
- Manter uma última edição válida como alternativa em caso de falha.

Como o protótipo atual é inteiramente estático, a integração exigirá uma camada adicional de serviços ou um processo externo de geração que produza arquivos estáticos validados.

**Não introduzir um backend complexo antes de avaliar a alternativa mais simples.**

---

# 6. Palavras-cruzadas diárias via API — PLANEJADO

## 6.1. Objetivo

Disponibilizar uma palavra-cruzada diferente em cada edição.

Todas as pistas e respostas devem ser adequadas ao português brasileiro.

## 6.2. API considerada

**Crossword Generator API**

Site: https://crossword.texs.org/pt-BR

Documentação: https://crossword.texs.org/crossword-api

A API possui suporte ao português, incluindo os identificadores `pt` e `pt-BR`.

Entretanto, suas bases de português podem ser compartilhadas entre variantes do idioma.

Por isso, o sistema deverá validar a adequação linguística das palavras e das pistas antes de publicar a cruzadinha.

Verificar também os limites do plano gratuito, as funcionalidades disponíveis, as condições de atribuição e os custos de uso automatizado.

## 6.3. Regras linguísticas

- Idioma principal: português brasileiro.
- Respostas em letras maiúsculas.
- Respostas sem acentos, conforme a convenção atual.
- Evitar vocabulário exclusivo de Portugal.
- Evitar palavras inexistentes ou obscuras sem necessidade.
- As pistas precisam corresponder exatamente às respostas.
- Evitar ambiguidades que permitam diversas respostas igualmente válidas.

Exemplo:

**Pista:** Bebida preparada com grãos torrados.

**Resposta:** CAFE

## 6.4. Geração e validação

A API será responsável pela montagem ou pelo preenchimento da grade, conforme as funcionalidades e condições disponíveis.

A aplicação deverá validar:

1. Dimensões da grade.
2. Integridade dos cruzamentos.
3. Numeração das pistas.
4. Correspondência entre pistas e respostas.
5. Normalização das palavras.
6. Ausência de palavras inválidas.
7. Compatibilidade com o componente interativo existente.

Caso a geração falhe, utilizar uma cruzadinha previamente validada.

Não publicar uma grade inválida apenas para cumprir a atualização diária.

## 6.5. Integração com notícias

Funcionalidade desejada:

Quando possível, utilizar algumas palavras relacionadas às notícias daquela edição.

Isso deve acontecer somente quando não comprometer a qualidade da grade ou das pistas.

## 6.6. Compatibilidade com o projeto atual

O protótipo utiliza uma grade de 5×5.

A lógica existente em `frontend/js/crossword.js` calcula a numeração e as palavras a partir da grade.

A integração deverá preservar:

- Seleção de células.
- Digitação por teclado.
- Suporte ao teclado virtual no celular.
- Navegação entre respostas.
- Botões de dica, verificar e limpar.
- Carimbo de conclusão.
- Salvamento de progresso.

O CSS utiliza `.cw-grid` com cinco colunas fixas.

Se houver suporte a grades de outras dimensões, a configuração deve se tornar dinâmica.

Não alterar o formato da grade sem garantir a compatibilidade com os componentes existentes.

---

# 7. Sudoku diário — PLANEJADO

O sudoku também será renovado diariamente.

Inicialmente, a preferência é utilizar um algoritmo próprio, evitando dependência de APIs externas.

Requisitos:

- Grade 9×9.
- Solução válida.
- Solução única.
- Dificuldade controlada.
- Validação antes da publicação.
- Salvamento por edição.
- Preservação do sistema de anotações a lápis.
- Preservação das funções de dica, verificar e limpar.

O gerador deverá utilizar uma estratégia reproduzível e permitir testar automaticamente a validade dos desafios.

---

# 8. Estado atual — Protótipo v0.2

As funcionalidades abaixo já foram implementadas e testadas no Chromium, utilizando uma viewport móvel de 390×844.

## 8.1. Cena inicial da varanda

Arquivo: `frontend/js/cutscene.js`

Cena animada em primeira pessoa utilizando SVG em camadas e Web Animations API.

Elementos:

- Varanda branca e azul.
- Rua americana pela manhã.
- Jornaleiro de bicicleta.
- Jornal arremessado aos pés do leitor.
- Mãos que recolhem o jornal.
- Transição gradual das cores para sépia.
- Jornal transformando-se na capa.

Duração aproximada: 10 segundos.

Inclui botão **Pular**.

A cena é exibida apenas na primeira visita, utilizando:

`localStorage["gazeta:cutscene"]`

Na capa, existe o botão **Reviver a entrega**.

## 8.2. Abertura curta

Arquivos:

- `frontend/js/crumple.js`
- `frontend/js/print.js`

Nas visitas seguintes, uma bola de jornal amassada em 3D é aberta até preencher a tela.

Tecnologia: Three.js.

A textura é produzida a partir das páginas reais utilizando `GazetaPrint.rasterize()`.

Duração aproximada:

- 3,4 segundos normalmente.
- 1,6 segundo na mesma sessão.

Quando WebGL não está disponível, ou quando o usuário prefere movimento reduzido, o jornal aparece diretamente.

## 8.3. Jornal responsivo em tela cheia

O comportamento varia conforme o dispositivo:

**Celular:** uma página por vez.

**Computador:** duas páginas abertas quando a viewport possui pelo menos 900 px e está em orientação paisagem.

A classe utilizada é:

`html.spread`

A página direita vira sobre a lombada.

O jornal possui margens estreitas, deixando parte do fundo escuro visível.

## 8.4. Mãos low-poly e virada física

Arquivo: `frontend/js/reader3d.js`

Implementação atual:

- Mãos 3D low-poly.
- Estrutura articulada com esqueleto.
- Punho, três falanges por dedo e polegar.
- Um `SkinnedMesh` por mão.
- Aproximadamente 1.200 triângulos por mão.
- Cerca de cinco draw calls no conjunto.
- Sombras de contato e oclusão.

A animação executa movimentos de soltar, alcançar, pinçar, puxar, liberar e retornar.

No computador:

- Mão direita: avançar páginas.
- Mão esquerda: voltar páginas.

No celular:

- Mão direita: deslocar a página atual para a esquerda.
- Mão esquerda: recuperar a página anterior.

A folha utiliza uma malha com curvatura e texturas da frente e do verso.

A renderização ocorre somente quando necessária.

Fallbacks:

- Movimento reduzido: transição simples de opacidade.
- Sem WebGL: animação CSS anterior.

Ferramentas de depuração:

`#debug`

`window.__readerTimeScale = 0.2`

## 8.5. Navegação

Arquivo: `frontend/js/main.js`

Métodos disponíveis:

- Setas de navegação.
- Abas.
- Teclado.
- Gestos de deslizar.
- Virada de página animada.

## 8.6. Palavras-cruzadas nº 1

Arquivos:

- `frontend/js/crossword.js`
- `frontend/js/crossword-data.js`

Recursos:

- Grade 5×5.
- Pistas numeradas.
- Teclado virtual.
- Verificação de respostas.
- Dicas.
- Limpeza.
- Carimbo **Resolvido!**

Progresso salvo em:

`localStorage["gazeta:cw-001"]`

Esta é a cruzadinha estática da versão atual.

## 8.7. Sudoku nº 1

Arquivo: `frontend/js/sudoku.js`

Recursos:

- Grade 9×9.
- Anotações a lápis.
- Teclado numérico.
- Dicas.
- Verificação.
- Limpeza.
- Carimbo de conclusão.

Progresso salvo em:

`localStorage["gazeta:sd-001"]`

Este é o sudoku estático da versão atual.

---

# 9. Estrutura atual do projeto

```text
frontend/           ← única pasta servida ao navegador
  index.html
  css/
  js/
  fonts/
  vendor/
  editions/         ← edições públicas validadas (AAAA-MM-DD.json)
backend/            ← estrutura do gerador diário, ainda sem implementação
  README.md
  .env.example
  src/
    noticias/
    ia/
    cruzadinha/
    sudoku/
    validacao/
    publicacao/
  prompts/
  cache/
  tests/
scripts/
  vendor.mjs        ← copia dependências para frontend/
docs/
  CONCEITO.md
package.json        ← comandos e dependências do projeto
```

### Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `frontend/index.html` | Estrutura das páginas, cena e abertura |
| `frontend/css/style.css` | Identidade visual e layout |
| `frontend/js/main.js` | Navegação, abertura e integração |
| `frontend/js/crumple.js` | Bola de jornal 3D |
| `frontend/js/reader3d.js` | Mãos e virada física |
| `frontend/js/print.js` | Retícula e rasterização |
| `frontend/js/cutscene.js` | Cena animada da varanda |
| `frontend/js/crossword.js` | Mecânica das palavras-cruzadas |
| `frontend/js/crossword-data.js` | Dados da cruzadinha atual |
| `frontend/js/sudoku.js` | Mecânica e dados do sudoku |
| `scripts/vendor.mjs` | Dependências e fontes locais |
| `docs/CONCEITO.md` | Visão original do projeto |

---

# 10. Arquitetura técnica atual

O projeto ainda utiliza:

- HTML.
- CSS.
- JavaScript sem módulos.
- IIFE e `var` por decisão arquitetural.
- Three.js.
- Web Animations API.
- SVG.
- Canvas.
- `localStorage`.

Atualmente:

- O backend tem estrutura de pastas, mas o gerador ainda não foi implementado.
- Não existe sistema automático de edições.
- Não existem chamadas de notícias ou de IA.
- Não há integração com API de palavras-cruzadas.
- Não há build obrigatório.
- O projeto pode ser aberto via `file://`.

A introdução das funcionalidades diárias deverá ser feita de maneira incremental.

**O sistema deve preservar as animações e os componentes existentes.**

---

# 11. Arquitetura futura desejada

A aplicação será dividida conceitualmente em três camadas.

### Camada 1 — Experiência visual

Responsável por:

- Renderização do jornal.
- Animações.
- Navegação.
- Mãos 3D.
- Interação com os passatempos.
- Interface responsiva.

### Camada 2 — Conteúdo diário

Responsável por:

- Carregar a edição da data.
- Recuperar notícias e referências.
- Carregar palavras-cruzadas.
- Carregar sudoku.
- Recuperar edições anteriores.
- Exibir uma edição válida quando o conteúdo mais recente não estiver disponível.

### Camada 3 — Geração e publicação

Responsável por:

- Integração com GNews.
- Recuperação de fontes para RAG.
- Processamento por IA.
- Integração com Crossword Generator API.
- Geração de sudoku.
- Validação.
- Armazenamento.
- Publicação diária.

A camada de geração poderá funcionar separadamente do frontend.

O objetivo inicial é manter o site leve e minimizar os custos operacionais.

---

# 12. Persistência

A aplicação atual utiliza `localStorage`.

Com as edições diárias, será necessário diferenciar:

**Conteúdo editorial:** compartilhado por todos os leitores.

**Progresso:** individual para cada usuário e edição.

Exemplos de chaves locais:

```text
gazeta:progress:cw:2026-11-05
gazeta:progress:sd:2026-11-05
```

As edições publicadas deverão possuir uma identificação própria e armazenamento persistente.

Evitar substituir diretamente os dados estáticos existentes sem uma estratégia de migração.

---

# 13. Convenções

## Idioma

- Toda a interface em pt-BR.
- Notícias em pt-BR.
- Pistas de palavras-cruzadas em pt-BR.
- Respostas em maiúsculas e sem acentos.
- Datas no formato adequado ao Brasil.

## Identidade visual

As cores e fontes deverão utilizar as variáveis do `:root` em `frontend/css/style.css`.

Paleta atual:

- Papel: `#e7d7ac`
- Tinta: `#2a1f15`
- Carimbo: `#8a2f1d`
- Azul da varanda: `#3f6aa8`

Fontes locais:

- UnifrakturCook — título gótico.
- Playfair Display — manchetes.
- Old Standard TT — textos impressos.
- Libre Baskerville — interface.

## Animação e acessibilidade

- Respeitar `prefers-reduced-motion`.
- Preservar os fallbacks sem WebGL.
- Evitar animações desnecessárias durante a leitura.
- Manter boa legibilidade.
- Priorizar controles acessíveis por teclado e toque.

## Responsividade

- Desenvolvimento mobile-first.
- Testar sempre em 390×844.
- O livro tem largura máxima de 600 px no celular.
- Verificar dispositivos reais antes da publicação.

## Versionamento

- O repositório Git já foi iniciado.
- Não realizar commits sem autorização explícita do proprietário.

---

# 14. Como executar

Após instalar as dependências:

```bash
npm install
npm run vendor
npm start
```

O servidor local é iniciado com Python:

```bash
python3 -m http.server 8000 --directory frontend
```

Endereço:

http://localhost:8000

O protótipo estático também pode ser aberto diretamente pelo `frontend/index.html`.

As funcionalidades futuras que dependam de APIs, servidor ou geração automatizada poderão exigir execução por HTTP e configuração adicional.

---

# 15. Pendências e roadmap

## Fase 1 — Estabilização do protótipo

- [x] Instalar dependências.
- [x] Disponibilizar fontes locais.
- [x] Implementar abertura 3D.
- [x] Implementar mãos low-poly.
- [x] Implementar virada física de páginas.
- [x] Implementar primeira palavra-cruzada.
- [x] Implementar primeiro sudoku.
- [ ] Testar em iPhone/Safari.
- [ ] Testar em Android/Chrome.
- [ ] Melhorar a arte final da cena.
- [ ] Revisar acessibilidade.
- [ ] Avaliar migração das animações para GSAP.
- [ ] AAprofundar o soduko apenas na V2

## Fase 2 — Sistema de edições diárias

- [ ] Definir o formato de dados das edições.
- [ ] Implementar carregamento por data.
- [ ] Integrar GNews API.
- [ ] Implementar pipeline de IA com RAG.
- [ ] Validar as notícias antes da publicação.
- [ ] Integrar Crossword Generator API.
- [ ] Garantir cruzadinhas em pt-BR.
- [ ] Implementar validação automática das grades.
- [ ] Desenvolver gerador de sudoku.
- [ ] Implementar armazenamento persistente.
- [ ] Criar tarefa de publicação diária.
- [ ] Implementar fallback para falhas de APIs.
- [ ] Separar progresso dos jogos por edição.

## Fase 3 — Conteúdo e imersão

- [ ] Implementar arquivo de edições antigas.
- [ ] Adicionar tirinhas.
- [ ] Adicionar horóscopo.
- [ ] Adicionar efeitos sonoros opcionais.
- [ ] Criar botão de mudo.
- [ ] Melhorar as transições entre edições.
- [ ] Avaliar palavras-cruzadas temáticas conectadas às manchetes.

## Fase 4 — Distribuição

- [ ] Avaliar migração para módulos ES e Vite.
- [ ] Implementar PWA.
- [ ] Avaliar suporte offline.
- [ ] Empacotar para iOS e Android com Capacitor.
- [ ] Avaliar Electron ou Tauri para Steam.
- [ ] Pesquisar requisitos, custos e regras das lojas.
- [ ] Inicializar Git e configurar repositório remoto, com autorização.

## Fase 5 — Qualidade

- [ ] Criar testes automatizados para os jogos.
- [ ] Testar geração diária.
- [ ] Testar a unicidade das soluções de sudoku.
- [ ] Testar cruzadinhas com dados inválidos.
- [ ] Testar indisponibilidade das APIs.
- [ ] Testar o processo de recuperação de edições.
- [ ] Avaliar desempenho em dispositivos de entrada.
- [ ] Validar acessibilidade dos jogos e das animações.

---

# 16. Notas técnicas importantes

### Three.js

Versão fixada em `0.160`, última com `build/three.min.js`.

Uma atualização futura poderá exigir migração para módulos.

### Animações

As animações da cena são centralizadas em `A()` no arquivo `frontend/js/cutscene.js`.

Existe a possibilidade de migração para `gsap.timeline()`.

### Transformações SVG

O `transform-origin` em pixels utiliza o sistema de coordenadas local do elemento.

### Cena

`viewBox="0 0 400 800"`

`preserveAspectRatio="xMidYMid slice"`

Elementos importantes devem permanecer entre `y=120` e `y=720`.

### Linha do tempo da cena

- Fade-in: 0–1 s.
- Bicicleta: 1,2–4,9 s.
- Arremesso: 3,45 s.
- Jornal pousa: aproximadamente 4,8 s.
- Câmera olha para baixo: 5–6 s.
- Mãos: 5,55–7,3 s.
- Transição para sépia: 6,3–8,2 s.
- Capa cresce: 7,3–8,6 s.
- Encerramento: 9,5 s.

### Palavras-cruzadas

O caractere `#` representa casas pretas.

A classe `.cw-grid` utiliza atualmente cinco colunas.

Grades dinâmicas exigirão adaptação do CSS e validação de compatibilidade.

### Testes

Utilizar Chrome/Playwright com:

- Viewport 390×844.
- `isMobile`.
- `hasTouch`.

---

# 17. Princípios de desenvolvimento

1. Preservar a identidade visual e a experiência imersiva já construídas.
2. Não reescrever componentes funcionais sem necessidade.
3. Priorizar soluções simples, testáveis e sustentáveis.
4. Evitar dependências desnecessárias.
5. Manter o projeto preparado para web, mobile e desktop.
6. Garantir que notícias reais sejam baseadas em fontes verificáveis.
7. Validar todas as palavras-cruzadas antes da publicação.
8. Garantir sudoku com solução única.
9. Não expor credenciais ou segredos no navegador.
10. Manter edições diárias estáveis e recuperáveis.
11. Utilizar pt-BR em toda a experiência.
12. Não realizar commits sem autorização.

**Visão final:** transformar A Gazeta do Dia em um jornal digital vivo, no qual o leitor retorna diariamente para descobrir novas histórias, resolver desafios inéditos e desfrutar da experiência de folhear um jornal antigo.