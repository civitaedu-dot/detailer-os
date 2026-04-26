import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Calculator,
  Save,
  Loader2,
  Trash2,
  Pencil,
  Plus,
  X,
  TrendingUp,
} from "lucide-react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import {
  usePrecificacoes,
  type Precificacao,
  type PrecificacaoFormData,
} from "@/hooks/usePrecificacoes";
import { useServices } from "@/hooks/useServices";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface MaterialAdicional {
  nome: string;
  valor: number;
  desconto: number;
}

interface ScenarioResult {
  key: "sn" | "avista" | "6x" | "10x";
  label: string;
  preco: number;
  comissaoPct: number;
  impostoPct: number;
  taxaCartaoPct: number;
  comissaoValor: number;
  impostoValor: number;
  taxaCartaoValor: number;
  resultadoLiquido: number;
  margemReal: number;
}

function calcScenario(opts: {
  custoFixoTotal: number;
  margemPct: number;
  comissaoPct: number;
  impostoPct: number;
  taxaCartaoPct: number;
}): { preco: number } {
  const { custoFixoTotal, margemPct, comissaoPct, impostoPct, taxaCartaoPct } =
    opts;
  const somaVar = (margemPct + comissaoPct + impostoPct + taxaCartaoPct) / 100;
  const denom = 1 - somaVar;
  if (denom <= 0) return { preco: 0 };
  return { preco: custoFixoTotal / denom };
}

const initialMaterial: MaterialAdicional = { nome: "", valor: 0, desconto: 0 };

