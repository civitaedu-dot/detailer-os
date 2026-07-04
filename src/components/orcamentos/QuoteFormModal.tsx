import { useState, useEffect, useMemo } from "react";
import { toLocalDateString } from '@/lib/utils';
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronRight, ChevronLeft, FileText, User, List,
  Settings2, Eye, Download, Check, Loader2, Copy, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { QuoteItemsEditor } from "./QuoteItemsEditor";
import { QuotePDFPreview } from "./QuotePDFPreview";
import { type QuoteFormData, type QuoteItemFormData, type CompanySettings, calcQuoteTotals } from "@/hooks/useQuotes";
import type { Quote } from "@/hooks/useQuotes";
import type { Client } from "@/hooks/useClients";
import type { Service } from "@/hooks/useServices";
import { generateQuotePdf } from "@/lib/quotePdf";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { id: 1, label: "Identificação", icon: FileText },
  { id: 2, label: "Cliente", icon: User },
  { id: 3, label: "Itens", icon: List },
  { id: 4, label: "Condições", icon: Settings2 },
  { id: 5, label: "Revisão & PDF", icon: Eye },
];

const TEMPLATE_OPTIONS = [
  { value: "modern", label: "Moderno", desc: "Cabeçalho colorido, visual contemporâneo" },
  { value: "classic", label: "Clássico", desc: "Layout formal com linhas e tipografia tradicional" },
  { value: "minimal", label: "Minimalista", desc: "Clean, sem excessos, foco no conteúdo" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: QuoteFormData) => Promise<Quote | null>;
  clients: Client[];
  services: Service[];
  settings: CompanySettings | null;
  initialData?: Quote | null;
  nextQuoteNumber: string;
  isSaving: boolean;
}

const today = () => toLocalDateString(new Date());
const in30days = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return toLocalDateString(d);
};

