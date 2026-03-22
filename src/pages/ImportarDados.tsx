import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Upload, FileSpreadsheet, Users, DollarSign, Download, CheckCircle2,
  XCircle, AlertTriangle, ArrowLeft, Trash2, Clock, ChevronRight
} from "lucide-react";
import * as XLSX from "xlsx";

type ImportType = "clients" | "financial";
type ImportStep = "upload" | "mapping" | "preview" | "processing" | "result";

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportHistoryItem {
  id: string;
  import_type: string;
  file_name: string;
  total_records: number;
  imported_records: number;
  duplicates_found: number;
  errors_found: number;
  status: string;
  created_at: string;
}

const CLIENT_FIELDS = [
  { value: "ignore", label: "Ignorar" },
  { value: "name", label: "Nome", required: true },
  { value: "phone", label: "Telefone", required: true },
  { value: "birthdate", label: "Data de Nascimento" },
  { value: "vehicle", label: "Veículo" },
  { value: "notes", label: "Observações" },
];

const FINANCIAL_FIELDS = [
  { value: "ignore", label: "Ignorar" },
  { value: "entry_date", label: "Data", required: true },
  { value: "description", label: "Descrição", required: true },
  { value: "value", label: "Valor", required: true },
  { value: "entry_type", label: "Tipo (entrada/saída)" },
  { value: "payment_method", label: "Forma de Pagamento" },
  { value: "client_name", label: "Nome do Cliente" },
  { value: "notes", label: "Observações" },
];

const COLUMN_SYNONYMS: Record<string, string[]> = {
  name: ["nome", "name", "cliente", "client", "razão social", "razao social"],
  phone: ["telefone", "phone", "celular", "tel", "whatsapp", "contato", "fone"],
  birthdate: ["nascimento", "data de nascimento", "birthday", "birthdate", "aniversário", "aniversario", "dt nascimento"],
  vehicle: ["veículo", "veiculo", "vehicle", "carro", "auto", "placa", "modelo"],
  notes: ["observação", "observacao", "obs", "notes", "nota", "observações"],
  entry_date: ["data", "date", "dt", "dia", "data do lançamento"],
  description: ["descrição", "descricao", "description", "desc", "serviço", "servico", "item"],
  value: ["valor", "value", "preço", "preco", "price", "total", "amount", "vlr"],
  entry_type: ["tipo", "type", "natureza", "categoria", "category", "entrada/saída"],
  payment_method: ["pagamento", "payment", "forma de pagamento", "meio", "método", "metodo"],
  client_name: ["cliente", "client", "nome do cliente"],
};

function autoMapColumns(headers: string[], importType: ImportType): ColumnMapping[] {
  const fields = importType === "clients" ? CLIENT_FIELDS : FINANCIAL_FIELDS;
  const usedFields = new Set<string>();

  return headers.map((header) => {
    const normalized = header.toLowerCase().trim();
    let bestMatch = "ignore";

    for (const field of fields) {
      if (field.value === "ignore" || usedFields.has(field.value)) continue;
      const synonyms = COLUMN_SYNONYMS[field.value] || [];
      if (synonyms.some((s) => normalized.includes(s) || s.includes(normalized))) {
        bestMatch = field.value;
        usedFields.add(field.value);
        break;
      }
    }

    return { sourceColumn: header, targetField: bestMatch };
  });
}

function parseDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const str = String(val).trim();
  const brMatch = str.match(/^(\d{2})[/\-.](\d{2})[/\-.](\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  const isoMatch = str.match(/^(\d{4})[/\-.](\d{2})[/\-.](\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  return null;
}

function parseValue(val: any): number | null {
  if (typeof val === "number") return val;
  if (!val) return null;
  const str = String(val).trim().replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

const ImportarDados = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("import");
  const [importType, setImportType] = useState<ImportType>("clients");
  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState("");
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [progress, setProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [importResult, setImportResult] = useState({ total: 0, imported: 0, duplicates: 0, errors: 0 });
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("import_history")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setHistory(data as ImportHistoryItem[]);
  };

  const processFile = (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(file.type) && !["xlsx", "xls", "csv"].includes(ext || "")) {
      toast({ title: "Formato inválido", description: "Use .xlsx, .xls ou .csv", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O limite é 10MB.", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
        if (!json.length) {
          toast({ title: "Planilha vazia", description: "O arquivo não contém dados.", variant: "destructive" });
          return;
        }
        const cols = Object.keys(json[0]);
        setHeaders(cols);
        setRawData(json);
        setMappings(autoMapColumns(cols, importType));
        setStep("mapping");
      } catch {
        toast({ title: "Erro ao ler arquivo", description: "Verifique o formato da planilha.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [importType]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const updateMapping = (idx: number, targetField: string) => {
    setMappings((prev) => prev.map((m, i) => (i === idx ? { ...m, targetField } : m)));
  };

  const getRequiredFields = () => {
    const fields = importType === "clients" ? CLIENT_FIELDS : FINANCIAL_FIELDS;
    return fields.filter((f) => f.required).map((f) => f.value);
  };

  const isMappingValid = () => {
    const mapped = new Set(mappings.map((m) => m.targetField));
    return getRequiredFields().every((f) => mapped.has(f));
  };

  const getMappedPreview = () => {
    const preview = rawData.slice(0, 5);
    return preview.map((row) => {
      const mapped: Record<string, any> = {};
      mappings.forEach((m) => {
        if (m.targetField !== "ignore") mapped[m.targetField] = row[m.sourceColumn];
      });
      return mapped;
    });
  };

  const runImport = async () => {
    if (!user) return;
    setStep("processing");
    setProgress(0);
    const errors: ImportError[] = [];
    let imported = 0;
    let duplicates = 0;

    const total = rawData.length;

    if (importType === "clients") {
      const phoneMapped = mappings.find((m) => m.targetField === "phone");
      const { data: existingClients } = await supabase
        .from("clients")
        .select("phone")
        .eq("user_id", user.id);
      const existingPhones = new Set((existingClients || []).map((c) => c.phone.replace(/\D/g, "")));

      for (let i = 0; i < total; i++) {
        const row = rawData[i];
        const record: Record<string, any> = { user_id: user.id };

        for (const m of mappings) {
          if (m.targetField === "ignore") continue;
          let val = row[m.sourceColumn];
          if (m.targetField === "birthdate") {
            val = parseDate(val);
          }
          if (m.targetField === "name" && (!val || String(val).trim().length < 2)) {
            errors.push({ row: i + 2, field: "name", message: "Nome é obrigatório (mín. 2 caracteres)" });
            continue;
          }
          if (m.targetField === "phone") {
            val = String(val || "").replace(/\D/g, "");
            if (val.length < 8) {
              errors.push({ row: i + 2, field: "phone", message: "Telefone inválido" });
              continue;
            }
          }
          record[m.targetField] = typeof val === "string" ? val.substring(0, 500) : val;
        }

        if (!record.name || !record.phone) {
          if (!errors.some((e) => e.row === i + 2)) {
            errors.push({ row: i + 2, field: "geral", message: "Nome e telefone são obrigatórios" });
          }
          setProgress(Math.round(((i + 1) / total) * 100));
          continue;
        }

        const cleanPhone = String(record.phone).replace(/\D/g, "");
        if (existingPhones.has(cleanPhone)) {
          duplicates++;
          setProgress(Math.round(((i + 1) / total) * 100));
          continue;
        }

        const { error } = await supabase.from("clients").insert(record as any);
        if (error) {
          errors.push({ row: i + 2, field: "geral", message: error.message });
        } else {
          imported++;
          existingPhones.add(cleanPhone);
        }
        setProgress(Math.round(((i + 1) / total) * 100));
      }
    } else {
      for (let i = 0; i < total; i++) {
        const row = rawData[i];
        const record: Record<string, any> = { user_id: user.id, is_automatic: false };

        for (const m of mappings) {
          if (m.targetField === "ignore") continue;
          let val = row[m.sourceColumn];
          if (m.targetField === "entry_date") {
            val = parseDate(val);
            if (!val) {
              errors.push({ row: i + 2, field: "entry_date", message: "Data inválida" });
            }
          }
          if (m.targetField === "value") {
            val = parseValue(val);
            if (val === null) {
              errors.push({ row: i + 2, field: "value", message: "Valor inválido" });
            }
          }
          if (m.targetField === "entry_type") {
            const normalized = String(val || "").toLowerCase().trim();
            val = ["saída", "saida", "despesa", "expense", "custo"].some((k) => normalized.includes(k))
              ? "expense" : "service";
          }
          record[m.targetField] = typeof val === "string" ? val.substring(0, 500) : val;
        }

        if (!record.entry_date || record.value === null || record.value === undefined || !record.description) {
          if (!errors.some((e) => e.row === i + 2)) {
            errors.push({ row: i + 2, field: "geral", message: "Data, descrição e valor são obrigatórios" });
          }
          setProgress(Math.round(((i + 1) / total) * 100));
          continue;
        }

        if (!record.entry_type) record.entry_type = "service";

        const { error } = await supabase.from("financial_entries").insert(record as any);
        if (error) {
          errors.push({ row: i + 2, field: "geral", message: error.message });
        } else {
          imported++;
        }
        setProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    setImportErrors(errors);
    const result = { total, imported, duplicates, errors: errors.length };
    setImportResult(result);

    await supabase.from("import_history").insert({
      user_id: user.id,
      import_type: importType,
      file_name: fileName,
      total_records: total,
      imported_records: imported,
      duplicates_found: duplicates,
      errors_found: errors.length,
      status: errors.length > 0 ? "partial" : "completed",
      error_details: JSON.stringify(errors.slice(0, 100)),
    } as any);

    fetchHistory();
    setStep("result");
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    if (importType === "clients") {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Nome", "Telefone", "Data de Nascimento", "Veículo", "Observações"],
        ["João Silva", "(11) 99999-0001", "15/03/1990", "Civic Preto", "Cliente VIP"],
        ["Maria Santos", "(11) 99999-0002", "22/07/1985", "Corolla Branco", ""],
      ]);
      ws["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    } else {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Data", "Descrição", "Valor", "Tipo", "Forma de Pagamento", "Cliente", "Observações"],
        ["15/03/2026", "Polimento completo", "350,00", "Entrada", "PIX", "João Silva", ""],
        ["15/03/2026", "Produto limpeza", "45,00", "Saída", "Cartão", "", "Compra mensal"],
      ]);
      ws["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws, "Financeiro");
    }
    XLSX.writeFile(wb, `modelo_${importType === "clients" ? "clientes" : "financeiro"}.xlsx`);
  };

  const resetImport = () => {
    setStep("upload");
    setFileName("");
    setRawData([]);
    setHeaders([]);
    setMappings([]);
    setProgress(0);
    setImportErrors([]);
    setImportResult({ total: 0, imported: 0, duplicates: 0, errors: 0 });
  };

  const fields = importType === "clients" ? CLIENT_FIELDS : FINANCIAL_FIELDS;
  const previewData = step === "preview" ? getMappedPreview() : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1">Importar Dados</h1>
          <p className="text-muted-foreground mb-6">Importe clientes ou dados financeiros a partir de planilhas</p>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="import"><Upload className="w-4 h-4 mr-1" /> Importar</TabsTrigger>
              <TabsTrigger value="history"><Clock className="w-4 h-4 mr-1" /> Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="import">
              {/* Step: Upload */}
              {step === "upload" && (
                <div className="space-y-6">
                  <div className="flex gap-3">
                    <Button
                      variant={importType === "clients" ? "default" : "outline"}
                      onClick={() => setImportType("clients")}
                      className="flex-1"
                    >
                      <Users className="w-4 h-4 mr-2" /> Clientes
                    </Button>
                    <Button
                      variant={importType === "financial" ? "default" : "outline"}
                      onClick={() => setImportType("financial")}
                      className="flex-1"
                    >
                      <DollarSign className="w-4 h-4 mr-2" /> Financeiro
                    </Button>
                  </div>

                  <Card
                    className={`border-2 border-dashed transition-colors cursor-pointer ${
                      isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <FileSpreadsheet className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-1">Arraste seu arquivo aqui</p>
                      <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
                      <p className="text-xs text-muted-foreground">.xlsx, .xls ou .csv — máx. 10MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleFileInput}
                      />
                    </CardContent>
                  </Card>

                  <Button variant="outline" onClick={downloadTemplate} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar modelo de planilha ({importType === "clients" ? "Clientes" : "Financeiro"})
                  </Button>
                </div>
              )}

              {/* Step: Mapping */}
              {step === "mapping" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Mapeamento de Colunas</h2>
                      <p className="text-sm text-muted-foreground">
                        Arquivo: <span className="font-medium">{fileName}</span> — {rawData.length} registros
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetImport}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                    </Button>
                  </div>

                  {!isMappingValid() && (
                    <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Mapeie os campos obrigatórios: {getRequiredFields().map((f) => fields.find((x) => x.value === f)?.label).join(", ")}
                    </div>
                  )}

                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Coluna da Planilha</TableHead>
                            <TableHead>Amostra</TableHead>
                            <TableHead><ChevronRight className="w-4 h-4 inline" /></TableHead>
                            <TableHead>Campo do Sistema</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mappings.map((m, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{m.sourceColumn}</TableCell>
                              <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                                {String(rawData[0]?.[m.sourceColumn] ?? "")}
                              </TableCell>
                              <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                              <TableCell>
                                <Select value={m.targetField} onValueChange={(v) => updateMapping(idx, v)}>
                                  <SelectTrigger className="w-[200px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fields.map((f) => (
                                      <SelectItem key={f.value} value={f.value}>
                                        {f.label} {f.required ? "*" : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={resetImport}>Cancelar</Button>
                    <Button onClick={() => setStep("preview")} disabled={!isMappingValid()}>
                      Pré-visualizar <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Preview */}
              {step === "preview" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Pré-visualização</h2>
                      <p className="text-sm text-muted-foreground">
                        Primeiros {previewData.length} de {rawData.length} registros
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep("mapping")}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                    </Button>
                  </div>

                  <Card>
                    <CardContent className="p-0 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {mappings.filter((m) => m.targetField !== "ignore").map((m) => (
                              <TableHead key={m.targetField}>
                                {fields.find((f) => f.value === m.targetField)?.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((row, i) => (
                            <TableRow key={i}>
                              {mappings.filter((m) => m.targetField !== "ignore").map((m) => (
                                <TableCell key={m.targetField} className="text-sm">
                                  {String(row[m.targetField] ?? "")}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setStep("mapping")}>Voltar</Button>
                    <Button onClick={runImport}>
                      <Upload className="w-4 h-4 mr-2" /> Importar {rawData.length} registros
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Processing */}
              {step === "processing" && (
                <Card>
                  <CardContent className="py-16 flex flex-col items-center">
                    <FileSpreadsheet className="w-12 h-12 text-primary animate-pulse mb-4" />
                    <h2 className="text-lg font-semibold mb-2">Importando dados...</h2>
                    <p className="text-sm text-muted-foreground mb-6">{progress}% concluído</p>
                    <Progress value={progress} className="w-full max-w-md" />
                  </CardContent>
                </Card>
              )}

              {/* Step: Result */}
              {step === "result" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {importResult.errors === 0 ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        )}
                        Importação Concluída
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center p-4 rounded-lg bg-muted">
                          <p className="text-2xl font-bold">{importResult.total}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-green-500/10">
                          <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                          <p className="text-xs text-muted-foreground">Importados</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                          <p className="text-2xl font-bold text-yellow-600">{importResult.duplicates}</p>
                          <p className="text-xs text-muted-foreground">Duplicados</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-destructive/10">
                          <p className="text-2xl font-bold text-destructive">{importResult.errors}</p>
                          <p className="text-xs text-muted-foreground">Erros</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {importErrors.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-destructive" /> Detalhes dos Erros
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="max-h-64 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Linha</TableHead>
                                <TableHead>Campo</TableHead>
                                <TableHead>Erro</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importErrors.slice(0, 50).map((err, i) => (
                                <TableRow key={i}>
                                  <TableCell>{err.row}</TableCell>
                                  <TableCell>{err.field}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{err.message}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button onClick={resetImport} className="w-full">
                    <Upload className="w-4 h-4 mr-2" /> Nova Importação
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              {history.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma importação realizada ainda.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Arquivo</TableHead>
                          <TableHead>Registros</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">
                              {new Date(item.created_at).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.import_type === "clients" ? "Clientes" : "Financeiro"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm max-w-[150px] truncate">{item.file_name}</TableCell>
                            <TableCell className="text-sm">
                              {item.imported_records}/{item.total_records}
                              {item.duplicates_found > 0 && (
                                <span className="text-yellow-600 ml-1">({item.duplicates_found} dup.)</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={item.status === "completed" ? "default" : "secondary"}
                                className={item.status === "completed" ? "bg-green-500/10 text-green-700 border-green-200" : ""}
                              >
                                {item.status === "completed" ? "Completo" : "Parcial"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
    </div>
  );
};

export default ImportarDados;
