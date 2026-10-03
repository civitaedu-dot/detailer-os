import { useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { usePersonalBudgets, usePersonalGoals, usePersonalTransactions } from "@/hooks/usePersonalFinance";
import { monthKey, monthLongLabel, shiftMonth } from "@/lib/personalFinance";
import { Overview } from "@/components/pessoal/Overview";
import { TransactionsTab } from "@/components/pessoal/TransactionsTab";
import { BudgetsTab } from "@/components/pessoal/BudgetsTab";
import { GoalsTab } from "@/components/pessoal/GoalsTab";
import { PersonalAgent } from "@/components/pessoal/PersonalAgent";
import { TransactionDialog } from "@/components/pessoal/TransactionDialog";

const Pessoal = () => {
  const [month, setMonth] = useState(monthKey(new Date()));
  const [quickAdd, setQuickAdd] = useState(false);
  const { isPrivate, togglePrivacy } = usePrivacyMode();
  const tx = usePersonalTransactions();
  const budgets = usePersonalBudgets();
  const goals = usePersonalGoals();
  const current = monthKey(new Date());

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Finanças pessoais</h1>
          <p className="text-sm text-muted-foreground">Seu dinheiro, separado do caixa da empresa.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={togglePrivacy} title="Ocultar valores">
            {isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <div className="flex items-center rounded-lg border border-border">
            <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-36 text-center text-sm font-medium capitalize">{monthLongLabel(month)}</span>
            <Button variant="ghost" size="icon" disabled={month >= current} onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button onClick={() => setQuickAdd(true)}><Plus className="mr-1 h-4 w-4" />Lançar</Button>
        </div>
      </div>

      {tx.isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tx.isError ? (
        <p className="py-20 text-center text-sm text-destructive">Não foi possível carregar seus dados. Tente recarregar a página.</p>
      ) : (
        <Tabs defaultValue="visao">
          <TabsList className="grid w-full grid-cols-5 sm:w-auto sm:inline-grid">
            <TabsTrigger value="visao">Visão geral</TabsTrigger>
            <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
            <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
            <TabsTrigger value="metas">Metas</TabsTrigger>
            <TabsTrigger value="assistente">Assistente</TabsTrigger>
          </TabsList>
          <TabsContent value="visao" className="mt-4"><Overview txs={tx.data ?? []} budgets={budgets.data ?? []} month={month} /></TabsContent>
          <TabsContent value="lancamentos" className="mt-4"><TransactionsTab txs={tx.data ?? []} month={month} /></TabsContent>
          <TabsContent value="orcamentos" className="mt-4"><BudgetsTab txs={tx.data ?? []} budgets={budgets.data ?? []} month={month} /></TabsContent>
          <TabsContent value="metas" className="mt-4"><GoalsTab goals={goals.data ?? []} /></TabsContent>
          <TabsContent value="assistente" className="mt-4"><PersonalAgent /></TabsContent>
        </Tabs>
      )}
      <TransactionDialog open={quickAdd} onOpenChange={setQuickAdd} />
    </div>
  );
};

export default Pessoal;
