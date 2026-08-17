import { useMemo, useState } from "react";
import { Users, Search, Plus, CheckSquare, Square, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export interface RecipientItem {
  client: { id: string; name: string; phone: string; vehicle?: string | null };
  daysSince: number | null;
  manual?: boolean;
}

interface Props {
  /** Clients matched by the automatic filters, already merged with manual additions. */
  items: RecipientItem[];
  excludedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  /** Full client base, used by the "Adicionar clientes" dialog. */
  allClients: { id: string; name: string; phone: string; vehicle?: string | null }[];
  onAddClients: (ids: string[]) => void;
  onRemoveManual: (id: string) => void;
}

const matches = (c: { name: string; phone: string; vehicle?: string | null }, q: string) => {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  const digits = term.replace(/\D/g, "");
  return (
    c.name.toLowerCase().includes(term) ||
    (c.vehicle || "").toLowerCase().includes(term) ||
    (digits.length > 0 && c.phone.replace(/\D/g, "").includes(digits))
  );
};

export const RecipientSelector = ({
  items,
  excludedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  allClients,
  onAddClients,
  onRemoveManual,
}: Props) => {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addPicked, setAddPicked] = useState<string[]>([]);

  const excluded = useMemo(() => new Set(excludedIds), [excludedIds]);
  const selectedCount = items.filter((i) => !excluded.has(i.client.id)).length;

  const visible = useMemo(() => items.filter((i) => matches(i.client, search)), [items, search]);

  const inListIds = useMemo(() => new Set(items.map((i) => i.client.id)), [items]);
  const addCandidates = useMemo(
    () => allClients.filter((c) => !inListIds.has(c.id) && matches(c, addSearch)).slice(0, 100),
    [allClients, inListIds, addSearch],
  );

  const confirmAdd = () => {
    if (addPicked.length) onAddClients(addPicked);
    setAddPicked([]);
    setAddSearch("");
    setAddOpen(false);
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Destinatários
        </CardTitle>
        <CardDescription>
          <span className="font-semibold text-foreground">{selectedCount}</span> de {items.length} cliente
          {items.length !== 1 ? "s" : ""} selecionado{selectedCount !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou veículo"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onSelectAll} className="flex-1 min-w-[8rem]">
            <CheckSquare className="w-4 h-4 mr-2" />Selecionar todos
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClearAll} className="flex-1 min-w-[8rem]">
            <Square className="w-4 h-4 mr-2" />Desmarcar todos
          </Button>
          <Button type="button" size="sm" onClick={() => setAddOpen(true)} className="flex-1 min-w-[8rem]">
            <Plus className="w-4 h-4 mr-2" />Adicionar clientes
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-1.5 -mx-1 px-1">
          {visible.map((item) => {
            const checked = !excluded.has(item.client.id);
            return (
              <label
                key={item.client.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  checked ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-border/40"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(item.client.id)}
                  className="h-5 w-5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{item.client.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.client.vehicle || "Sem veículo"} · {item.client.phone}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.manual && (
                    <Badge variant="outline" className="text-[10px] px-1.5">Manual</Badge>
                  )}
                  {item.daysSince !== null && (
                    <span className="text-xs text-muted-foreground">{item.daysSince}d</span>
                  )}
                  {item.manual && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.preventDefault(); onRemoveManual(item.client.id); }}
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </label>
            );
          })}
          {visible.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {items.length === 0 ? "Nenhum cliente corresponde aos filtros" : "Nenhum resultado para a busca"}
            </p>
          )}
        </div>
      </CardContent>

      {/* Add clients dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Adicionar clientes
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="Buscar na base completa"
              className="pl-9"
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {addCandidates.map((c) => {
              const picked = addPicked.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                    picked ? "bg-primary/5 border-primary/30" : "border-border/40"
                  }`}
                >
                  <Checkbox
                    checked={picked}
                    onCheckedChange={() =>
                      setAddPicked((prev) => (picked ? prev.filter((id) => id !== c.id) : [...prev, c.id]))
                    }
                    className="h-5 w-5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.vehicle || "Sem veículo"} · {c.phone}</p>
                  </div>
                </label>
              );
            })}
            {addCandidates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente disponível</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={confirmAdd} disabled={addPicked.length === 0}>
              Adicionar {addPicked.length > 0 ? `(${addPicked.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};