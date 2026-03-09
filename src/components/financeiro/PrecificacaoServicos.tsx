import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Calculator,
  DollarSign,
  Clock,
  Package,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Save,
  Loader2,
  Target,
  PiggyBank,
  Sparkles,
} from "lucide-react";
import { Service, useServices } from "@/hooks/useServices";

interface PrecificacaoServicosProps {
  hourlyRate: number;
  costPerService: number;
  services: Service[];
  onUpdateService: (id: string, data: Partial<Service>) => Promise<void>;
  isUpdating: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function PrecificacaoServicos({
  hourlyRate,
  costPerService,
  services,
  onUpdateService,
  isUpdating,
}: PrecificacaoServicosProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [materialCost, setMaterialCost] = useState(0);
  const [additionalCost, setAdditionalCost] = useState(0);
  const [profitMargin, setProfitMargin] = useState(30);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Quando seleciona um serviço, preenche os campos
  const selectedService = services.find((s) => s.id === selectedServiceId);

  useEffect(() => {
    if (selectedService) {
      setDurationMinutes(selectedService.duration_minutes || 60);
      setMaterialCost(selectedService.material_cost || 0);
      setAdditionalCost(selectedService.additional_cost || 0);
      setProfitMargin(selectedService.profit_margin || 30);
    }
  }, [selectedService]);

  // Cálculos de precificação
  const pricing = useMemo(() => {
    const durationHours = durationMinutes / 60;

    // Custo do tempo de trabalho (valor hora × tempo)
    const laborCost = hourlyRate * durationHours;

    // Custo total do serviço
    const totalCost = laborCost + materialCost + additionalCost;

    // Preço com margem de lucro
    const priceWithMargin = totalCost * (1 + profitMargin / 100);

    // Preço mínimo (só cobre custos)
    const minimumPrice = totalCost;

    // Lucro estimado
    const estimatedProfit = priceWithMargin - totalCost;

    // Lucro por hora do serviço
    const profitPerHour = durationHours > 0 ? estimatedProfit / durationHours : 0;

    // Comparação com preço atual do serviço (se existir)
    const currentPrice = selectedService?.default_price || 0;
    const priceDifference = currentPrice - priceWithMargin;
    const isPriceHealthy = currentPrice >= minimumPrice;
    const isAboveRecommended = currentPrice >= priceWithMargin;

    return {
      durationHours,
      laborCost,
      totalCost,
      minimumPrice,
      priceWithMargin,
      estimatedProfit,
      profitPerHour,
      currentPrice,
      priceDifference,
      isPriceHealthy,
      isAboveRecommended,
    };
  }, [durationMinutes, hourlyRate, materialCost, additionalCost, profitMargin, selectedService]);

  const handleSaveToService = async () => {
    if (!selectedServiceId) return;

    await onUpdateService(selectedServiceId, {
      duration_minutes: durationMinutes,
      material_cost: materialCost,
      additional_cost: additionalCost,
      profit_margin: profitMargin,
      calculated_price: pricing.priceWithMargin,
    });

    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleApplyCalculatedPrice = async () => {
    if (!selectedServiceId) return;

    await onUpdateService(selectedServiceId, {
      duration_minutes: durationMinutes,
      material_cost: materialCost,
      additional_cost: additionalCost,
      profit_margin: profitMargin,
      calculated_price: pricing.priceWithMargin,
      default_price: pricing.priceWithMargin,
    });

    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const activeServices = services.filter((s) => s.is_active);

  return (
    <div className="space-y-6">
      {/* Header Explicativo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <Calculator className="w-6 h-6 text-success" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold mb-2">Precificação Profissional</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Calcule o preço ideal de cada serviço com base no seu valor hora, custos de materiais e margem de lucro 
              desejada. Esta ferramenta garante que você não trabalhe no prejuízo e mantenha uma operação lucrativa.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Alerta se não houver valor hora */}
      {hourlyRate === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-warning/10 border border-warning/30 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning">Configure o Valor Hora primeiro</p>
              <p className="text-sm text-muted-foreground mt-1">
                Para calcular preços corretos, você precisa definir seus parâmetros operacionais na aba "Valor Hora".
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda - Entrada de Dados */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6 space-y-6"
        >
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Dados do Serviço
          </h3>

          {/* Seleção de Serviço */}
          <div className="space-y-2">
            <Label>Selecione um Serviço</Label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um serviço cadastrado..." />
              </SelectTrigger>
              <SelectContent>
                {activeServices.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    Nenhum serviço ativo cadastrado
                  </div>
                ) : (
                  activeServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{service.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {formatCurrency(service.default_price)}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Cadastre serviços na página "Serviços" para vê-los aqui
            </p>
          </div>

          {/* Tempo de Execução */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Tempo de Execução (minutos)
            </Label>
            <Input
              id="duration"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
              min="15"
              max="480"
              step="15"
            />
            <p className="text-xs text-muted-foreground">
              {(durationMinutes / 60).toFixed(1)}h de trabalho = {formatCurrency(pricing.laborCost)} em mão de obra
            </p>
          </div>

          {/* Custo de Materiais */}
          <div className="space-y-2">
            <Label htmlFor="materialCost" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Custo de Produtos/Materiais (R$)
            </Label>
            <Input
              id="materialCost"
              type="number"
              value={materialCost}
              onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.50"
            />
            <p className="text-xs text-muted-foreground">
              Inclua ceras, shampoos, microfibras e outros insumos usados
            </p>
          </div>

          {/* Custos Adicionais */}
          <div className="space-y-2">
            <Label htmlFor="additionalCost" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Custos Adicionais (R$)
            </Label>
            <Input
              id="additionalCost"
              type="number"
              value={additionalCost}
              onChange={(e) => setAdditionalCost(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.50"
            />
            <p className="text-xs text-muted-foreground">
              Deslocamento, serviços terceirizados, custos específicos
            </p>
          </div>

          {/* Margem de Lucro */}
          <div className="space-y-3">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4" />
                Margem de Lucro Desejada
              </span>
              <span className="text-lg font-bold text-primary">{profitMargin}%</span>
            </Label>
            <Slider
              value={[profitMargin]}
              onValueChange={(v) => setProfitMargin(v[0])}
              min={0}
              max={100}
              step={5}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0% (sem lucro)</span>
              <span>50%</span>
              <span>100% (dobro)</span>
            </div>
          </div>
        </motion.div>

        {/* Coluna Direita - Resultado */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-6"
        >
          {/* Breakdown de Custos */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Composição do Preço
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Mão de obra ({(durationMinutes / 60).toFixed(1)}h × {formatCurrency(hourlyRate)})</span>
                <span className="font-medium">{formatCurrency(pricing.laborCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Produtos e materiais</span>
                <span className="font-medium">{formatCurrency(materialCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Custos adicionais</span>
                <span className="font-medium">{formatCurrency(additionalCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border bg-secondary/30 -mx-3 px-3 rounded">
                <span className="text-sm font-semibold">Custo Total</span>
                <span className="font-bold text-destructive">{formatCurrency(pricing.totalCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Margem de lucro ({profitMargin}%)</span>
                <span className="font-medium text-success">+ {formatCurrency(pricing.estimatedProfit)}</span>
              </div>
            </div>
          </div>

          {/* Preço Final Calculado */}
          <div className="bg-gradient-to-br from-success/10 via-card to-card border border-success/30 rounded-xl p-6">
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-success mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-2">Preço Recomendado</p>
              <p className="text-4xl font-bold text-success mb-4">
                {formatCurrency(pricing.priceWithMargin)}
              </p>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 rounded-lg bg-card border border-border">
                  <p className="text-xs text-muted-foreground">Preço Mínimo</p>
                  <p className="text-lg font-semibold text-warning">{formatCurrency(pricing.minimumPrice)}</p>
                  <p className="text-xs text-muted-foreground">Só cobre custos</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border">
                  <p className="text-xs text-muted-foreground">Lucro por Serviço</p>
                  <p className="text-lg font-semibold text-primary">{formatCurrency(pricing.estimatedProfit)}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(pricing.profitPerHour)}/h</p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparação com Preço Atual */}
          {selectedService && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${
                pricing.isAboveRecommended
                  ? "bg-success/10 border-success/30"
                  : pricing.isPriceHealthy
                  ? "bg-primary/10 border-primary/30"
                  : "bg-destructive/10 border-destructive/30"
              }`}
            >
              <div className="flex items-start gap-3">
                {pricing.isAboveRecommended ? (
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                ) : pricing.isPriceHealthy ? (
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">
                    {pricing.isAboveRecommended
                      ? "Preço atual está ótimo!"
                      : pricing.isPriceHealthy
                      ? "Preço atual cobre custos, mas margem é menor"
                      : "Preço atual está abaixo do mínimo!"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Preço atual: <strong>{formatCurrency(pricing.currentPrice)}</strong>
                    {pricing.priceDifference !== 0 && (
                      <span className={pricing.priceDifference > 0 ? "text-success" : "text-destructive"}>
                        {" "}
                        ({pricing.priceDifference > 0 ? "+" : ""}
                        {formatCurrency(pricing.priceDifference)})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Botões de Ação */}
          {selectedServiceId && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSaveToService}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Cálculo
              </Button>
              <Button
                className="flex-1"
                onClick={handleApplyCalculatedPrice}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <DollarSign className="w-4 h-4 mr-2" />
                )}
                Aplicar como Preço
              </Button>
            </div>
          )}

          {/* Feedback de sucesso */}
          <AnimatePresence>
            {showSaveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-success/10 border border-success/30 rounded-xl p-4 text-center"
              >
                <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
                <p className="text-sm font-medium text-success">Salvo com sucesso!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

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
            <p className="font-semibold text-sm mb-2">Por que precificar corretamente é importante?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • <strong>Preço muito baixo:</strong> Você trabalha muito e não sobra dinheiro no final do mês
              </li>
              <li>
                • <strong>Preço muito alto:</strong> Pode perder clientes para a concorrência
              </li>
              <li>
                • <strong>Preço ideal:</strong> Cobre seus custos, gera lucro e é competitivo no mercado
              </li>
              <li>
                • <strong>Margem recomendada:</strong> Entre 20% e 40% para negócios de serviços automotivos
              </li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Lista de Serviços com Análise Rápida */}
      {activeServices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Análise Rápida dos Seus Serviços
          </h3>

          <div className="space-y-3">
            {activeServices.map((service) => {
              const serviceHours = service.duration_minutes / 60;
              const estimatedCost = hourlyRate * serviceHours + (service.material_cost || 0) + (service.additional_cost || 0);
              const isHealthy = service.default_price >= estimatedCost;
              const margin = service.default_price > 0 ? ((service.default_price - estimatedCost) / service.default_price) * 100 : 0;

              return (
                <div
                  key={service.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedServiceId === service.id
                      ? "bg-primary/10 border-primary/30"
                      : "bg-secondary/30 border-border hover:bg-secondary/50"
                  }`}
                  onClick={() => setSelectedServiceId(service.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isHealthy ? "bg-success" : "bg-destructive"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-sm">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.duration_minutes}min • Custo: {formatCurrency(estimatedCost)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(service.default_price)}</p>
                    <p className={`text-xs ${isHealthy ? "text-success" : "text-destructive"}`}>
                      {margin > 0 ? `+${margin.toFixed(0)}%` : `${margin.toFixed(0)}%`} margem
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
