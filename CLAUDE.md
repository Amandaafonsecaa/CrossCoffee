# A Gazeta do Dia

## 1. Visão geral

**A Gazeta do Dia** é um site que simula a experiência de ler um **jornal de época folheável**, com notícias fictícias e passatempos novos todos os dias.

O usuário interage com um jornal antigo, com papel envelhecido, tons sépia, tipografia clássica, fotografias em retícula e animações físicas (mãos 3D que viram as páginas).

O projeto combina três experiências:

1. **Leitura imersiva:** jornal virtual folheável, com mãos 3D e páginas que se curvam.
2. **Passatempos diários:** palavras-cruzadas (atração principal) e sudoku.
3. **Universo fictício gerado por IA:** notícias absurdas, engraçadas e ingênuas de uma cidade brasileira dos anos 1940–50, com personagens recorrentes e histórias que continuam entre edições.

O objetivo é uma experiência nostálgica e recorrente, que faça o leitor voltar todos os dias. O projeto também é um **case de portfólio de engenharia de software e de IA** da proprietária, que está aprendendo enquanto constrói. Explique decisões técnicas em linguagem simples.

**Idioma:** toda a interface, os textos, as pistas e a comunicação com a proprietária em português brasileiro (pt-BR).

A visão original está em `docs/CONCEITO.md`. As decisões abaixo (seções 3 a 7, 11 e 15) foram tomadas em brainstorming em 05/11/2026 e substituem o plano anterior de notícias reais via GNews.

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

## 3. Estrutura editorial — DECIDIDO, A IMPLEMENTAR

Cada edição tem **quatro páginas**. No computador continuam duas páginas lado a lado (1+2, 3+4), como hoje; no celular, uma por vez.

| Página | Conteúdo | Gerado por |
|---|---|---|
| 1 — Capa | Notícias fictícias + **classificados no rodapé** | IA |
| 2 — Palavras-cruzadas | 9×9 de segunda a sábado; **13×13 aos domingos** | Gerador próprio + pistas por IA |
| 3 — Sudoku | 9×9, solução única | Algoritmo próprio (sem IA) |
| 4 — Horóscopo | 12 signos, previsões absurdas no tom da cidade | IA |

A página "Classificados" deixa de existir como página: os anúncios viram rodapé da capa (conteúdo que o leitor pode ignorar).

### Universo

- **Cidade brasileira fictícia, anos 1940–50.** Bonde, praça da Matriz, padaria, confeitaria, rádio de válvula.
- Os personagens já presentes no protótipo (Seu Anselmo da Rua das Flores, Dona Celeste da caligrafia, o bonde da linha 4, Café Bom Dia) são moradores oficiais da bíblia.
- A cena de abertura já se passa nessa cidade (seção 8.1).

### Princípio editorial

**Tudo é ficção, e isso deve ficar claro.** Humor **ingênuo, de época, para toda a família**:

- Sem pessoas reais, política, religião ou tragédias reais.
- Sem violência, palavrões ou duplo sentido.
- Sem estereótipos ofensivos (raça, gênero, região, classe).

### Continuidade

Cada edição é uma **mistura**: notícias soltas, personagens sozinhos ou juntos, e histórias (arcos) que continuam e evoluem por algumas edições. Ver seção 5.

---

## 4. Sistema de edições diárias — DECIDIDO, A IMPLEMENTAR

### Princípio

**Calendário fixo, não consumo por acesso.** Cada edição tem uma data. Todos os leitores veem a mesma edição naquele dia. Uma edição de um dia sem leitores não se perde: fica no arquivo de edições antigas. (O consumo por acesso foi descartado porque exigiria servidor com estado, banco e controle de concorrência só para economizar algo que custa zero.)

### Identificação

- Data `AAAA-MM-DD`, fuso editorial `America/Fortaleza`.
- Progresso local por edição: `gazeta:progress:cw:2026-11-05`, `gazeta:progress:sd:2026-11-05`.

### Ciclo de vida

```
Mac da proprietária (1x por mês)          GitHub (todo dia)                    Vercel
gerador → revisão de duvidosos →   estoque/ (criptografado) → Actions decifra   → site estático
estoque com até 45 edições         só a edição de hoje → frontend/editions/       publicado
```

