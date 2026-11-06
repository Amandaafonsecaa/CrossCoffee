# A Gazeta do Dia

Jornal de época folheável com palavras cruzadas e sudoku jogáveis.
Frontend em HTML, CSS e JavaScript puro, sem build obrigatório.
O gerador de edições diárias (pasta `gerador/`) ainda não foi implementado.

## Executar

Na raiz do projeto:

```bash
npm install
npm run vendor
npm start
```

Abra http://localhost:8000. Para encerrar, use Ctrl+C.
O comando serve apenas `frontend/`; o gerador e suas configurações ficam fora da pasta pública.
Também é possível abrir `frontend/index.html` diretamente para usar o protótipo estático.

## Estrutura

```text
frontend/
  index.html       # entrada do site
  css/             # estilos e fontes CSS
  js/              # jogos, navegação e animações
  fonts/           # arquivos de fontes locais
  vendor/          # bibliotecas para o navegador
  editions/        # saída pública das edições diárias
gerador/           # gera as edições no Mac (IA local); não é servidor
  src/             # ia, redação, memória, cruzadinha, sudoku, verificação, estoque
  prompts/         # instruções para a IA
  dados/           # bíblia da cidade, fichas, arcos, lista de palavras
  avaliacao/       # medições de qualidade da IA
  tests/           # testes do gerador
estoque/           # edições futuras, cifradas
scripts/
  vendor.mjs       # copia dependências para frontend/
docs/
  CONCEITO.md      # visão original
  decisoes/        # registro de decisões
```

As dependências e o `package-lock.json` ficam na raiz. `npm run vendor` lê
`node_modules/` e atualiza bibliotecas e fontes dentro de `frontend/`.
Os caminhos do HTML continuam relativos à pasta do site.

O gerador deverá publicar os arquivos validados em `frontend/editions/`.
Gerador: [gerador/README.md](gerador/README.md).
Estado do projeto e convenções: [CLAUDE.md](CLAUDE.md).