export function CalculadoraPrecificacao() {
  const { maskCurrency } = usePrivacyMode();
  const fmt = (v: number) => maskCurrency(v);
  const { services } = useServices();
  const {
    precificacoes,
    isLoading,
    isSaving,
    createPrecificacao,
    updatePrecificacao,
    deletePrecificacao,
  } = usePrecificacoes();

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Custos
  const [nomeServico, setNomeServico] = useState("");
  const [serviceId, setServiceId] = useState<string>("none");
  const [materialPrincipal, setMaterialPrincipal] = useState({
    valor: 0,
    desconto: 0,
  });
  const [materiaisAdicionais, setMateriaisAdicionais] = useState<
    MaterialAdicional[]
  >([{ ...initialMaterial }]);
  const [maoObra, setMaoObra] = useState(0);

  // Parâmetros financeiros
  const [margemLucro, setMargemLucro] = useState(25);
  const [comissaoAvista, setComissaoAvista] = useState(5);
  const [comissaoParcelado, setComissaoParcelado] = useState(3);
  const [aliquotaImposto, setAliquotaImposto] = useState(10);
  const [taxa6x, setTaxa6x] = useState(8.6);
  const [taxa10x, setTaxa10x] = useState(12.56);

  const resetForm = () => {
    setEditingId(null);
    setNomeServico("");
    setServiceId("none");
    setMaterialPrincipal({ valor: 0, desconto: 0 });
    setMateriaisAdicionais([{ ...initialMaterial }]);
    setMaoObra(0);
    setMargemLucro(25);
    setComissaoAvista(5);
    setComissaoParcelado(3);
    setAliquotaImposto(10);
    setTaxa6x(8.6);
    setTaxa10x(12.56);
  };

  // Calcular custo total dos materiais (aplicando desconto)
  const custoMaterialTotal = useMemo(() => {
    const principal =
      materialPrincipal.valor * (1 - materialPrincipal.desconto / 100);
    const adicionais = materiaisAdicionais.reduce(
      (acc, m) => acc + m.valor * (1 - m.desconto / 100),
      0
    );
    return principal + adicionais;
  }, [materialPrincipal, materiaisAdicionais]);

  const custoFixoTotal = custoMaterialTotal + maoObra;

  // Cálculo dos cenários
  const scenarios: ScenarioResult[] = useMemo(() => {
    const make = (
      key: ScenarioResult["key"],
      label: string,
      comissao: number,
      imposto: number,
      taxaCartao: number
    ): ScenarioResult => {
      const { preco } = calcScenario({
        custoFixoTotal,
        margemPct: margemLucro,
        comissaoPct: comissao,
        impostoPct: imposto,
        taxaCartaoPct: taxaCartao,
      });
      const comissaoValor = preco * (comissao / 100);
      const impostoValor = preco * (imposto / 100);
      const taxaCartaoValor = preco * (taxaCartao / 100);
      const resultadoLiquido =
        preco - custoFixoTotal - comissaoValor - impostoValor - taxaCartaoValor;
      const margemReal = preco > 0 ? (resultadoLiquido / preco) * 100 : 0;
      return {
        key,
        label,
        preco,
        comissaoPct: comissao,
        impostoPct: imposto,
        taxaCartaoPct: taxaCartao,
        comissaoValor,
        impostoValor,
        taxaCartaoValor,
        resultadoLiquido,
        margemReal,
      };
    };

    return [
      // SN: zera imposto e usa comissão à vista
      make("sn", "SN", comissaoAvista, 0, 0),
      make("avista", "À Vista", comissaoAvista, aliquotaImposto, 0),
      make("6x", "Parcelado 6x", comissaoParcelado, aliquotaImposto, taxa6x),
      make("10x", "Parcelado 10x", comissaoParcelado, aliquotaImposto, taxa10x),
    ];
  }, [
    custoFixoTotal,
    margemLucro,
    comissaoAvista,
    comissaoParcelado,
    aliquotaImposto,
    taxa6x,
    taxa10x,
  ]);

  const precoSN = scenarios[0].preco;

  const updateMaterialAdicional = (
    idx: number,
    field: keyof MaterialAdicional,
    value: string | number
  ) => {
    setMateriaisAdicionais((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value as never };
      return next;
    });
  };

  const addMaterialAdicional = () => {
    if (materiaisAdicionais.length >= 3) return;
    setMateriaisAdicionais((prev) => [...prev, { ...initialMaterial }]);
  };

  const removeMaterialAdicional = (idx: number) => {
    setMateriaisAdicionais((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!nomeServico.trim()) {
      return;
    }
    const payload: PrecificacaoFormData = {
      service_id: serviceId !== "none" ? serviceId : null,
      nome_servico: nomeServico.trim(),
      custo_material_total: custoMaterialTotal,
      custo_mao_obra: maoObra,
      margem_lucro: margemLucro,
      aliquota_imposto: aliquotaImposto,
      comissao_avista: comissaoAvista,
      comissao_parcelado: comissaoParcelado,
      taxa_cartao_6x: taxa6x,
      taxa_cartao_10x: taxa10x,
      preco_sn: scenarios[0].preco,
      preco_avista: scenarios[1].preco,
      preco_6x: scenarios[2].preco,
      preco_10x: scenarios[3].preco,
      detalhes: {
        material_principal: materialPrincipal,
        materiais_adicionais: materiaisAdicionais,
        service_id: serviceId !== "none" ? serviceId : null,
      },
    };

    if (editingId) {
      await updatePrecificacao(editingId, payload);
    } else {
      await createPrecificacao(payload);
    }
  };

  const handleEdit = (p: Precificacao) => {
    setEditingId(p.id);
    setNomeServico(p.nome_servico);
    setServiceId(p.service_id || "none");
    setMaoObra(Number(p.custo_mao_obra) || 0);
    setMargemLucro(Number(p.margem_lucro) || 0);
    setAliquotaImposto(Number(p.aliquota_imposto) || 0);
    setComissaoAvista(Number(p.comissao_avista) || 0);
    setComissaoParcelado(Number(p.comissao_parcelado) || 0);
    setTaxa6x(Number(p.taxa_cartao_6x) || 0);
    setTaxa10x(Number(p.taxa_cartao_10x) || 0);
    const det = p.detalhes || {};
    setMaterialPrincipal(
      det.material_principal || { valor: Number(p.custo_material_total) || 0, desconto: 0 }
    );
    setMateriaisAdicionais(
      det.materiais_adicionais && det.materiais_adicionais.length > 0
        ? det.materiais_adicionais
        : [{ ...initialMaterial }]
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Estilos por cenário
  const cardStyles: Record<ScenarioResult["key"], string> = {
    sn: "border-primary bg-primary/5",
    avista: "border-border",
    "6x": "border-border",
    "10x": "border-border",
  };

  const formatPct = (v: number) =>
    `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">
              Calculadora de Precificação
            </h3>
            <p className="text-sm text-muted-foreground">
              Calcule o preço ideal por modalidade de pagamento usando precificação reversa.
              SN é o preço base de referência.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FORM */}
        <div className="space-y-6">
          {/* Custos */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Custos do Serviço
            </h4>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome do serviço</Label>
              <Input
                id="nome"
                placeholder="Ex.: PPF Full"
                value={nomeServico}
                onChange={(e) => setNomeServico(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Vincular a serviço cadastrado (opcional)</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Material principal */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="text-sm font-medium">Material principal</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={materialPrincipal.valor || ""}
                    onChange={(e) =>
                      setMaterialPrincipal((p) => ({
                        ...p,
                        valor: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Desconto (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={materialPrincipal.desconto || ""}
                    onChange={(e) =>
                      setMaterialPrincipal((p) => ({
                        ...p,
                        desconto: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Materiais adicionais */}
            {materiaisAdicionais.map((m, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Material adicional {idx + 1}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMaterialAdicional(idx)}
                    className="h-7 px-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Input
                  placeholder="Nome (opcional)"
                  value={m.nome}
                  onChange={(e) =>
                    updateMaterialAdicional(idx, "nome", e.target.value)
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={m.valor || ""}
                      onChange={(e) =>
                        updateMaterialAdicional(
                          idx,
                          "valor",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Desconto (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={m.desconto || ""}
                      onChange={(e) =>
                        updateMaterialAdicional(
                          idx,
                          "desconto",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            {materiaisAdicionais.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMaterialAdicional}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar material adicional
              </Button>
            )}

            <div className="space-y-2 pt-2 border-t border-border">
              <Label htmlFor="mo">Mão de obra (R$)</Label>
              <Input
                id="mo"
                type="number"
                min={0}
                step="0.01"
                value={maoObra || ""}
                onChange={(e) => setMaoObra(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Parâmetros financeiros */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Parâmetros Financeiros
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Margem de lucro (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={margemLucro}
                  onChange={(e) =>
                    setMargemLucro(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Imposto (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={aliquotaImposto}
                  onChange={(e) =>
                    setAliquotaImposto(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Comissão SN/À Vista (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={comissaoAvista}
                  onChange={(e) =>
                    setComissaoAvista(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Comissão parcelado (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={comissaoParcelado}
                  onChange={(e) =>
                    setComissaoParcelado(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Taxa cartão 6x (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={taxa6x}
                  onChange={(e) => setTaxa6x(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Taxa cartão 10x (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={taxa10x}
                  onChange={(e) => setTaxa10x(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !nomeServico.trim()}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              {editingId ? "Atualizar cálculo" : "Salvar cálculo"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                Novo
              </Button>
            )}
          </div>
        </div>

        {/* RESULTS */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {scenarios.map((s) => {
              const acrescimo =
                precoSN > 0 ? ((s.preco - precoSN) / precoSN) * 100 : 0;
              return (
                <motion.div
                  key={s.key}
                  layout
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    cardStyles[s.key]
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                      {s.label}
                    </span>
                    {s.key === "sn" && (
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                        Base
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold font-display tabular-nums">
                    {fmt(s.preco)}
                  </div>
                  {s.key !== "sn" && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      <span>{formatPct(acrescimo)} vs SN</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* DRE expansível */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm font-semibold mb-2">DRE por cenário</div>
            <Accordion type="multiple" className="w-full">
              {scenarios.map((s) => (
                <AccordionItem key={s.key} value={s.key}>
                  <AccordionTrigger className="text-sm hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-2">
                      <span>{s.label}</span>
                      <span
                        className={cn(
                          "tabular-nums font-medium",
                          s.resultadoLiquido > 0
                            ? "text-emerald-600 dark:text-emerald-500"
                            : "text-destructive"
                        )}
                      >
                        {fmt(s.resultadoLiquido)} ({s.margemReal.toFixed(1)}%)
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1.5 text-sm">
                      <DRELine label="Receita" value={fmt(s.preco)} bold />
                      <DRELine
                        label="(–) Mão de obra"
                        value={`-${fmt(maoObra)}`}
                      />
                      <DRELine
                        label="(–) Material"
                        value={`-${fmt(custoMaterialTotal)}`}
                      />
                      {s.comissaoPct > 0 && (
                        <DRELine
                          label={`(–) Comissão (${s.comissaoPct}%)`}
                          value={`-${fmt(s.comissaoValor)}`}
                        />
                      )}
                      {s.impostoPct > 0 && (
                        <DRELine
                          label={`(–) Imposto (${s.impostoPct}%)`}
                          value={`-${fmt(s.impostoValor)}`}
                        />
                      )}
                      {s.taxaCartaoPct > 0 && (
                        <DRELine
                          label={`(–) Taxa cartão (${s.taxaCartaoPct}%)`}
                          value={`-${fmt(s.taxaCartaoValor)}`}
                        />
                      )}
                      <div className="pt-2 mt-2 border-t border-border">
                        <DRELine
                          label="Resultado líquido"
                          value={`${fmt(s.resultadoLiquido)} (${s.margemReal.toFixed(1)}%)`}
                          bold
                          positive={s.resultadoLiquido > 0}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>

      {/* Lista de cálculos salvos */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Cálculos salvos</h4>
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {precificacoes.length === 0 && !isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            Nenhum cálculo salvo ainda. Preencha o formulário e clique em "Salvar cálculo".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {precificacoes.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "rounded-lg border p-3 space-y-2 transition-colors",
                  editingId === p.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-secondary/40"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {p.nome_servico}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEdit(p)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => deletePrecificacao(p.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  <PriceTag label="SN" value={fmt(Number(p.preco_sn))} />
                  <PriceTag label="À Vista" value={fmt(Number(p.preco_avista))} />
                  <PriceTag label="6x" value={fmt(Number(p.preco_6x))} />
                  <PriceTag label="10x" value={fmt(Number(p.preco_10x))} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DRELine({
  label,
  value,
  bold,
  positive,
}: {
  label: string;
  value: string;
  bold?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        bold && "font-semibold",
        positive && "text-emerald-600 dark:text-emerald-500"
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function PriceTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}