1. **Geração mensal no Mac:** `npm run gerar` (nome provisório) completa o estoque até **45 edições**. As edições são geradas **em ordem**, porque cada uma lembra das anteriores.
2. **Revisão:** a proprietária vê uma página de prévia e decide só os itens marcados como duvidosos. Reprovar a edição N **regera de N em diante** (as seguintes podem ter herdado fatos dela).
3. **Estoque criptografado** em `estoque/`. O repositório é público, então as edições futuras ficam cifradas; a chave fica só nos *secrets* do GitHub e num gerenciador de senhas da proprietária.
4. **Publicação diária:** GitHub Actions roda às 00h05 de Fortaleza (e de novo às 00h35, porque o agendamento do GitHub pode atrasar), decifra **só a edição do dia** e a grava em `frontend/editions/`. A Vercel republica o site.
5. **Aviso de estoque baixo:** quando restarem **15 edições**, o Actions abre uma *issue* (aviso por e-mail, gratuito).

### Como o site escolhe a edição

1. Calcula a data de hoje em `America/Fortaleza`.
2. Tenta carregar `editions/AAAA-MM-DD.json`.
3. Se não existir: carrega a mais recente publicada, com selo **"Edição extra"**.
4. Se nada carregar (ex.: aberto via `file://`): usa a **Edição nº 0** embutida (o conteúdo atual do protótipo). O site nunca fica em branco.

### Contrato da edição (formato `versao: 1`, rascunho)

```json
{
  "versao": 1,
  "data": "2026-11-05",
  "numero": 12,
  "capa": { "manchete": "...", "materias": [], "classificados": [] },
  "cruzada": { "tamanho": 9, "grade": [], "pistas": { "horizontais": {}, "verticais": {} } },
  "sudoku": { "desafio": "81 dígitos", "solucao": "81 dígitos" },
  "horoscopo": [{ "signo": "Áries", "texto": "..." }],
  "geracao": { "modelo": "...", "notas": {} }
}
```

O gerador valida o contrato com Zod antes de gravar; o frontend só lê. Mudanças no contrato exigem aumentar `versao`.

---

## 5. IA, memória narrativa e RAG — DECIDIDO, A IMPLEMENTAR

### Onde roda

**Localmente, no Mac da proprietária (Apple M4, 16 GB), via Ollama**, com modelo de licença aberta (preferir Apache 2.0, ex.: Qwen; os termos do Gemma são mais restritivos). Nada de IA no navegador nem na nuvem.

- Motivo: custo zero garantido, sem cota, sem fornecedor. Os créditos gratuitos do Hugging Face foram reduzidos ou removidos (out/2026), então **não há plano B gratuito na nuvem**; o plano B é outro modelo local.
- A conexão com o Ollama é feita com `fetch` direto (sem SDK) e **será escrita à mão pela proprietária, em par com o Claude**. Não implementar `gerador/src/ia/` sozinho.
- O modelo é escolhido por **benchmark**: 2–3 modelos, mesmas pautas, notas da juíza e da proprietária. Medir também o tempo por edição.

### Memória (arquivos JSON em `gerador/dados/`, sem banco)

1. **Bíblia:** cidade, época, personagens-base, regras de humor. Fixa, aprovada pela proprietária.
2. **Fichas vivas:** após cada notícia, a IA extrai fatos estruturados (`{ personagem, fato, edicao }`).
3. **Arcos:** histórias em andamento, com capítulo atual, próximo passo e **fim obrigatório em poucas edições**.

### Pipeline de uma edição

```
bíblia + fichas + arcos
        ▼
1. PAUTA (mistura sorteada: continuação de arco, personagem solo, encontro, notícia nova)
2. ANTIRREPETIÇÃO (embeddings × notícias já publicadas)
3. RECUPERAÇÃO (RAG): fichas/arcos por nome + fatos de tema parecido por embeddings
4. REDAÇÃO (saída estruturada em JSON, limites de tamanho da diagramação)
5. VERIFICAÇÃO
   - código: contrato, tamanhos, ortografia (dicionário VERO)
   - regras fixas: termos proibidos
   - IA juíza: rubrica 1–5 (graça, tom familiar, coerência com a cidade, CONTRADIÇÃO com fatos recuperados)
6. DECISÃO: aprovada | reescrever (até 2 tentativas) | duvidosa → revisão humana
7. EXTRAÇÃO de fatos novos → fichas/arcos
```

### Embeddings e vetores

