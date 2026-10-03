import { useMemo } from "react";
import { ArrowDownCircle, ArrowUpCircle, Clock, PiggyBank, Wallet } from "lucide-react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { ChartCard, RankedBars, SimpleBarChart, TrendBadge, trendSentence } from "@/components/charts/ChartKit";
import { brl, monthlySeries, shiftMonth, summarize, type PersonalBudget, type PersonalTx } from "@/lib/personalFinance";

interface Props { txs: PersonalTx[]; budgets: PersonalBudget[]; month: string }

function Kpi({ icon: Icon, label, value, tone, badge }: {
  icon: typeof Wallet; label: string; value: string; tone?: string; badge?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Icon className="h-4 w-4" />{label}</span>
        {badge}
      </div>
      <p className={`font-display text-xl font-bold sm:text-2xl ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

export function Overview({ txs, budgets, month }: Props) {
  const { maskCurrency, isPrivate } = usePrivacyMode();
  const cur = useMemo(() => summarize(txs, month), [txs, month]);
  const prev = useMemo(() => summarize(txs, shiftMonth(month, -1)), [txs, month]);
  const series = useMemo(() => monthlySeries(txs, month, 6), [txs, month]);

  const overBudget = budgets
    .map((b) => ({ ...b, spent: cur.byCategory.find((c) => c.name === b.category)?.value ?? 0 }))
    .filter((b) => b.spent > b.monthly_limit);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={ArrowUpCircle} label="Receitas" value={maskCurrency(cur.income)} tone="text-success"
          badge={<TrendBadge current={cur.income} previous={prev.income} hidden={isPrivate} />} />
        <Kpi icon={ArrowDownCircle} label="Despesas" value={maskCurrency(cur.expense)} tone="text-destructive"
          badge={<TrendBadge current={cur.expense} previous={prev.expense} invert hidden={isPrivate} />} />
        <Kpi icon={Wallet} label="Saldo do mês" value={maskCurrency(cur.balance)}
          tone={cur.balance >= 0 ? "text-success" : "text-destructive"} />
        <Kpi icon={PiggyBank} label="Taxa de poupança"
          value={cur.savingsRate === null || isPrivate ? "—" : `${cur.savingsRate.toFixed(0)}%`} />
      </div>

      {(cur.pendingExpense > 0 || overBudget.length > 0) && (
        <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          {cur.pendingExpense > 0 && (
            <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-warning" />
              Você ainda tem <strong>{maskCurrency(cur.pendingExpense)}</strong> em contas a pagar neste mês.</p>
          )}
          {overBudget.map((b) => (
            <p key={b.id}>⚠️ <strong>{b.category}</strong> estourou o orçamento: {maskCurrency(b.spent)} de {maskCurrency(b.monthly_limit)}.</p>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Receitas x despesas" subtitle="Saldo dos últimos 6 meses"
          insight={trendSentence(cur.expense, prev.expense, { noun: "o gasto" })}>
          <SimpleBarChart data={series} xKey="label" valueKey="balance" label="Saldo"
            format={(v) => (isPrivate ? "•••" : brl(v))} />
        </ChartCard>
        <ChartCard title="Para onde foi o dinheiro" subtitle="Despesas por categoria no mês">
          <RankedBars items={cur.byCategory} format={(v) => maskCurrency(v)} emptyMessage="Nenhuma despesa neste mês." />
        </ChartCard>
      </div>
    </div>
  );
}
