import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle2, AlertTriangle, Building2, Loader2, ArrowUpCircle, ArrowDownCircle, CalendarRange, ListOrdered, Copy } from "lucide-react";
import {
  parseFile,
  applyMapping,
  summarize,
  type ParsedRow,
  type ColumnMapping,
  type FileFormat,
  type FileSummary,
} from "@/lib/imports/parsers";
import type { CashAccount } from "@/hooks/useCashFlow";
import { useToast } from "@/hooks/use-toast";
import { guardRateLimit } from "@/lib/rateLimit";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: CashAccount[];
  onImport: (
    rows: ParsedRow[],
    accountId: string,
    filename: string,
    format: FileFormat,
    meta?: { bankName?: string | null },
    onProgress?: (p: { phase: string; done: number; total: number }) => void,
  ) => Promise<any>;
  onAnalyze: (rows: ParsedRow[], accountId: string) => Promise<{ duplicates: number }>;
}

type Step = "upload" | "map" | "preview" | "importing" | "done";

const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");

export function ImportWizardModal({ open, onOpenChange, accounts, onImport, onAnalyze }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [accountId, setAccountId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<FileFormat>("csv");
  const [bankName, setBankName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState(0);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<{ phase: string; done: number; total: number }>({ phase: "", done: 0, total: 0 });
  const [result, setResult] = useState<any>(null);

  const summary: FileSummary | null = useMemo(() => (rows.length > 0 ? summarize(rows) : null), [rows]);

  const reset = () => {
    setStep("upload"); setFile(null); setHeaders([]); setRawRows([]); setRows([]);
    setMapping({}); setWarnings([]); setDuplicates(0); setResult(null); setBankName(null);
    setProgress({ phase: "", done: 0, total: 0 });
  };

  const goPreview = async (parsed: ParsedRow[], warns: string[]) => {
    setRows(parsed);
    setWarnings(warns);
    setStep("preview");
    try {
      const { duplicates: d } = await onAnalyze(parsed, accountId);
      setDuplicates(d);
    } catch { /* análise de duplicidade é apenas informativa */ }
  };

  const handleFile = async (f: File) => {
    setFile(f);
    setReading(true);
    try {
      const res = await parseFile(f);
      setFormat(res.format);
      setBankName(res.bankName || null);
      if (res.needsMapping) {
        setHeaders(res.headers);
        setRawRows(res.rawRows);
        setMapping(res.mapping || {});
        setWarnings(res.warnings);
        // tenta aplicar direto se a detecção foi completa
        const m = res.mapping || {};
        if (m.date && m.description && (m.value || m.credit || m.debit)) {
          const applied = applyMapping(res.rawRows, m as ColumnMapping);
          if (applied.rows.length > 0) {
            await goPreview(applied.rows, [...res.warnings, ...applied.warnings]);
            setStep("preview");
            setReading(false);
            return;
          }
        }
        setStep("map");
      } else {
        if (res.rows.length === 0) throw new Error("Nenhuma movimentação válida encontrada no arquivo.");
        await goPreview(res.rows, res.warnings);
      }
    } catch (e: any) {
      toast({ title: "Erro ao ler arquivo", description: e.message, variant: "destructive" });
      setStep("upload");
    } finally {
      setReading(false);
    }
  };

  const handleApplyMapping = async () => {
    if (!mapping.date || !mapping.description || !(mapping.value || mapping.credit || mapping.debit)) {
      toast({ title: "Selecione as colunas obrigatórias", description: "Data, descrição e valor (ou colunas de crédito/débito).", variant: "destructive" });
      return;
    }
    const applied = applyMapping(rawRows, mapping as ColumnMapping);
    if (applied.rows.length === 0) {
      toast({ title: "Nenhuma linha válida encontrada", description: "Confira se as colunas escolhidas estão corretas.", variant: "destructive" });
      return;
    }
    await goPreview(applied.rows, applied.warnings);
  };

  const handleImport = async () => {
    if (!accountId || rows.length === 0) return;
    const limit = await guardRateLimit("import_file", { endpoint: "dfc/import" });
    if (!limit.allowed) {
      toast({ title: "Muitas importações seguidas", description: limit.message, variant: "destructive" });
      return;
    }
    setStep("importing");
    try {
      const r = await onImport(rows, accountId, file?.name || "extrato", format, { bankName }, setProgress);
      setResult(r);
      setStep("done");
    } catch (e: any) {
      toast({ title: "Falha na importação", description: e.message, variant: "destructive" });
      setStep("preview");
    }
  };

  const setMap = (field: keyof ColumnMapping, v: string) =>
    setMapping({ ...mapping, [field]: v === "__none__" ? undefined : v });

  const mapFields: Array<{ key: keyof ColumnMapping; label: string; optional?: boolean }> = [
    { key: "date", label: "Data *" },
    { key: "description", label: "Descrição / Histórico *" },
    { key: "value", label: "Valor *", optional: true },
    { key: "credit", label: "Coluna de entradas (crédito)", optional: true },
    { key: "debit", label: "Coluna de saídas (débito)", optional: true },
    { key: "type", label: "Tipo (D/C, entrada/saída)", optional: true },
    { key: "balance", label: "Saldo após o lançamento", optional: true },
    { key: "externalId", label: "Identificador / documento", optional: true },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (step === "importing") return; onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Importar extrato bancário</DialogTitle></DialogHeader>

        {step !== "importing" && step !== "done" && (
          <div className="mb-2">
            <Label>Conta destino</Label>
            <Select value={accountId} onValueChange={setAccountId} disabled={step !== "upload"}>
              <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === "upload" && (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            {reading ? (
              <>
                <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Lendo e interpretando o arquivo...</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">Formatos aceitos: OFX, CSV e XLSX</p>
                <p className="text-xs text-muted-foreground mb-4">
                  O OFX é o mais confiável — identifica automaticamente valores, datas e o código de cada transação.
                </p>
                <input
                  id="dfc-import-file"
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls,.ofx,.qfx"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <Button onClick={() => document.getElementById("dfc-import-file")?.click()} disabled={!accountId}>
                  Escolher arquivo
                </Button>
                {!accountId && <p className="text-xs text-muted-foreground mt-2">Selecione uma conta primeiro.</p>}
              </>
            )}
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Identificamos a estrutura do seu extrato. Confirme ou ajuste as colunas abaixo antes de continuar.
            </p>
            {bankName && (
              <Badge variant="outline" className="gap-1"><Building2 className="w-3 h-3" /> {bankName}</Badge>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mapFields.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}</Label>
                  <Select value={(mapping as any)[f.key] || "__none__"} onValueChange={(v) => setMap(f.key, v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— nenhuma —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Se o extrato tiver colunas separadas de crédito e débito, preencha as duas e deixe "Valor" em branco.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { reset(); }}>Trocar arquivo</Button>
              <Button className="flex-1" onClick={handleApplyMapping}>Ver pré-visualização</Button>
            </div>
          </div>
        )}

        {step === "preview" && summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <StatBox icon={ListOrdered} label="Movimentações" value={String(summary.count)} />
              <StatBox icon={ArrowUpCircle} label="Total de entradas" value={money(summary.totalIn)} tone="success" />
              <StatBox icon={ArrowDownCircle} label="Total de saídas" value={money(summary.totalOut)} tone="destructive" />
              <StatBox icon={CalendarRange} label="Período" value={`${fmtDate(summary.periodStart)} a ${fmtDate(summary.periodEnd)}`} small />
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {bankName && <Badge variant="outline" className="gap-1"><Building2 className="w-3 h-3" /> {bankName}</Badge>}
              <Badge variant="outline" className="uppercase">{format}</Badge>
              <Badge variant="outline">Resultado líquido: {money(summary.net)}</Badge>
              {duplicates > 0 && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
                  <Copy className="w-3 h-3" /> {duplicates} já importada(s) — serão ignoradas
                </Badge>
              )}
            </div>

            {warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 space-y-1">
                {warnings.map((w, i) => (
                  <p key={i} className="text-xs flex gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning" />{w}</p>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Confira como interpretamos o arquivo. Nada é gravado até você confirmar.
            </p>

            <div className="max-h-72 overflow-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-secondary sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Descrição</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-right">Valor</th>
                    <th className="p-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="p-2 max-w-[240px] truncate" title={r.original_description}>{r.description}</td>
                      <td className="p-2">
                        <span className={r.direction === "in" ? "text-success" : "text-destructive"}>
                          {r.direction === "in" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td className={`p-2 text-right font-mono whitespace-nowrap ${r.direction === "in" ? "text-success" : "text-destructive"}`}>
                        {r.direction === "in" ? "+" : "-"}{money(r.value)}
                      </td>
                      <td className="p-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                        {r.balance_after != null ? money(r.balance_after) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 200 && (
              <p className="text-xs text-muted-foreground">Mostrando as 200 primeiras de {rows.length} movimentações.</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => (headers.length > 0 ? setStep("map") : reset())}>Voltar</Button>
              <Button className="flex-1" onClick={handleImport}>
                Confirmar e importar {summary.count} movimentações
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
            <p className="font-semibold">{progress.phase || "Processando..."}</p>
            <Progress value={progress.total > 0 ? (progress.done / progress.total) * 100 : 10} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {progress.total > 0 ? `${progress.done} de ${progress.total} movimentações` : "Preparando..."}
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-3" />
            <p className="font-semibold text-lg">Importação concluída</p>
            {result && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-left text-sm">
                <ResultLine label="Gravadas" value={result.inserted} />
                <ResultLine label="Conciliadas automaticamente" value={result.matched} tone="success" />
                <ResultLine label="Aguardando sua confirmação" value={result.review} tone="warning" />
                <ResultLine label="Duplicadas ignoradas" value={result.skipped} />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Abra a aba <strong>Revisão</strong> para confirmar as sugestões e classificar o que ficou pendente.
            </p>
            <Button className="mt-4" onClick={() => { onOpenChange(false); reset(); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ icon: Icon, label, value, tone, small }: { icon: any; label: string; value: string; tone?: "success" | "destructive"; small?: boolean }) {
  const color = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="bg-secondary/40 border border-border rounded-lg p-3">
      <Icon className={`w-4 h-4 mb-1 ${color}`} />
      <p className={`font-display font-bold ${small ? "text-xs" : "text-base"} ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function ResultLine({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" }) {
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="flex justify-between bg-secondary/40 rounded-lg px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-semibold ${color}`}>{value ?? 0}</span>
    </div>
  );
}