- Modelo de embeddings local via Ollama.
- Usos reais: antirrepetição e busca de fatos por tema. Busca por personagem/arco é por nome (exata).
- **Sem banco vetorial:** vetores em arquivo; comparação direta leva milissegundos até centenas de milhares de itens.

### Avaliação (o que torna o projeto relevante como engenharia de IA)

- **Calibração da juíza:** a proprietária avalia 30–50 matérias à mão (`gerador/avaliacao/`); medir a concordância juíza × humana.
- **Experimento de memória:** gerar com e sem recuperação e comparar a taxa de contradições.
- **Pistas:** taxa de pistas que passam no teste do solucionador (seção 6).
- Resultados registrados em `gerador/avaliacao/` e resumidos em `docs/decisoes/`.

---

## 6. Palavras-cruzadas diárias — DECIDIDO, A IMPLEMENTAR

**Gerador próprio, sem API.** A Crossword Generator API (crossword.texs.org) foi avaliada e descartada: o plano gratuito tem 30 grades/mês (sem folga para falhas), pistas por IA só nos planos pagos, banco de pistas sem garantia de pt-BR, link de atribuição obrigatório e é um projeto de hobby de uma pessoa.

### Peças (em `gerador/src/cruzadinha/`)

1. **Lista de palavras:** dicionário **VERO** (hunspell pt-BR do LibreOffice, LGPL/MPL; manter o arquivo de licença). Filtrar uma vez: sem acentos, maiúsculas, tamanhos úteis, remover palavras raras (com ajuda da IA local). As palavras vêm do dicionário, **nunca são inventadas pela IA**.
2. **Moldes:** grades simétricas com bastante casa preta, no estilo dos jornais brasileiros antigos (facilita o preenchimento).
3. **Preenchimento:** *backtracking* com heurística de "espaço mais restrito primeiro" e índice de palavras por padrão. Código próprio, sem dependências.
4. **Pistas:** escritas pela IA local, no tom da cidade; quando possível, usar palavras das notícias do dia.
5. **Verificação:**
   - código: dimensões, cruzamentos, numeração, palavras na lista, sem repetição, compatibilidade com `frontend/js/crossword.js`;
   - **teste do solucionador:** a IA recebe só a pista e tenta adivinhar a resposta; se errar, a pista é reescrita ou marcada como duvidosa.

### Regras linguísticas

- Português brasileiro; evitar vocabulário exclusivo de Portugal e palavras obscuras.
- Respostas em maiúsculas, sem acentos.
- Pistas correspondem exatamente às respostas, sem ambiguidade.

Se 13×13 se mostrar difícil demais de preencher com qualidade, o domingo também fica em 9×9 até o gerador melhorar. Nunca publicar uma grade inválida.

### Frontend

`frontend/js/crossword.js` passa a aceitar tamanho variável (hoje `.cw-grid` tem 5 colunas fixas; usar variável CSS). Preservar seleção de células, teclado físico e virtual, navegação entre respostas, dica/verificar/limpar, carimbo e salvamento de progresso.

---

## 7. Sudoku diário — DECIDIDO, A IMPLEMENTAR

- Gerador próprio em `gerador/src/sudoku/`, sem IA e sem API.
- Grade 9×9, solução válida e **única** (provada pelo solver), reproduzível por semente.
- V1: só nível fácil. **Níveis de dificuldade ficam para a V2.**
- Preservar anotações a lápis, dica, verificar e limpar.

---

## 8. Estado atual — Protótipo v0.2

As funcionalidades abaixo já foram implementadas e testadas no Chromium, utilizando uma viewport móvel de 390×844.

## 8.1. Cena inicial da varanda

Arquivos: `frontend/js/cutscene3d.js` (cena 3D) e `frontend/js/cutscene.js` (fluxo, botão Pular, título final e plano B em SVG).

Uma versão em vídeo foi testada em 06/11/2026 e descartada a pedido da proprietária: a cena roda ao vivo.

Cena em primeira pessoa, **3D low-poly** (Three.js), no mesmo estilo das mãos: facetas, cor por vértice com leve variação, sol baixo da manhã com sombras longas. Ocupa a tela inteira em qualquer proporção (referência 1920×1080; no celular em pé a câmera abre o ângulo e acompanha a bicicleta).

Cenário brasileiro, anos 1940–50 (sem referências à Copa ou a eventos reais):

