# Classificação Inteligente de Movimentações + DRE por Categoria

Transforma a conciliação em um sistema que aprende com o usuário: sugere categorias automaticamente, memoriza padrões de descrição e aplica regras salvas nas próximas importações. Toda categorização alimenta um novo dashboard de custos por categoria, integrado ao DRE e à DFC.

## Escopo

### 1. Banco de dados (Supabase)

**Nova tabela `category_rules`** — regras inteligentes por usuário
- `user_id`, `pattern` (texto que dispara — case-insensitive), `match_type` (contains | exact | starts_with), `direction` (in | out | any), `category`, `payment_method` (opcional), `priority` (int), `auto_created` (bool — regras aprendidas pelo sistema vs manuais), `hit_count`, `last_matched_at`
- RLS por `auth.uid()`, grants para authenticated + service_role.

**Seed de categorias padrão do setor** na `transaction_categories` (via migração idempotente): Aluguel, Salários, Pró-labore, Produtos Químicos, Insumos, Comissões, Energia, Água, Internet, Impostos, Taxas Bancárias, Taxas de Cartão, Equipamentos, Marketing, Combustível, Manutenção, Fornecedores, Investimentos, Outros. Marcadas como `is_system = true` para não serem excluídas.

### 2. Engine de categorização

Novo módulo `src/lib/imports/categorize.ts`:

- **Dicionário built-in** com padrões conhecidos do setor:
  - Operadoras: `stone|cielo|rede|getnet|pagseguro|mercado pago|sumup|infinitepay` → Taxas de Cartão
  - Utilities: `vivo|claro|tim|oi` → Internet; `cpfl|enel|light|neoenergia|energisa` → Energia; `sabesp|copasa|cedae` → Água
  - Fornecedores: `vonixx|3m|meguiars|sonax|kers` → Produtos Químicos; `mercado livre|magalu|amazon` → Insumos
  - Impostos: `das|simples nacional|darf|inss|fgts` → Impostos
  - Combustível: `posto|shell|ipiranga|petrobras|ale` → Combustível
- **Ordem de resolução por movimentação** (maior prioridade primeiro):
  1. Regra manual salva do usuário (`auto_created = false`)
  2. Regra aprendida (`auto_created = true`) com maior `hit_count`
  3. Dicionário built-in
  4. Sem sugestão → categoria "Outros"
- Retorna `{ category, source: 'user_rule'|'learned'|'builtin'|'default', confidence }`.

### 3. Aprendizado automático

Sempre que o usuário confirma/altera a categoria de uma movimentação na tela de conciliação:
- Extrai um "token" estável da descrição (remove valores, datas, sufixos numéricos; mantém 2-3 palavras-chave iniciais).
- Faz upsert em `category_rules` com `match_type = contains`, `auto_created = true`, incrementa `hit_count`.
- Se já existir regra manual conflitante, não sobrescreve.

Reaplicar em lote: botão "Reclassificar pendentes com regras atuais" na aba Conciliação.

### 4. UI — Categorização inline na conciliação

Em `ReconciliationTable.tsx`:
- Nova coluna/linha "Categoria" com `Select` mostrando a sugestão em destaque + as demais categorias.
- Badge "Sugerido: Taxas de Cartão · Stone" quando vier do dicionário/regra.
- Ao trocar, salva imediatamente em `cash_transactions.category` e alimenta o aprendizado.
- Filtro adicional por categoria.

### 5. Tela "Regras Inteligentes"

Nova sub-aba dentro de **Contas & Importações** (ou terceira aba dedicada):
- Lista das regras do usuário, ordenadas por `hit_count`.
- Criar/editar/excluir manualmente (padrão, tipo de match, categoria, direção).
- Toggle "Aplicar em movimentações já importadas".
- Regras aprendidas ficam marcadas com badge "Auto" e podem ser promovidas a "Manual" (fixadas).

### 6. Dashboard "Onde vai meu dinheiro"

Nova sub-aba na DFC **"Análise por Categoria"** (ou incluir na Visão Geral):
- **Ranking** — barras horizontais com top categorias de saída, valor e % do total.
- **Donut** — participação por categoria.
- **Evolução mensal** — line chart empilhado por categoria (últimos 6 meses), usando `recharts`.
- **Comparativo mês vs mês anterior** — cards mostrando ↑/↓ % por categoria principal.
- **Insights automáticos** (mesmo padrão do painel Saúde do Caixa): frases geradas por regras como "Taxas de cartão representam X% do seu faturamento", "Produtos químicos subiram Y% vs mês anterior", "Seu maior centro de custo foi Z".

### 7. Integração com DRE e Financeiro

- DRE Simples passa a considerar as categorias `cash_transactions` conciliadas quando não houver `financial_entry` vinculado, evitando duplicidade (join por `matched_entry_id`).
- Dashboard financeiro principal ganha KPI "Maior gasto do mês (categoria)".

## Detalhes técnicos

- **Hooks novos**: `useCategoryRules`, `useCategorization` (aplica engine + aprende).
- **Componentes novos**: `CategoryPicker`, `RulesManager`, `CategoryDashboard`, `CategoryInsights`.
- **Migração única**: cria `category_rules` (+GRANT+RLS+trigger updated_at) e faz `INSERT ... ON CONFLICT DO NOTHING` das 19 categorias padrão em `transaction_categories`.
- **Sem quebra de contratos**: `cash_transactions.category` já existe; nova lógica apenas preenche/atualiza.
- **Client-side**: engine roda no browser durante importação para sugerir antes do commit (mostra pré-visualização com categoria já sugerida no wizard).

## Entregas em ordem

1. Migração (`category_rules` + seed de categorias).
2. Engine `categorize.ts` + hook `useCategoryRules`.
3. Categorização inline na Conciliação + aprendizado.
4. Sugestão automática no `ImportWizardModal` (pré-visualização com badges).
5. Tela "Regras Inteligentes".
6. Dashboard por categoria + insights.
7. Ajuste do DRE para consumir categorias conciliadas sem duplicar.

Confirma que posso seguir com tudo em um único lote, ou prefere fatiar (ex.: primeiro engine + categorização + regras, depois dashboards)?
