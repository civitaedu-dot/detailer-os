import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Clock,
  Calculator,
  Save,
  Loader2,
  Info,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  DollarSign,
  Calendar,
  Target,
} from "lucide-react";

interface ValorHoraEmpresaProps {
  fixedCosts: number;
  variableCostsPercentage: number;
  workingDays: number;
  hoursPerDay: number;
  avgServicesPerDay: number;
  monthlyRevenue: number;
  onSave: (hoursPerDay: number, avgServicesPerDay: number) => Promise<void>;
  isSaving: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function ValorHoraEmpresa({
  fixedCosts,
  variableCostsPercentage,
  workingDays,
  hoursPerDay: initialHoursPerDay,
  avgServicesPerDay: initialAvgServicesPerDay,
  monthlyRevenue,
  onSave,
  isSaving,
}: ValorHoraEmpresaProps) {
  const [hoursPerDay, setHoursPerDay] = useState(initialHoursPerDay.toString());
  const [avgServicesPerDay, setAvgServicesPerDay] = useState(initialAvgServicesPerDay.toString());

  useEffect(() => {
    setHoursPerDay(initialHoursPerDay.toString());
    setAvgServicesPerDay(initialAvgServicesPerDay.toString());
  }, [initialHoursPerDay, initialAvgServicesPerDay]);

  const hours = parseFloat(hoursPerDay) || 8;
  const services = parseFloat(avgServicesPerDay) || 3;

  // Cálculos do Valor Hora
  const calculations = useMemo(() => {
    const totalHoursMonth = workingDays * hours;
    const totalServicesMonth = workingDays * services;

    // Custo total mensal (fixos + variáveis estimados)
    const estimatedVariableCosts = monthlyRevenue * (variableCostsPercentage / 100);
    const totalMonthlyCost = fixedCosts + estimatedVariableCosts;

    // Valor hora real (custo dividido por horas produtivas)
    const hourlyRate = totalHoursMonth > 0 ? totalMonthlyCost / totalHoursMonth : 0;

    // Valor por serviço (custo dividido por serviços)
    const costPerService = totalServicesMonth > 0 ? totalMonthlyCost / totalServicesMonth : 0;

    // Para ter lucro, o faturamento por hora precisa ser maior que o custo por hora
    const revenuePerHour = totalHoursMonth > 0 ? monthlyRevenue / totalHoursMonth : 0;
    const profitPerHour = revenuePerHour - hourlyRate;
    const isProfitable = profitPerHour > 0;

    // Margem de lucro por hora
    const profitMarginPerHour = revenuePerHour > 0 ? (profitPerHour / revenuePerHour) * 100 : 0;

    // Ticket médio atual (se houver faturamento)
    const currentAverageTicket = totalServicesMonth > 0 && monthlyRevenue > 0 
      ? monthlyRevenue / totalServicesMonth 
      : 0;

    return {
      totalHoursMonth,
      totalServicesMonth,
      totalMonthlyCost,
      hourlyRate,
      costPerService,
      revenuePerHour,
      profitPerHour,
      isProfitable,
      profitMarginPerHour,
      currentAverageTicket,
    };
  }, [workingDays, hours, services, fixedCosts, variableCostsPercentage, monthlyRevenue]);

  const hasChanges =
    parseFloat(hoursPerDay) !== initialHoursPerDay ||
    parseFloat(avgServicesPerDay) !== initialAvgServicesPerDay;

  const handleSave = async () => {
    await onSave(parseFloat(hoursPerDay) || 8, parseFloat(avgServicesPerDay) || 3);
  };

  const getHealthStatus = () => {
    if (!calculations.hourlyRate || calculations.hourlyRate === 0) {
      return {
        status: "empty",
        message: "Configure seus custos para calcular o valor hora",
        color: "text-muted-foreground",
        bgColor: "bg-secondary",
        borderColor: "border-border",
        icon: Info,
      };
    }

    if (calculations.isProfitable && calculations.profitMarginPerHour >= 20) {
      return {
        status: "excellent",
        message: "Excelente! Sua operação gera lucro consistente por hora trabalhada.",
        color: "text-success",
        bgColor: "bg-success/10",
        borderColor: "border-success/30",
        icon: CheckCircle2,
      };
    }

    if (calculations.isProfitable) {
      return {
        status: "good",
        message: "Bom! Você está lucrando, mas há espaço para melhorar a margem.",
        color: "text-primary",
        bgColor: "bg-primary/10",
        borderColor: "border-primary/30",
        icon: TrendingUp,
      };
    }

    return {
      status: "warning",
      message: "Atenção! Seu faturamento por hora não cobre os custos. Revise preços ou reduza custos.",
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/30",
      icon: AlertTriangle,
    };
  };

  const health = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header Explicativo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold mb-2">Valor Hora da Empresa</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Descubra quanto custa cada hora de trabalho do seu negócio. Este valor representa o mínimo que você 
              precisa faturar por hora para cobrir todos os custos e começar a gerar lucro. É fundamental para 
              precificar seus serviços corretamente.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Parâmetros de Entrada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Parâmetros Operacionais
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hoursPerDay">Horas Trabalhadas por Dia</Label>
              <Input
                id="hoursPerDay"
                type="number"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(e.target.value)}
                placeholder="8"
                min="1"
                max="24"
                step="0.5"
              />
              <p className="text-xs text-muted-foreground">
                Quantas horas você efetivamente trabalha por dia
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgServicesPerDay">Média de Serviços por Dia</Label>
              <Input
                id="avgServicesPerDay"
                type="number"
                value={avgServicesPerDay}
                onChange={(e) => setAvgServicesPerDay(e.target.value)}
                placeholder="3"
                min="0.5"
                max="50"
                step="0.5"
              />
              <p className="text-xs text-muted-foreground">
                Quantos serviços você realiza em média por dia
              </p>
            </div>