- Varanda com ladrilho hidráulico, gradil de ferro com escadinha no meio, colunas, lambrequim, samambaia pendurada, espada-de-são-jorge, mesinha com cafezinho; pernas do leitor e braços da cadeira de balanço.
- Rua de paralelepípedo, calçada de pedra portuguesa em ondas, poste colonial, fiação.
- Casario geminado colorido (platibandas, venezianas, sobrados com beiral), muro com gol de giz, bola de capotão, padaria com toldo, pombos, mangueira, ipê-amarelo, palmeiras, torre da Igreja Matriz e morros ao fundo.
- O bonde da linha 4 (placa "4 · MATRIZ") passa no início.
- Vira-lata caramelo deitado na calçada: acompanha com a cabeça o bonde, a bicicleta e o jornal; abana o rabo; põe a língua para fora.
- Jornaleiro de boina e bigode numa bicicleta com cesta; pedala (IK), pega o jornal na cesta, arremessa, olha para o leitor e cumprimenta com a boina.
- O jornal é uma folha 3D que enrola e desenrola, com a **capa real** "fotografada" (`GazetaPrint.rasterize`, via `getPaper` em `main.js`).
- As mãos são as mesmas de `reader3d.js` (`GazetaReader._Hand`), com mangas estendidas.
- Ao abrir o jornal, o mundo vira tom de jornal **a partir do papel**, numa onda (shader injetado em todos os materiais).

Duração: ~10 s, mesma linha do tempo da versão anterior (seção 16). Botão **Pular** e Esc/Enter/Espaço.

Plano B: sem WebGL, a cena SVG antiga (quadro em pé, até 600 px de largura). Com movimento reduzido, a cena não toca.

Primeira visita: `localStorage["gazeta:cutscene"]`. Na capa: **Reviver a entrega**.

Depuração: `window.__csTimeScale = 0.25` (câmera lenta) e `window.__csSeek = 6.5` (congela a cena 3D nesse instante).

Custo medido (Chromium, 1920×1080): ~19 draw calls e ~88 mil triângulos; chão fora do passe de sombra; shaders e texturas pré-carregados atrás do preto inicial; até ~2,4 MP com resolução dinâmica; tudo é descartado ao terminar.

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

# 9. Estrutura do projeto

```text
frontend/                ← site estático, única pasta publicada (Vercel)
  index.html
  css/
  js/                    ← (futuro) js/edicao.js escolhe e carrega a edição do dia
  fonts/
  vendor/
  editions/              ← edições já publicadas (AAAA-MM-DD.json), escritas pelo Actions
gerador/                 ← Node + TypeScript, roda no Mac da proprietária (NÃO é servidor)
  .env.example
  src/
    ia/                  ← conexão com o Ollama (feita à mão, em par)
    redacao/             ← pauta, matérias, classificados, horóscopo
    memoria/             ← fichas, arcos, embeddings, antirrepetição
    cruzadinha/          ← lista de palavras, moldes, preenchimento, pistas
    sudoku/
    verificacao/         ← contrato, regras fixas, IA juíza
    edicao/              ← monta a edição e valida o contrato
    estoque/             ← cifra o estoque e libera a edição do dia
  prompts/               ← instruções da IA, separadas do código
  dados/                 ← bíblia, fichas, arcos, vetores, lista de palavras
  avaliacao/             ← notas humanas e relatórios de experimentos
  tests/
estoque/                 ← edições futuras cifradas (vai para o Git)
.github/workflows/       ← (futuro) publicação diária, testes, aviso de estoque
scripts/
  vendor.mjs             ← copia dependências para frontend/
docs/
  CONCEITO.md
  decisoes/              ← registro de decisões (ADRs): o quê, por quê, alternativas
package.json
```

As pastas do gerador ainda estão vazias (só `.gitkeep`).

### Responsabilidades (frontend atual)

