import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Loader2,
  Save,
  Calendar,
  Info
} from "lucide-react";

interface WorkingDaysConfigProps {
  workingDays: number;
  onSave: (days: number) => Promise<void>;
  isSaving: boolean;
}

export function WorkingDaysConfig({ workingDays, onSave, isSaving }: WorkingDaysConfigProps) {
  const [localDays, setLocalDays] = useState(workingDays.toString());

  useEffect(() => {
    setLocalDays(workingDays.toString());
  }, [workingDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = parseInt(localDays) || 22;
    await onSave(days);
  };

  const hasChanges = parseInt(localDays) !== workingDays;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold">Configuração</h2>
          <p className="text-sm text-muted-foreground">Ajuste os parâmetros do cálculo</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workingDays" className="text-sm font-medium">
            Dias Trabalhados no Mês
          </Label>
          <Input
            id="workingDays"
            type="number"
            placeholder="Ex: 22"
            value={localDays}
            onChange={(e) => setLocalDays(e.target.value)}
            className="h-11"
            min="1"
            max="31"
          />
          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Quantos dias você trabalha por mês. Usado para calcular a meta diária de faturamento.
            </p>
          </div>
        </div>

        {hasChanges && (
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configuração
              </>
            )}
          </Button>
        )}
      </form>
    </motion.div>
  );
}