            <div className="p-3 rounded-lg bg-secondary/50 space-y-1">
              <p className="text-sm font-medium">Dados automáticos do sistema:</p>
              <p className="text-xs text-muted-foreground">
                • Dias trabalhados/mês: <span className="font-semibold text-foreground">{workingDays}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                • Custos fixos: <span className="font-semibold text-foreground">{formatCurrency(fixedCosts)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                • Custos variáveis: <span className="font-semibold text-foreground">{variableCostsPercentage.toFixed(1)}%</span>
              </p>
            </div>

            {hasChanges && (
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
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
          </div>
        </motion.div>

        {/* Capacidade Mensal */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Capacidade Mensal Calculada
          </h3>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total de Horas/Mês</span>
                <span className="text-2xl font-bold text-primary">
                  {calculations.totalHoursMonth.toFixed(0)}h
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {workingDays} dias × {hours}h = {calculations.totalHoursMonth.toFixed(0)} horas produtivas
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total de Serviços/Mês</span>
                <span className="text-2xl font-bold">{calculations.totalServicesMonth.toFixed(0)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {workingDays} dias × {services} serviços = {calculations.totalServicesMonth.toFixed(0)} serviços
              </p>
            </div>

            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Custo Total Mensal</span>
                <span className="text-2xl font-bold text-destructive">
                  {formatCurrency(calculations.totalMonthlyCost)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Custos fixos + variáveis estimados
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Resultado Principal - Valor Hora */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 rounded-xl p-8"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-display text-2xl font-bold mb-2">Seu Valor Hora</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Este é o valor mínimo que sua empresa precisa faturar por hora para cobrir todos os custos operacionais
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 rounded-xl bg-card border border-border">
            <DollarSign className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-3xl font-bold text-primary mb-1">
              {formatCurrency(calculations.hourlyRate)}
            </p>
            <p className="text-sm font-medium">Custo por Hora</p>
            <p className="text-xs text-muted-foreground mt-1">
              Mínimo para não ter prejuízo
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-card border border-border">
            <Clock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="text-3xl font-bold text-amber-500 mb-1">
              {formatCurrency(calculations.costPerService)}
            </p>
            <p className="text-sm font-medium">Custo por Serviço</p>
            <p className="text-xs text-muted-foreground mt-1">
              Base para precificação
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-card border border-border">
            <TrendingUp className="w-8 h-8 text-success mx-auto mb-3" />
            <p className="text-3xl font-bold text-success mb-1">
              {formatCurrency(calculations.revenuePerHour)}
            </p>
            <p className="text-sm font-medium">Faturamento/Hora Atual</p>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado no seu faturamento
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status de Saúde */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className={`p-4 rounded-xl border ${health.bgColor} ${health.borderColor}`}
      >
        <div className="flex items-start gap-3">
          <health.icon className={`w-6 h-6 ${health.color} shrink-0 mt-0.5`} />
          <div className="flex-1">
            <p className={`font-semibold ${health.color}`}>{health.message}</p>
            {calculations.isProfitable && monthlyRevenue > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Lucro por hora: {formatCurrency(calculations.profitPerHour)} ({calculations.profitMarginPerHour.toFixed(1)}% de margem)
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Dica Didática */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-secondary/50 border border-border rounded-xl p-5"
      >
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm mb-2">Como usar o Valor Hora na prática?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Precificação:</strong> Use o custo por hora × tempo do serviço como base</li>
              <li>• <strong>Margem:</strong> Adicione pelo menos 20-30% sobre o custo para ter lucro saudável</li>
              <li>• <strong>Decisões:</strong> Serviços que pagam menos que seu valor hora podem não valer a pena</li>
              <li>• <strong>Produtividade:</strong> Reduzir o tempo de execução aumenta sua rentabilidade</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