| Arquivo | Responsabilidade |
|---|---|
| `frontend/index.html` | Estrutura das páginas, cena e abertura |
| `frontend/css/style.css` | Identidade visual e layout |
| `frontend/js/main.js` | Navegação, abertura e integração |
| `frontend/js/crumple.js` | Bola de jornal 3D |
| `frontend/js/reader3d.js` | Mãos e virada física |
| `frontend/js/print.js` | Retícula e rasterização |
| `frontend/js/cutscene.js` | Fluxo da cena da varanda + plano B em SVG |
| `frontend/js/cutscene3d.js` | Cena da varanda em 3D low-poly |
| `frontend/js/crossword.js` | Mecânica das palavras-cruzadas |
| `frontend/js/crossword-data.js` | Dados da cruzadinha atual |
| `frontend/js/sudoku.js` | Mecânica e dados do sudoku |
| `scripts/vendor.mjs` | Dependências e fontes locais |
| `docs/CONCEITO.md` | Visão original do projeto |

---

# 10. Arquitetura técnica

### Frontend (mantido)

- HTML, CSS, JavaScript **sem módulos e sem build**; IIFE e `var` por decisão arquitetural.
- Three.js, Web Animations API, SVG, Canvas, `localStorage`.
- Pode ser aberto via `file://` (nesse caso usa a Edição nº 0).
- **Não migrar o frontend para TypeScript, módulos ou framework agora**: risco para as animações sem ganho real.

### Gerador (novo)

| Para quê | Escolha |
|---|---|
| Linguagem | Node 24 + TypeScript |
| IA | Ollama local, via `fetch` |
| Contrato/validação | Zod |
| Testes | Vitest (gerador), Playwright (site) |

### Hospedagem e automação

| Peça | Serviço | Observação |
|---|---|---|
| Site | **Vercel Hobby** | Gratuito, sem cartão, uso pessoal não comercial; ao exceder limites, pausa (não cobra) |
| Publicação diária + testes | **GitHub Actions** | Gratuito em repositório público (runners padrão) |
| Plano B de hospedagem | GitHub Pages | Site estático muda de serviço em minutos |

**Render foi descartado:** não há servidor online para hospedar, e o plano gratuito adormece após 15 min (primeiro leitor esperaria ~1 min).

### Distribuição

**Somente o site.** Lojas ficam fora do escopo por custarem dinheiro (Steam: US$ 100 por app; Apple e Google também cobram). "Mobile" = site responsivo, com opção futura de PWA (instalar pelo navegador, gratuito).

---

# 11. Custo zero — regras inegociáveis

1. **Nenhum serviço com cartão de crédito cadastrado.** Sem cartão, não há cobrança surpresa: no pior caso o serviço para e o plano B entra.
2. Nada de APIs pagas, assinaturas ou créditos promocionais.
3. IA só local (Ollama). Embeddings só locais.
4. Antes de adotar qualquer serviço novo, verificar na documentação oficial: preço, limites, exigência de cartão e o que acontece ao exceder.
5. Descartados por custo ou risco de custo: GNews, Crossword Generator API, Hugging Face Inference, Render, Steam e lojas de apps.

---

# 12. Persistência

| O quê | Onde |
|---|---|
| Edições publicadas | `frontend/editions/AAAA-MM-DD.json` (Git) |
| Edições futuras | `estoque/` cifrado (Git) |
| Memória do universo | `gerador/dados/` (JSON, Git) |
| Progresso do leitor | `localStorage`, chave por edição: `gazeta:progress:cw:AAAA-MM-DD` |
| Segredos | `gerador/.env` (fora do Git) e *secrets* do GitHub |

As chaves antigas (`gazeta:cw-001`, `gazeta:sd-001`) pertencem à Edição nº 0; não apagar progresso existente sem migração.

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

## Cache do navegador

O servidor local (`python3 -m http.server`) não impede o navegador de reaproveitar arquivos antigos. Por isso os CSS/JS em `frontend/index.html` levam `?v=…`: **aumente a versão sempre que mudar CSS ou JS**.

## Documentação de decisões

Toda decisão relevante ganha um registro curto em `docs/decisoes/` (contexto, decisão, alternativas descartadas, consequências), incluindo o que ficou **de fora** e por quê.

## Versionamento

- O repositório Git já foi iniciado.
- Não realizar commits sem autorização explícita da proprietária.

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

O gerador ainda não tem comandos; quando existir, a rotina mensal será algo como `npm run gerar` → revisão → envio ao GitHub.

---

# 15. Roadmap

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
- [x] Cena da varanda em 3D low-poly, cenário brasileiro.
- [ ] Testar a cena 3D em celulares reais (desempenho).
- [ ] Revisar acessibilidade.
- [ ] Avaliar migração das animações para GSAP.

