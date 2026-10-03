import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export const EXPENSE_CATEGORIES = [
  "Moradia", "Mercado", "Alimentação fora", "Transporte", "Saúde", "Educação",
  "Lazer", "Assinaturas", "Compras", "Cartão/Dívidas", "Impostos", "Outros",
] as const;

export const INCOME_CATEGORIES = ["Salário", "Negócio", "Freelance", "Investimentos", "Outros"] as const;

export type TxType = "income" | "expense";

export interface PersonalTx {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  description: string;
  tx_date: string; // yyyy-MM-dd
  payment_method: string | null;
  is_paid: boolean;
  is_recurring: boolean;
}

export interface PersonalBudget { id: string; category: string; monthly_limit: number }
export interface PersonalGoal {
  id: string; name: string; target_amount: number; current_amount: number; deadline: string | null;
}

export const monthKey = (d: Date) => format(d, "yyyy-MM");
export const monthLabel = (key: string) =>
  format(new Date(`${key}-01T12:00:00`), "MMM/yy", { locale: ptBR }).replace(".", "");
export const monthLongLabel = (key: string) =>
  format(new Date(`${key}-01T12:00:00`), "MMMM 'de' yyyy", { locale: ptBR });
export const shiftMonth = (key: string, delta: number) =>
  monthKey(addMonths(new Date(`${key}-01T12:00:00`), delta));
export const todayStr = () => format(new Date(), "yyyy-MM-dd");

/** Primeiro dia do mês mais antigo carregado (12 meses). */
export const historyStart = () => format(startOfMonth(subMonths(new Date(), 11)), "yyyy-MM-dd");

export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
  savingsRate: number | null; // % da renda que sobrou
  pendingExpense: number; // despesas ainda não pagas
  byCategory: { name: string; value: number }[];
}

export function summarize(txs: PersonalTx[], key: string): MonthSummary {
  const inMonth = txs.filter((t) => t.tx_date.startsWith(key));
  let income = 0, expense = 0, pendingExpense = 0;
  const cat = new Map<string, number>();
  for (const t of inMonth) {
    if (t.type === "income") {
      if (t.is_paid) income += t.amount;
    } else {
      expense += t.amount;
      if (!t.is_paid) pendingExpense += t.amount;
      cat.set(t.category, (cat.get(t.category) ?? 0) + t.amount);
    }
  }
  return {
    income, expense, balance: income - expense,
    savingsRate: income > 0 ? ((income - expense) / income) * 100 : null,
    pendingExpense,
    byCategory: [...cat.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
  };
}

/** Série dos últimos `n` meses terminando em `key`. */
export function monthlySeries(txs: PersonalTx[], key: string, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const k = shiftMonth(key, i - (n - 1));
    const s = summarize(txs, k);
    return { key: k, label: monthLabel(k), income: s.income, expense: s.expense, balance: s.balance };
  });
}
