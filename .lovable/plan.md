# DFC 2.0 — Central de Gestão e Conciliação Financeira

Transformar a aba DFC em uma central completa de fluxo de caixa, com importação de extratos, conciliação automática, movimentações manuais, dashboards inteligentes e painel de saúde financeira em linguagem simples.

## Escopo

### 1. Banco de dados (Supabase)

Novas tabelas com RLS por `user_id`:

- **`cash_accounts`** — contas de caixa/bancárias/maquininhas
  - `name`, `type` (dinheiro | banco | pix | maquininha | outro), `initial_balance`, `initial_balance_date`, `color`, `active`
- **`cash_transactions`** — todas as movimentações (importadas + manuais + automáticas)
  - `account_id`, `transaction_date`, `description`, `value`, `direction` (in|out), `category`, `payment_method`, `source` (import|manual|auto_appointment|auto_fixed_cost|auto_variable_cost), `source_ref_id`, `import_id`, `reconciliation_status` (pending | matched | divergent | needs_review | ignored), `matched_entry_type`, `matched_entry_id`, `raw_data` (jsonb), `notes`
- **`bank_imports`** — histórico de arquivos importados
  - `account_id`, `filename`, `file_format` (csv|xlsx|ofx|pdf), `period_start`, `period_end`, `total_rows`, `matched_rows`, `pending_rows`, `status`
- **`transaction_categories`** — categorias personalizadas (com defaults do sistema)
  - `name`, `direction`, `color`, `icon`, `is_system`

Todas com `GRANT` para authenticated + service_role, RLS `auth.uid() = user_id`, timestamps + trigger de `updated_at`.

### 2. Importação de extratos

Nova página/aba com upload:
- **CSV/XLSX**: parse client-side com `papaparse` / `xlsx` (já usados em ImportarDados). Wizard de mapeamento de colunas (data, descrição, valor, tipo).
- **OFX**: parser JS leve (regex sobre tags SGML) — direto no cliente.
- **PDF**: extração best-effort via `pdfjs-dist` (já disponível indiretamente); quando o layout não permitir parse confiável, avisar o usuário e sugerir CSV/OFX.

Detecção automática de duplicatas por `account_id + date + value + description` (hash).

### 3. Conciliação automática

Ao importar, para cada transação nova:
1. Buscar em `financial_entries`, `appointments (status=concluído)`, `fixed_costs`, `variable_costs` com data ±3 dias e valor exato → `matched`.
2. Valor exato, data ±7 dias, descrição parecida (levenshtein simples) → `needs_review` com sugestão.
3. Valor divergente >0 mas descrição idêntica no mesmo dia → `divergent`.
4. Sem match → `pending`.

Tela de conciliação com filtro por status, badges coloridos, ações: **Confirmar sugestão**, **Vincular manualmente**, **Criar lançamento no financeiro**, **Ignorar**.

### 4. Movimentações manuais

Modal "Nova movimentação" para lançar entrada/saída em dinheiro, PIX, depósito, retirada, pagamento avulso — vai direto para `cash_transactions` já como `matched` (source=manual).

### 5. Dashboards da DFC

Substituir/expandir `DFCReport.tsx`:
- Cards: saldo inicial, entradas, saídas, fluxo líquido, saldo final
- Gráfico de evolução (diária/semanal/mensal — toggle)
- Top categorias de saída (ranking + % do total)
- Fontes de receita (ranking)
- Comparativo por meio de recebimento (dinheiro/PIX/cartão/outros) — donut
- Projeção de saldo futuro (próximos 30 dias) usando média móvel + custos fixos recorrentes

### 6. Painel Saúde do Caixa

Card destacado com frases automáticas geradas por regras:
- Status geral (saudável / atenção / crítico) baseado em fluxo líquido + runway
- "% das entradas consumido por custos fixos"
- "% das saídas em produtos/insumos"
- "Runway: X dias de operação no ritmo atual"
- Comparativo com mês anterior (melhorou/piorou X%)

### 7. Navegação histórica

Reusar `MonthSelector` para navegar entre meses; dados sempre por competência (`transaction_date`).

## Detalhes técnicos

- **Rotas**: manter dentro de `/financeiro` (aba DFC já existe). Adicionar sub-abas: **Visão Geral**, **Conciliação**, **Contas & Importações**.
- **Hooks novos**: `useCashAccounts`, `useCashTransactions`, `useBankImports`, `useReconciliation`.
- **Parsers**: `src/lib/imports/{csv,xlsx,ofx,pdf}Parser.ts` + `src/lib/imports/reconcile.ts`.
- **Componentes**: `CashFlowDashboard`, `CashHealthPanel`, `ReconciliationTable`, `ImportWizardModal`, `ManualTransactionModal`, `AccountsManager`.
- **Restrição de plano**: manter DFC restrito aos planos Gestão e Escala (regra já existente).
- **Isolamento**: todas as queries filtradas por `auth.uid()` via RLS; nenhuma query cross-user.

## Entregas em ordem

1. Migração do banco (4 tabelas + policies + grants).
2. Hooks + tipos.
3. Parsers + engine de conciliação.
4. UI: Contas, Importação (wizard), Movimentação manual.
5. UI: Tela de conciliação.
6. UI: Dashboards + Saúde do Caixa.
7. Integração com DRE/Financeiro existente (garantir que `matched` alimenta os mesmos totais sem duplicar).

## Confirmação necessária

Antes de começar, confirme:
- **Escopo do PDF**: parse best-effort ok, ou prefere pular PDF nesta etapa e focar em CSV/XLSX/OFX (mais confiáveis)?
- **Contas de caixa**: quer que eu crie contas default automaticamente (Dinheiro, PIX, Cartão) no primeiro acesso, ou o usuário cadastra manualmente?
- **Entrega**: posso entregar tudo de uma vez (grande PR), ou prefere em fases (ex: primeiro migração + importação + conciliação, depois dashboards)?
