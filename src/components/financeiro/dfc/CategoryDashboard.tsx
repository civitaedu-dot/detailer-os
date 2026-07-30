import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { toLocalDateString } from "@/lib/utils";
import type { CashTransaction } from "@/hooks/useCashFlow";
import { TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { ChartCard, RankedBars, SimpleLineChart, TrendBadge, trendSentence } from "@/components/charts/ChartKit";

interface Props {
  transactions: CashTransaction[];
  referenceDate: Date;
}

const PALETTE = ["#22C55E", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"];

export function CategoryDashboard({ transactions, referenceDate }: Props) {
  const { user } = useAuth();
  const { maskCurrency } = usePrivacyMode();
  const [historical, setHistorical] = useState<CashTransaction[]>([]);

  // Fetch last 6 months of transactions for evolution chart + prev-month comparison
  useEffect(() => {
    if (!user?.id) return;
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 5, 1);
    const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    (async () => {
      const { data } = await supabase
        .from("cash_transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", toLocalDateString(start))
        .lte("transaction_date", toLocalDateString(end));
      setHistorical(((data as any) || []) as CashTransaction[]);
    })();
  }, [user?.id, referenceDate]);

  const currentMonthKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
  const prevRef = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  const prevMonthKey = `${prevRef.getFullYear()}-${String(prevRef.getMonth() + 1).padStart(2, "0")}`;

  const stats = useMemo(() => {
    const out = transactions.filter((t) => t.direction === "out" && t.reconciliation_status !== "ignored");
    const inn = transactions.filter((t) => t.direction === "in" && t.reconciliation_status !== "ignored");
    const totalOut = out.reduce((s, t) => s + Number(t.value), 0);
    const totalIn = inn.reduce((s, t) => s + Number(t.value), 0);

    const byCategory: Record<string, number> = {};
    out.forEach((t) => {
      const k = t.category || "Outros";
      byCategory[k] = (byCategory[k] || 0) + Number(t.value);
    });

    const prevByCategory: Record<string, number> = {};
    historical
      .filter((t) => t.direction === "out" && t.transaction_date.startsWith(prevMonthKey) && t.reconciliation_status !== "ignored")
      .forEach((t) => {
        const k = t.category || "Outros";
        prevByCategory[k] = (prevByCategory[k] || 0) + Number(t.value);
      });

    return { totalOut, totalIn, byCategory, prevByCategory };
  }, [transactions, historical, prevMonthKey]);

  const sortedCategories = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);

  // Evolution chart: total de saídas nos últimos 6 meses (uma única métrica)
  const evolution = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const byMonth: Record<string, number> = {};
    months.forEach((m) => { byMonth[m] = 0; });
    historical
      .filter((t) => t.direction === "out" && t.reconciliation_status !== "ignored")
      .forEach((t) => {
        const mKey = t.transaction_date.slice(0, 7);
        if (byMonth[mKey] === undefined) return;
        byMonth[mKey] += Number(t.value);
      });
    return months.map((m) => {
      const [y, mm] = m.split("-");
      const label = new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
      return { month: label, total: byMonth[m] };
    });
  }, [historical, referenceDate]);

  // Insights
  const insights = useMemo(() => {
    const msgs: { text: string; tone: "info" | "warn" | "ok" }[] = [];
    const top = sortedCategories[0];
    if (top) {
      msgs.push({ text: `Seu maior centro de custo neste mês foi ${top[0]} (${maskCurrency(top[1])}).`, tone: "info" });
    }
    const cardFees = stats.byCategory["Taxas de Cartão"] || 0;
    if (cardFees > 0 && stats.totalIn > 0) {
      const pct = (cardFees / stats.totalIn) * 100;
      msgs.push({
        text: `Taxas de cartão consumiram ${pct.toFixed(1)}% do seu faturamento.`,
        tone: pct > 8 ? "warn" : "info",
      });
    }
    const prods = (stats.byCategory["Produtos Químicos"] || 0) + (stats.byCategory["Insumos"] || 0);
    if (prods > 0 && stats.totalOut > 0) {
      const pct = (prods / stats.totalOut) * 100;
      msgs.push({ text: `Produtos e insumos representam ${pct.toFixed(0)}% das suas saídas.`, tone: "info" });
    }
    // Biggest MoM movers
    let biggestChange: { cat: string; diff: number; pct: number } | null = null;
    Object.keys(stats.byCategory).forEach((cat) => {
      const cur = stats.byCategory[cat];
      const prev = stats.prevByCategory[cat] || 0;
      if (prev === 0) return;
      const diff = cur - prev;
      const pct = (diff / prev) * 100;
      if (!biggestChange || Math.abs(pct) > Math.abs(biggestChange.pct)) {
        biggestChange = { cat, diff, pct };
      }
    });
    if (biggestChange) {
      const b = biggestChange as { cat: string; diff: number; pct: number };
      if (Math.abs(b.pct) > 10) {
        msgs.push({
          text: `${b.cat} ${b.pct > 0 ? "subiu" : "caiu"} ${Math.abs(b.pct).toFixed(0)}% em relação ao mês anterior.`,
          tone: b.pct > 0 ? "warn" : "ok",
        });
      }
    }
    return msgs;
  }, [sortedCategories, stats, maskCurrency]);

  if (transactions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Registre ou importe movimentações para ver a análise por categoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-bold text-lg mb-3">Onde vai o seu dinheiro</h3>
          <div className="space-y-2">
            {insights.map((i, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  i.tone === "warn" ? "bg-warning/10 text-warning-foreground border border-warning/20" :
                  i.tone === "ok" ? "bg-success/10 text-success-foreground border border-success/20" :
                  "bg-info/5 border border-info/20"
                }`}
              >
                {i.tone === "warn" ? <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" /> :
                 i.tone === "ok" ? <TrendingDown className="w-4 h-4 mt-0.5 shrink-0" /> :
                 <Trophy className="w-4 h-4 mt-0.5 shrink-0" />}
                <span>{i.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking de gastos */}
      <ChartCard
        title="Para onde vai cada real que sai"
        subtitle="Ranking de gastos do mês por categoria"
        insight={
          sortedCategories.length > 0
            ? `${sortedCategories[0][0]} é hoje o seu maior gasto. Reduzir 10% nessa categoria já sobra dinheiro no seu caixa todo mês.`
            : "Classifique suas saídas para descobrir para onde o seu dinheiro está indo."
        }
      >
        <RankedBars
          items={sortedCategories.map(([cat, val]) => {
            const prev = stats.prevByCategory[cat] || 0;
            const diff = prev > 0 ? ((val - prev) / prev) * 100 : null;
            return {
              name: cat,
              value: val,
              hint: diff !== null && Math.abs(diff) > 5
                ? `${diff > 0 ? "Subiu" : "Caiu"} ${Math.abs(diff).toFixed(0)}% em relação ao mês passado`
                : undefined,
            };
          })}
          format={(v) => maskCurrency(v)}
          max={8}
          emptyMessage="Sem saídas categorizadas ainda."
        />
      </ChartCard>

      {/* Evolução total de saídas */}
      <ChartCard
        title="Quanto você gastou por mês"
        subtitle="Total de saídas nos últimos 6 meses"
        badge={
          <TrendBadge
            current={evolution[evolution.length - 1]?.total || 0}
            previous={evolution[evolution.length - 2]?.total || 0}
            invert
          />
        }
        insight={
          <>
            {trendSentence(evolution[evolution.length - 1]?.total || 0, evolution[evolution.length - 2]?.total || 0, { noun: "o total de gastos" })}{" "}
            {(evolution[evolution.length - 1]?.total || 0) > (evolution[evolution.length - 2]?.total || 0)
              ? "Confira no ranking acima qual categoria puxou esse aumento."
              : "Gastar menos mantendo o faturamento significa mais lucro no bolso."}
          </>
        }
      >
        <SimpleLineChart
          data={evolution} xKey="month" valueKey="total" label="Total de gastos"
          format={(v) => maskCurrency(v)} height={240}
        />
      </ChartCard>
    </div>
  );
}