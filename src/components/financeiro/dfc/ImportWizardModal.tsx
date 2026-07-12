import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { parseCSV, parseXLSX, parseOFX, autoDetectMapping, applyMapping, type ParsedRow, type ColumnMapping } from "@/lib/imports/parsers";
import type { CashAccount } from "@/hooks/useCashFlow";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: CashAccount[];
  onImport: (rows: ParsedRow[], accountId: string, filename: string, format: "csv" | "xlsx" | "ofx" | "pdf") => Promise<any>;
}

type Step = "upload" | "map" | "preview" | "done";

export function ImportWizardModal({ open, onOpenChange, accounts, onImport }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [accountId, setAccountId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"csv" | "xlsx" | "ofx" | "pdf">("csv");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setRows([]);
    setMapping({});
  };

  const handleFile = async (f: File) => {
    setFile(f);
    const name = f.name.toLowerCase();
    try {
      if (name.endsWith(".ofx")) {
        setFormat("ofx");
        const parsed = await parseOFX(f);
        setRows(parsed);
        setStep("preview");
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        setFormat("xlsx");
        const { headers: h, rows: r } = await parseXLSX(f);
        setHeaders(h);
        setRawRows(r);
        setMapping(autoDetectMapping(h));
        setStep("map");
      } else if (name.endsWith(".csv")) {
        setFormat("csv");
        const { headers: h, rows: r } = await parseCSV(f);
        setHeaders(h);
        setRawRows(r);
        setMapping(autoDetectMapping(h));
        setStep("map");
      } else if (name.endsWith(".pdf")) {
        toast({
          title: "PDF não suportado",
          description: "Por enquanto importe extratos em CSV, XLSX ou OFX. A maioria dos bancos permite baixar nesses formatos.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Formato não reconhecido", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro ao ler arquivo", description: e.message, variant: "destructive" });
    }
  };

  const handleApplyMapping = () => {
    if (!mapping.date || !mapping.description || !mapping.value) {
      toast({ title: "Selecione as colunas obrigatórias", variant: "destructive" });
      return;
    }
    const parsed = applyMapping(rawRows, mapping as ColumnMapping);
    if (parsed.length === 0) {
      toast({ title: "Nenhuma linha válida encontrada", variant: "destructive" });
      return;
    }
    setRows(parsed);
    setStep("preview");
  };

  const handleImport = async () => {
    if (!accountId || rows.length === 0) return;
    setBusy(true);
    try {
      await onImport(rows, accountId, file?.name || "extrato", format);
      setStep("done");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Importar extrato bancário</DialogTitle></DialogHeader>

        <div className="mb-4">
          <Label>Conta destino</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {step === "upload" && (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              Formatos aceitos: CSV, XLSX, OFX
            </p>
            <input
              id="dfc-import-file"
              type="file"
              accept=".csv,.xlsx,.xls,.ofx,.pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button onClick={() => document.getElementById("dfc-import-file")?.click()} disabled={!accountId}>
              Escolher arquivo
            </Button>
            {!accountId && <p className="text-xs text-muted-foreground mt-2">Selecione uma conta primeiro.</p>}
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Identificamos as colunas do seu extrato. Confirme ou ajuste os campos abaixo.
            </p>
            {(["date", "description", "value", "type"] as const).map((field) => (
              <div key={field}>
                <Label>
                  {field === "date" && "Coluna da Data *"}
                  {field === "description" && "Coluna da Descrição *"}
                  {field === "value" && "Coluna do Valor *"}
                  {field === "type" && "Coluna do Tipo (opcional)"}
                </Label>
                <Select
                  value={(mapping as any)[field] || ""}
                  onValueChange={(v) => setMapping({ ...mapping, [field]: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {field === "type" && <SelectItem value="__none__">— nenhuma —</SelectItem>}
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button className="flex-1" onClick={handleApplyMapping}>Ver prévia</Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm">
              <strong>{rows.length}</strong> movimentações encontradas no arquivo.
            </p>
            <div className="max-h-72 overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-secondary sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Descrição</th>
                    <th className="p-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2">{r.date}</td>
                      <td className="p-2">{r.description}</td>
                      <td className={`p-2 text-right font-mono ${r.direction === "in" ? "text-success" : "text-destructive"}`}>
                        {r.direction === "in" ? "+" : "-"}R$ {r.value.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button className="flex-1" onClick={handleImport} disabled={busy}>
                {busy ? "Importando..." : "Importar e conciliar"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-3" />
            <p className="font-semibold">Importação concluída!</p>
            <p className="text-sm text-muted-foreground mt-1">
              As movimentações foram registradas e a conciliação automática foi executada.
            </p>
            <Button className="mt-4" onClick={() => { onOpenChange(false); reset(); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}