import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Upload, ArrowUpCircle, ArrowDownCircle, Wallet, Activity } from "lucide-react";
import { useCashFlow } from "@/hooks/useCashFlow";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { AccountsManager } from "./AccountsManager";
import { ImportWizardModal } from "./ImportWizardModal";
import { ManualTransactionModal } from "./ManualTransactionModal";
import { ReconciliationTable } from "./ReconciliationTable";

interface Props { referenceDate?: Date }

export function DFCCenter({ referenceDate }: Props) {
  const cf = useCashFlow(referenceDate);
  const { maskCurrency } = usePrivacyMode();
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const stats = useMemo(() => {
    const active = cf.transactions.filter((t) => t.reconciliation_status !== "ignored");
    const entries = active.filter((t) => t.direction === "in");
    const exits = active.filter((t) => t.direction === "out");
    const totalIn = entries.reduce((s, t) => s + Number(t.value), 0);
    const totalOut = exits.reduce((s, t) => s + Number(t.value), 0);
    const initial = cf.accounts.reduce((s, a) => s + Number(a.initial_balance), 0);
    const finalBal = initial + totalIn - totalOut;
    const net = totalIn - totalOut;

    const byMethod: Record<string, number> = {};
    entries.forEach((t) => {
      const k = t.payment_method || "outros";
      byMethod[k] = (byMethod[k] || 0) + Number(t.value);
    });

    const byCategory: Record<string, number> = {};
    exits.forEach((t) => {
      const k = t.category || "Sem categoria";
      byCategory[k] = (byCategory[k] || 0) + Number(t.value);
    });

    const runway = totalOut > 0 ? Math.round((finalBal / (totalOut / 30))) : null;
    const fixedShare = totalIn > 0 ? (totalOut / totalIn) * 100 : 0;

    return { totalIn, totalOut, initial, finalBal, net, byMethod, byCategory, runway, fixedShare };
  }, [cf.transactions, cf.accounts]);

  const healthMsg = useMemo(() => {
    if (stats.net > 0 && stats.fixedShare < 70) return { level: "ok", text: "Seu caixa está saudável. As entradas estão superando as saídas neste período." };
    if (stats.net > 0) return { level: "warn", text: `Seu caixa está positivo, mas suas saídas consomem ${stats.fixedShare.toFixed(0)}% das entradas. Atenção com o crescimento dos custos.` };
    return { level: "bad", text: "Suas saídas superam as entradas neste período. Reveja custos e priorize aumentar o faturamento." };
  }, [stats]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="reconcile">Conciliação</TabsTrigger>
            <TabsTrigger value="accounts">Contas & Importações</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-1" /> Importar extrato
            </Button>
            <Button size="sm" onClick={() => setManualOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Nova movimentação
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card icon={Wallet} label="Saldo Inicial" value={maskCurrency(stats.initial)} />
            <Card icon={ArrowUpCircle} label="Entradas" value={maskCurrency(stats.totalIn)} accent="success" />
            <Card icon={ArrowDownCircle} label="Saídas" value={maskCurrency(stats.totalOut)} accent="destructive" />
            <Card icon={Activity} label="Fluxo Líquido" value={maskCurrency(stats.net)} accent={stats.net >= 0 ? "success" : "destructive"} />
            <Card icon={Wallet} label="Saldo Final" value={maskCurrency(stats.finalBal)} accent={stats.finalBal >= 0 ? "success" : "destructive"} />
          </div>

          <div className={`p-5 rounded-xl border-2 ${
            healthMsg.level === "ok" ? "bg-success/10 border-success/30" :
            healthMsg.level === "warn" ? "bg-warning/10 border-warning/30" :
            "bg-destructive/10 border-destructive/30"
          }`}>
            <p className="font-display font-bold text-lg mb-1">Saúde do Fluxo de Caixa</p>
            <p className="text-sm">{healthMsg.text}</p>
            {stats.runway !== null && stats.runway > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Seu caixa atual suporta aproximadamente <strong>{stats.runway} dias</strong> de operação mantendo o padrão de gastos atual.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RankingBox title="Principais fontes de receita" items={stats.byMethod} total={stats.totalIn} tone="in" />
            <RankingBox title="Maiores categorias de gasto" items={stats.byCategory} total={stats.totalOut} tone="out" />
          </div>
        </TabsContent>

        <TabsContent value="reconcile" className="mt-4">
          <ReconciliationTable
            transactions={cf.transactions}
            onUpdateStatus={cf.updateTransactionStatus}
            onDelete={cf.deleteTransaction}
          />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4 mt-4">
          <AccountsManager
            accounts={cf.accounts}
            onCreate={cf.createAccount}
            onDelete={cf.deleteAccount}
          />
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display font-bold text-lg mb-4">Últimas importações</h3>
            {cf.imports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum extrato importado ainda.</p>
            ) : (
              <div className="space-y-2">
                {cf.imports.map((i) => (
                  <div key={i.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{i.filename}</p>
                      <p className="text-xs text-muted-foreground uppercase">{i.file_format} · {new Date(i.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-xs text-right">
                      <p>{i.total_rows} linhas</p>
                      <p className="text-success">{i.matched_rows} conciliadas</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ImportWizardModal
        open={importOpen}
        onOpenChange={setImportOpen}
        accounts={cf.accounts}
        onImport={cf.importRows}
      />
      <ManualTransactionModal
        open={manualOpen}
        onOpenChange={setManualOpen}
        accounts={cf.accounts}
        onSubmit={cf.createManualTransaction}
      />
    </div>
  );
}

function Card({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: "success" | "destructive" }) {
  const color = accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <Icon className={`w-5 h-5 ${color} mb-2`} />
      <p className={`font-display font-bold text-lg ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function RankingBox({ title, items, total, tone }: { title: string; items: Record<string, number>; total: number; tone: "in" | "out" }) {
  const { maskCurrency } = usePrivacyMode();
  const sorted = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-display font-bold text-lg mb-4">{title}</h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Sem dados no período.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(([k, v]) => {
            const pct = total > 0 ? (v / total) * 100 : 0;
            return (
              <div key={k}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize">{k}</span>
                  <span className={tone === "in" ? "text-success" : "text-destructive"}>{maskCurrency(v)} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={tone === "in" ? "h-full bg-success" : "h-full bg-destructive"} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}