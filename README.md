# A Gazeta do Dia

Jornal de época folheável com palavras cruzadas e sudoku jogáveis.
Frontend em HTML, CSS e JavaScript puro, sem build obrigatório.
O backend tem a estrutura do gerador de edições diárias, ainda sem implementação.

## Executar

Na raiz do projeto:

```bash
npm install
npm run vendor
npm start
```

Abra http://localhost:8000. Para encerrar, use Ctrl+C.
O comando serve apenas `frontend/`; o backend e suas configurações ficam fora da pasta pública.
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
backend/
  src/             # coleta, geração, validação e publicação
  prompts/         # instruções editoriais para IA
  cache/           # respostas de APIs, fora do Git
  tests/           # testes do gerador
scripts/
  vendor.mjs       # copia dependências para frontend/
docs/
  CONCEITO.md      # visão original
```

As dependências e o `package-lock.json` ficam na raiz. `npm run vendor` lê
`node_modules/` e atualiza bibliotecas e fontes dentro de `frontend/`.
Os caminhos do HTML continuam relativos à pasta do site.

O gerador deverá publicar os arquivos validados em `frontend/editions/`.
Configuração e responsabilidades do backend: [backend/README.md](backend/README.md).
Estado do projeto e convenções: [CLAUDE.md](CLAUDE.md).