## Fase 2 — Edições diárias (ordem de construção; cada etapa entrega algo que funciona sozinho)

- [x] 0. Arrumar a casa: renomear `backend/` → `gerador/`, remover GNews do plano.
- [ ] 0b. Registrar as decisões do brainstorming em `docs/decisoes/`.
- [ ] 1. Contrato da edição (Zod) + Edição nº 0 + site carregando por data com fallbacks. Sem IA.
- [ ] 2. Site: progresso por data, grade de tamanho variável, página do horóscopo, classificados no rodapé da capa.
- [ ] 3. Gerador de sudoku (TDD: validade, unicidade, semente).
- [ ] 4. Cruzadinha: lista de palavras VERO filtrada + moldes + preenchimento.
- [ ] 5. IA: conexão com o Ollama **escrita à mão pela proprietária, em par**; benchmark de modelos.
- [ ] 6. Bíblia, redação, verificação, IA juíza e calibração com notas humanas.
- [ ] 7. Memória: fichas, arcos, embeddings, antirrepetição; experimento com × sem memória.
- [ ] 8. Pistas por IA + teste do solucionador.
- [ ] 9. Estoque cifrado + GitHub Actions diário + Vercel + aviso de estoque baixo.
- [ ] 10. Página de prévia para revisar itens duvidosos.

## Fase 3 — V2

- [ ] Níveis de dificuldade do sudoku.
- [ ] Navegação pelas edições antigas.
- [ ] PWA (instalar pelo navegador).
- [ ] Efeitos sonoros opcionais com botão de mudo.

## Fora do escopo (por custo)

- Steam, App Store, Google Play.
- Qualquer API ou serviço pago.

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

### Linha do tempo da cena

- Fade-in: 0–1 s · bonde passa: 0–3,1 s.
- Bicicleta: 1,2–4,9 s · pega o jornal na cesta: ~2,9 s.
- Arremesso: 3,45 s · cumprimento com a boina: 3,85–4,25 s.
- Jornal pousa: ~4,95 s.
- Câmera olha para baixo: 5–6 s.
- Mãos: 5,5–6,27 s (pegam o rolo) · levantam: 6,25–7 s.
- Elástico estoura: 6,92 s · jornal desenrola: 6,95–7,6 s.
- Tom de jornal se espalha a partir do papel: 7–8,4 s.
- Jornal cobre a tela: 7,6–8,5 s · título: 8,45 s.
- Encerramento: 9,5 s.

As cenas SVG usam `viewBox="0 0 400 800"` com `preserveAspectRatio="xMidYMid slice"` (elementos importantes entre `y=120` e `y=720`).

### Palavras-cruzadas

O caractere `#` representa casas pretas.

A classe `.cw-grid` utiliza atualmente cinco colunas.

Grades 9×9 e 13×13 exigirão adaptação do CSS e validação de compatibilidade.

### Testes

Utilizar Chrome/Playwright com:

- Viewport 390×844.
- `isMobile`.
- `hasTouch`.

Testes do gerador com Vitest; a IA é testada com uma IA falsa (respostas fixas) para o fluxo, e por avaliação (métricas) para a qualidade.

---

# 17. Princípios de desenvolvimento

1. Preservar a identidade visual e a experiência imersiva já construídas.
2. Não reescrever componentes funcionais sem necessidade.
3. Priorizar soluções simples, testáveis e sustentáveis.
4. Evitar dependências desnecessárias e tecnologia "para parecer sofisticado": cada peça precisa justificar seu valor.
5. **Custo zero** (seção 11).
6. Toda saída da IA passa por verificação antes de publicar; na dúvida, revisão humana.
7. Validar todas as palavras-cruzadas antes da publicação.
8. Garantir sudoku com solução única.
9. Não expor credenciais ou segredos no navegador nem edições futuras no repositório público.
10. Manter edições diárias estáveis e recuperáveis; o site nunca fica em branco.
11. Utilizar pt-BR em toda a experiência.
12. Medir qualidade da IA com números, não com impressão.
13. Não realizar commits sem autorização.

**Visão final:** transformar A Gazeta do Dia em um jornal digital vivo, no qual o leitor retorna diariamente para descobrir novas histórias de uma cidade que lembra o que aconteceu ontem, resolver desafios inéditos e desfrutar da experiência de folhear um jornal antigo.
