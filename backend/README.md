# Backend — geração da edição diária

Este é o **gerador** da Gazeta, não um servidor ligado o tempo todo.
Ele roda uma vez por dia (tarefa agendada), monta a edição, valida e
grava um arquivo estático em `../frontend/editions/`. O site só **lê** esse arquivo.

```
GNews ──► noticias/ ──► ia/ (RAG) ──┐
Crossword API ──► cruzadinha/ ──────┼──► validacao/ ──► publicacao/ ──► frontend/editions/AAAA-MM-DD.json
gerador próprio ──► sudoku/ ────────┘
```

As chaves de API ficam só aqui (`backend/.env`), nunca no navegador.

## Pastas

| Pasta | Responsabilidade | Alimenta |
|---|---|---|
| `src/noticias/` | Buscar notícias na GNews, filtrar e escolher as do dia | Página 1 — Capa |
| `src/ia/` | Escrever os textos a partir das fontes (RAG). **A gente faz junto, à mão** | Página 1 — Capa |
| `src/cruzadinha/` | Pedir a grade à Crossword API e converter para o formato do `frontend/js/crossword.js` | Página 2 |
| `src/sudoku/` | Gerar sudoku com solução única (algoritmo próprio, sem API) | Página 3 |
| `src/validacao/` | Conferir fatos × fontes, grade da cruzadinha e unicidade do sudoku | todas |
| `src/publicacao/` | Gravar a edição validada; se algo falhar, manter a última edição boa | todas |
| `prompts/` | Textos de instrução da IA (separados do código para revisar com calma) | — |
| `cache/` | Respostas brutas das APIs do dia (não vai para o Git) | — |
| `tests/` | Testes do gerador | — |

A Página 4 (Classificados) continua estática.

## Configuração

```bash
cp backend/.env.example backend/.env   # e preencha as chaves
```