export const QuoteFormModal = ({
  isOpen, onClose, onSave, clients, services, settings,
  initialData, nextQuoteNumber, isSaving,
}: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);

  // Form state
  const [quoteNumber, setQuoteNumber] = useState(nextQuoteNumber);
  const [title, setTitle] = useState("");
  const [createdDate, setCreatedDate] = useState(today());
  const [expiryDate, setExpiryDate] = useState(in30days());

  // Client
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientDocument, setClientDocument] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Items
  const [items, setItems] = useState<QuoteItemFormData[]>([]);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxType, setTaxType] = useState("");
  const [taxPercentage, setTaxPercentage] = useState(0);

  // Conditions
  const [paymentConditions, setPaymentConditions] = useState("");
  const [deliveryDeadline, setDeliveryDeadline] = useState("");
  const [observations, setObservations] = useState("");
  const [termsConditions, setTermsConditions] = useState("");

  // Template
  const [template, setTemplate] = useState<"modern" | "classic" | "minimal">("modern");

  // Load initial data
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setQuoteNumber(initialData.quote_number);
      setTitle(initialData.title || "");
      setCreatedDate(initialData.created_date);
      setExpiryDate(initialData.expiry_date || in30days());
      setSelectedClientId(initialData.client_id);
      setClientName(initialData.client_name);
      setClientCompany(initialData.client_company || "");
      setClientEmail(initialData.client_email || "");
      setClientPhone(initialData.client_phone || "");
      setClientDocument(initialData.client_document || "");
      setClientAddress(initialData.client_address || "");
      setItems((initialData.items || []).map(i => ({
        id: i.id,
        service_id: i.service_id,
        sort_order: i.sort_order,
        name: i.name,
        description: i.description || "",
        unit: i.unit,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_percentage: i.discount_percentage,
      })));
      setDiscountType(initialData.discount_type);
      setDiscountValue(initialData.discount_value);
      setTaxType(initialData.tax_type || "");
      setTaxPercentage(initialData.tax_percentage);
      setPaymentConditions(initialData.payment_conditions || "");
      setDeliveryDeadline(initialData.delivery_deadline || "");
      setObservations(initialData.observations || "");
      setTermsConditions(initialData.terms_conditions || "");
      setTemplate(initialData.template);
    } else {
      setQuoteNumber(nextQuoteNumber);
      setTitle(""); setCreatedDate(today()); setExpiryDate(in30days());
      setSelectedClientId(null); setClientName(""); setClientCompany("");
      setClientEmail(""); setClientPhone(""); setClientDocument(""); setClientAddress("");
      setItems([]); setDiscountType("percentage"); setDiscountValue(0);
      setTaxType(""); setTaxPercentage(0); setPaymentConditions("");
      setDeliveryDeadline(""); setObservations(""); setTermsConditions("");
      setTemplate("modern");
    }
    setStep(1);
  }, [isOpen, initialData, nextQuoteNumber]);

  const totals = useMemo(() =>
    calcQuoteTotals({ items, discount_type: discountType, discount_value: discountValue, tax_percentage: taxPercentage }),
    [items, discountType, discountValue, taxPercentage]
  );

  const filteredClients = useMemo(() =>
    clients.filter(c =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.phone || "").includes(clientSearch)
    ).slice(0, 8),
    [clients, clientSearch]
  );

  const selectClient = (client: Client) => {
    setSelectedClientId(client.id);
    setClientName(client.name);
    setClientPhone(client.phone || "");
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const buildFormData = (): QuoteFormData => ({
    quote_number: quoteNumber,
    title: title || undefined,
    client_id: selectedClientId,
    client_name: clientName,
    client_company: clientCompany || undefined,
    client_email: clientEmail || undefined,
    client_phone: clientPhone || undefined,
    client_document: clientDocument || undefined,
    client_address: clientAddress || undefined,
    status: "draft",
    created_date: createdDate,
    expiry_date: expiryDate || undefined,
    discount_type: discountType,
    discount_value: discountValue,
    tax_type: taxType || undefined,
    tax_percentage: taxPercentage,
    payment_conditions: paymentConditions || undefined,
    delivery_deadline: deliveryDeadline || undefined,
    observations: observations || undefined,
    terms_conditions: termsConditions || undefined,
    template,
    items,
  });

  const handleSave = async () => {
    if (!clientName.trim()) { toast({ title: "Informe o nome do cliente", variant: "destructive" }); setStep(2); return; }
    const result = await onSave(buildFormData());
    if (result) onClose();
  };

  const buildQuoteObject = () => {
    const baseItems = items.map((item, i) => {
      const base = item.quantity * item.unit_price;
      const sub = base - base * ((item.discount_percentage || 0) / 100);
      return {
        id: String(i),
        quote_id: "",
        user_id: "",
        service_id: item.service_id || null,
        sort_order: i,
        name: item.name,
        description: item.description || null,
        unit: item.unit || "un",
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage || 0,
        subtotal: sub,
        created_at: "",
        updated_at: "",
      };
    });
    return {
      id: initialData?.id || "",
      user_id: "",
      quote_number: quoteNumber,
      title: title || null,
      client_id: selectedClientId || null,
      client_name: clientName,
      client_company: clientCompany || null,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      client_document: clientDocument || null,
      client_address: clientAddress || null,
      status: "draft" as const,
      created_date: createdDate,
      expiry_date: expiryDate || null,
      subtotal: totals.subtotal,
      total_item_discounts: totals.totalItemDiscounts,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: totals.discountAmount,
      tax_type: taxType || null,
      tax_percentage: taxPercentage,
      tax_amount: totals.taxAmount,
      total: totals.total,
      payment_conditions: paymentConditions || null,
      delivery_deadline: deliveryDeadline || null,
      observations: observations || null,
      terms_conditions: termsConditions || null,
      internal_notes: null,
      template,
      converted_to_appointment: false,
      converted_to_entry: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: baseItems,
    };
  };

  const handleGeneratePDF = () => {
    try {
      const quoteForPdf = buildQuoteObject();
      generateQuotePdf(quoteForPdf, settings, template);
      toast({
        title: "PDF gerado!",
        description:
          /iPad|iPhone|iPod/.test(navigator.userAgent)
            ? "O PDF abriu em nova aba. Toque em Compartilhar para salvar ou enviar."
            : "O download foi iniciado.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao gerar PDF",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/orcamentos/${initialData?.id || "preview"}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copiado!", description: "Compartilhe com seu cliente." });
  };

  const canNext = () => {
    if (step === 1) return quoteNumber.trim().length > 0;
    if (step === 2) return clientName.trim().length > 0;
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-black/60 backdrop-blur-sm">
      <div className="relative bg-background w-full max-w-3xl mx-auto flex flex-col shadow-2xl overflow-hidden sm:my-4 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50 flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-lg">
              {initialData ? "Editar Orçamento" : "Novo Orçamento"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {STEPS[step - 1].label} — Etapa {step} de {STEPS.length}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 px-5 py-3 border-b border-border bg-muted/30 flex-shrink-0 overflow-x-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => isDone && setStep(s.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${isActive ? "bg-primary text-primary-foreground" : isDone ? "text-primary hover:bg-primary/10" : "text-muted-foreground"}`}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5 flex-shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Identification */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Número do Orçamento *</Label>
                      <Input
                        value={quoteNumber}
                        onChange={e => setQuoteNumber(e.target.value)}
                        className="bg-card border-border font-mono"
                        placeholder="ORC-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Template Visual</Label>
                      <Select value={template} onValueChange={v => setTemplate(v as typeof template)}>
                        <SelectTrigger className="bg-card border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_OPTIONS.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              <div>
                                <div className="font-medium">{t.label}</div>
                                <div className="text-xs text-muted-foreground">{t.desc}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Título / Descrição resumida</Label>
                    <Input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="bg-card border-border"
                      placeholder="ex: Higienização completa + Polimento"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Criação</Label>
                      <Input
                        type="date"
                        value={createdDate}
                        onChange={e => setCreatedDate(e.target.value)}
                        className="bg-card border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Validade</Label>
                      <Input
                        type="date"
                        value={expiryDate}
                        onChange={e => setExpiryDate(e.target.value)}
                        className="bg-card border-border"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Client */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2 relative">
                    <Label>Buscar cliente cadastrado</Label>
                    <Input
                      value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                      onFocus={() => setShowClientDropdown(true)}
                      className="bg-card border-border"
                      placeholder="Digite o nome do cliente..."
                    />
                    {showClientDropdown && filteredClients.length > 0 && (
                      <Card className="absolute z-50 top-full left-0 right-0 shadow-lg border-border bg-popover mt-1">
                        <CardContent className="p-2 max-h-44 overflow-y-auto space-y-0.5">
                          {filteredClients.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => selectClient(c)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-sm transition-colors"
                            >
                              <div className="font-medium">{c.name}</div>
                              <div className="text-xs text-muted-foreground">{c.phone}</div>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-x-0 -top-1 flex items-center justify-center">
                      <span className="bg-background px-2 text-xs text-muted-foreground">ou preencha manualmente</span>
                    </div>
                    <div className="border border-dashed border-border rounded-xl p-4 pt-6 space-y-3 mt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Nome completo *</Label>
                          <Input value={clientName} onChange={e => setClientName(e.target.value)} className="bg-card border-border" placeholder="Nome do cliente" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Empresa / Fantasia</Label>
                          <Input value={clientCompany} onChange={e => setClientCompany(e.target.value)} className="bg-card border-border" placeholder="Nome da empresa" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">CPF / CNPJ</Label>
                          <Input value={clientDocument} onChange={e => setClientDocument(e.target.value)} className="bg-card border-border" placeholder="000.000.000-00" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Telefone</Label>
                          <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} inputMode="tel" className="bg-card border-border" placeholder="(11) 99999-9999" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">E-mail</Label>
                          <Input value={clientEmail} onChange={e => setClientEmail(e.target.value)} type="email" className="bg-card border-border" placeholder="email@exemplo.com" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Endereço</Label>
                          <Input value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="bg-card border-border" placeholder="Rua, número, cidade" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Items */}
              {step === 3 && (
                <QuoteItemsEditor
                  items={items}
                  services={services}
                  discountType={discountType}
                  discountValue={discountValue}
                  taxType={taxType}
                  taxPercentage={taxPercentage}
                  totals={totals}
                  onItemsChange={setItems}
                  onDiscountTypeChange={setDiscountType}
                  onDiscountValueChange={setDiscountValue}
                  onTaxTypeChange={setTaxType}
                  onTaxPercentageChange={setTaxPercentage}
                />
              )}

              {/* Step 4: Conditions */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Condições de Pagamento</Label>
                    <Textarea
                      value={paymentConditions}
                      onChange={e => setPaymentConditions(e.target.value)}
                      className="bg-card border-border min-h-[80px]"
                      placeholder="ex: 50% na aprovação, 50% na entrega. Pix ou cartão de crédito."
                    />
                    <div className="flex gap-2 flex-wrap">
                      {["À vista com 5% desconto", "50% entrada + 50% na entrega", "Parcelado em até 3x"].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPaymentConditions(t)}
                          className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border hover:bg-secondary/80 transition-colors"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Prazo de Entrega / Execução</Label>
                    <Input
                      value={deliveryDeadline}
                      onChange={e => setDeliveryDeadline(e.target.value)}
                      className="bg-card border-border"
                      placeholder="ex: 1 dia útil após aprovação"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Observações (visíveis no PDF)</Label>
                    <Textarea
                      value={observations}
                      onChange={e => setObservations(e.target.value)}
                      className="bg-card border-border min-h-[80px]"
                      placeholder="Informações adicionais, instruções ou agradecimentos..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Termos e Condições</Label>
                    <Textarea
                      value={termsConditions}
                      onChange={e => setTermsConditions(e.target.value)}
                      className="bg-card border-border min-h-[100px]"
                      placeholder="Escreva os termos e condições do seu orçamento..."
                    />
                    <div className="flex gap-2 flex-wrap">
                      {[
                        "Orçamento válido por 30 dias. Valores sujeitos a alteração após vencimento.",
                        "Serviços realizados somente após aprovação formal e pagamento da entrada.",
                      ].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTermsConditions(prev => prev ? `${prev}\n${t}` : t)}
                          className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border hover:bg-secondary/80 transition-colors text-left"
                        >
                          + Adicionar modelo
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Review & PDF */}
              {step === 5 && (
                <div className="space-y-4">
                  {/* Template selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPLATE_OPTIONS.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTemplate(t.value as typeof template)}
                        className={`p-3 rounded-xl border text-left transition-all ${template === t.value ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
                      >
                        <div className="text-sm font-medium">{t.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                        {template === t.value && <Check className="w-3.5 h-3.5 text-primary mt-1.5" />}
                      </button>
                    ))}
                  </div>

                  {/* Preview */}
                  <QuotePDFPreview
                    quote={buildQuoteObject()}
                    settings={settings}
                    template={template}
                  />

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" onClick={handleGeneratePDF} className="gap-2 bg-gradient-primary text-primary-foreground">
                      <Download className="w-4 h-4" />
                      Baixar PDF
                    </Button>
                    {initialData && (
                      <Button type="button" variant="outline" onClick={handleCopyLink} className="gap-2">
                        {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copiado!" : "Copiar link"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-card/50 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "Cancelar" : "Anterior"}
          </Button>

          {step < STEPS.length ? (
            <Button
              onClick={() => canNext() && setStep(step + 1)}
              disabled={!canNext()}
              className="gap-2"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 bg-gradient-primary text-primary-foreground"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isSaving ? "Salvando..." : "Salvar Orçamento"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
