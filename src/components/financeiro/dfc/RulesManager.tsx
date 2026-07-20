import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Sparkles, Pin, Plus } from "lucide-react";
import { useCategoryRules } from "@/hooks/useCategoryRules";
import { DEFAULT_CATEGORIES } from "@/lib/imports/categorize";

export function RulesManager() {
  const { rules, isLoading, createRule, deleteRule, promoteToManual } = useCategoryRules();
  const [pattern, setPattern] = useState("");
  const [category, setCategory] = useState<string>("Outros");
  const [matchType, setMatchType] = useState<"contains" | "exact" | "starts_with">("contains");
  const [direction, setDirection] = useState<"in" | "out" | "any">("any");

  const submit = async () => {
    if (!pattern.trim()) return;
    await createRule({ pattern, category, match_type: matchType, direction });
    setPattern("");
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-display font-bold text-lg mb-1">Regras Inteligentes</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ensine o sistema a categorizar automaticamente. Ex.: toda movimentação com "Stone" é <strong>Taxas de Cartão</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <div className="md:col-span-2">
            <Label className="text-xs">Trecho da descrição</Label>
            <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="Ex.: Stone, PIX Amanda" />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={matchType} onValueChange={(v) => setMatchType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contém</SelectItem>
                <SelectItem value="starts_with">Começa com</SelectItem>
                <SelectItem value="exact">Exato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Direção</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Ambas</SelectItem>
                <SelectItem value="in">Entrada</SelectItem>
                <SelectItem value="out">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEFAULT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-3" size="sm" onClick={submit}>
          <Plus className="w-4 h-4 mr-1" />Adicionar regra
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h4 className="font-display font-bold mb-3">Regras ativas ({rules.length})</h4>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma regra ainda. Categorize movimentações na conciliação e o sistema aprenderá automaticamente.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 bg-secondary/30 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{r.category}</Badge>
                    {r.auto_created ? (
                      <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/30">
                        <Sparkles className="w-2.5 h-2.5 mr-1" />Aprendida
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                        <Pin className="w-2.5 h-2.5 mr-1" />Manual
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {r.match_type} · {r.direction === "any" ? "ambas" : r.direction === "in" ? "entrada" : "saída"} · {r.hit_count}× usada
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-1 truncate">"{r.pattern}"</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {r.auto_created && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => promoteToManual(r.id)} title="Fixar como manual">
                      <Pin className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteRule(r.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}