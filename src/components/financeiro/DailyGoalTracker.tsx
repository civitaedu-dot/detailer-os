import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Zap,
  AlertCircle,
  CheckCircle2,
  Edit3,
  X
} from "lucide-react";

interface DailyGoalTrackerProps {
  monthlyGoal: number;
  dailyTarget: number;
  revenue: number;
  workingDays: number;
  useAutoGoal: boolean;
  breakEven: number;
  workedDaysSoFar: number;
  expectedRevenueSoFar: number;
  revenueDifference: number;
  isAhead: boolean;
  avgDailyRevenue: number;
  remainingDays: number;
  remainingToGoal: number;
  manualGoal: number | null;
  onSaveGoal: (goal: number | null, useAuto: boolean) => void;
  isSaving: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function DailyGoalTracker({
  monthlyGoal,
  dailyTarget,
  revenue,
  workingDays,
  useAutoGoal,
  breakEven,
  workedDaysSoFar,
  expectedRevenueSoFar,
  revenueDifference,
  isAhead,
  avgDailyRevenue,
  remainingDays,
  remainingToGoal,
  manualGoal,
  onSaveGoal,
  isSaving,
}: DailyGoalTrackerProps) {
  const { maskCurrency } = usePrivacyMode();
  const formatCurrency = (value: number) => maskCurrency(value);
  const [isEditing, setIsEditing] = useState(false);
  const [localUseAuto, setLocalUseAuto] = useState(useAutoGoal);
  const [localGoal, setLocalGoal] = useState(manualGoal?.toString() || "");

  useEffect(() => {
    setLocalUseAuto(useAutoGoal);
    setLocalGoal(manualGoal?.toString() || "");
  }, [useAutoGoal, manualGoal]);

  const handleSave = () => {
    const goalValue = localUseAuto ? null : (parseFloat(localGoal) || null);
    onSaveGoal(goalValue, localUseAuto);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalUseAuto(useAutoGoal);
    setLocalGoal(manualGoal?.toString() || "");
    setIsEditing(false);
  };

  const progressPercentage = monthlyGoal > 0 ? Math.min((revenue / monthlyGoal) * 100, 100) : 0;
  const hasGoalConfigured = monthlyGoal > 0 || workingDays > 0;

  // Calculate required daily to still hit goal
  const requiredDailyToHitGoal = remainingDays > 0 ? remainingToGoal / remainingDays : 0;

  if (!hasGoalConfigured && !isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold">Meta Diária</h2>
        </div>
        
        <div className="text-center py-6">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            Preencha seus dados financeiros (custos fixos, variáveis e dias trabalhados) para calcular sua meta diária automaticamente.
          </p>
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit3 className="w-4 h-4 mr-2" />
            Configurar Meta Manualmente
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Meta Diária</h2>
            <p className="text-xs text-muted-foreground">
              {useAutoGoal ? "Baseada no ponto de equilíbrio" : "Meta personalizada"}
            </p>
          </div>
        </div>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Edit3 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Editing Mode */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-6 p-4 rounded-lg bg-secondary/50 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <Label htmlFor="autoGoal" className="font-medium">Meta automática</Label>
            </div>
            <Switch
              id="autoGoal"
              checked={localUseAuto}
              onCheckedChange={setLocalUseAuto}
            />
          </div>
          
          <p className="text-sm text-muted-foreground">
            {localUseAuto 
              ? `Meta sugerida: ${formatCurrency(breakEven)} (ponto de equilíbrio)`
              : "Defina sua própria meta mensal"}
          </p>

          {!localUseAuto && (
            <div className="space-y-2">
              <Label htmlFor="manualGoal">Meta Mensal (R$)</Label>
              <Input
                id="manualGoal"
                type="number"
                placeholder="Ex: 15000"
                value={localGoal}
                onChange={(e) => setLocalGoal(e.target.value)}
                className="h-11"
                min="0"
                step="100"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              Salvar
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Meta do Mês</p>
          <p className="text-xl font-bold font-display text-primary">{formatCurrency(monthlyGoal)}</p>
        </div>
        <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
          <p className="text-sm text-muted-foreground mb-1">Meta Diária</p>
          <p className="text-xl font-bold font-display text-accent">{formatCurrency(dailyTarget)}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progresso do mês</span>
          <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatCurrency(revenue)} faturado</span>
          <span>{formatCurrency(monthlyGoal)} meta</span>
        </div>
      </div>

      {/* Status Card */}
      <div className={`p-4 rounded-lg ${
        isAhead 
          ? "bg-success/10 border border-success/30" 
          : "bg-warning/10 border border-warning/30"
      }`}>
        <div className="flex items-start gap-3">
          {isAhead ? (
            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
          ) : (
            <TrendingDown className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`font-semibold ${isAhead ? "text-success" : "text-warning"}`}>
              {isAhead 
                ? `Você está adiantado em ${formatCurrency(Math.abs(revenueDifference))}!` 
                : `Você está atrasado em ${formatCurrency(Math.abs(revenueDifference))}`}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAhead 
                ? "Continue assim para superar sua meta!" 
                : `Para atingir a meta, fature ${formatCurrency(requiredDailyToHitGoal)} por dia nos próximos ${remainingDays} dias.`}
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Dias trabalhados</p>
            <p className="text-xs text-muted-foreground">{workedDaysSoFar} de {workingDays} dias</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Média diária atual</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(avgDailyRevenue)} por dia trabalhado
              {avgDailyRevenue >= dailyTarget && avgDailyRevenue > 0 && (
                <span className="text-success ml-1">✓</span>
              )}
            </p>
          </div>
        </div>

        {remainingToGoal > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <Target className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Falta para a meta</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(remainingToGoal)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div className="mt-6 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <p className="text-sm text-muted-foreground">
          <strong className="text-primary">📊 Como funciona:</strong> Para atingir sua meta mensal de {formatCurrency(monthlyGoal)}, 
          você precisa faturar <strong className="text-foreground">{formatCurrency(dailyTarget)} por dia</strong>, 
          considerando {workingDays} dias trabalhados no mês.
        </p>
      </div>
    </motion.div>
  );
}
