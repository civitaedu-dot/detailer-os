import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  Upload,
  Palette,
  FileText,
  Save,
  Loader2,
  X,
  LogOut,
  Settings,
  Eye,
  Phone,
  Mail,
  Globe,
  MapPin,
  Hash,
} from "lucide-react";
import logo from "@/assets/logo.jpeg";
const COLOR_PRESETS = [
  { label: "Verde Padrão", value: "#22c55e" },
  { label: "Azul Profissional", value: "#3b82f6" },
  { label: "Índigo", value: "#6366f1" },
  { label: "Violeta", value: "#8b5cf6" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Laranja", value: "#f97316" },
  { label: "Âmbar", value: "#f59e0b" },
  { label: "Ciano", value: "#06b6d4" },
  { label: "Cinza Ardósia", value: "#64748b" },
  { label: "Preto", value: "#1e293b" },
];

type CompanyForm = {
  business_name: string;
  trade_name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  primary_color: string;
  closing_message: string;
  logo_url: string;
};

const INITIAL_FORM: CompanyForm = {
  business_name: "",
  trade_name: "",
  cnpj: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  primary_color: "#22c55e",
  closing_message: "Agradecemos a oportunidade e aguardamos seu retorno.",
  logo_url: "",
};

const ConfiguracaoEmpresa = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CompanyForm>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("company_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setExistingId(data.id);
        setForm({
          business_name: data.business_name || "",
          trade_name: data.trade_name || "",
          cnpj: data.cnpj || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
          primary_color: data.primary_color || "#22c55e",
          closing_message: data.closing_message || "Agradecemos a oportunidade e aguardamos seu retorno.",
          logo_url: data.logo_url || "",
        });
        if (data.logo_url) setLogoPreview(data.logo_url);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, [user]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O logo deve ter no máximo 2MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoPreview(result);
      setForm((f) => ({ ...f, logo_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview("");
    setForm((f) => ({ ...f, logo_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatCNPJ = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 14);
    return nums
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, cnpj: formatCNPJ(e.target.value) }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const payload = { ...form, user_id: user.id, updated_at: new Date().toISOString() };
      let error;
      if (existingId) {
        ({ error } = await supabase.from("company_settings").update(payload).eq("id", existingId));
      } else {
        const res = await supabase.from("company_settings").insert(payload).select().single();
        error = res.error;
        if (res.data) setExistingId(res.data.id);
      }
      if (error) throw error;
      toast({ title: "Configurações salvas!", description: "Os dados da empresa foram atualizados com sucesso." });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  const displayName = form.trade_name || form.business_name || "Minha Empresa";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Configurações da Empresa</h1>
              <p className="text-muted-foreground text-sm">Personalize os dados que aparecem nos PDFs de orçamento</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Identity */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      Identidade da Empresa
                    </CardTitle>
                    <CardDescription>Razão social, nome fantasia e CNPJ</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="business_name">Razão Social</Label>
                        <Input
                          id="business_name"
                          placeholder="Ex: Empresa LTDA"
                          value={form.business_name}
                          onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                          maxLength={120}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trade_name">Nome Fantasia</Label>
                        <Input
                          id="trade_name"
                          placeholder="Ex: Minha Empresa"
                          value={form.trade_name}
                          onChange={(e) => setForm((f) => ({ ...f, trade_name: e.target.value }))}
                          maxLength={120}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj" className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" />
                        CNPJ
                      </Label>
                      <Input
                        id="cnpj"
                        placeholder="00.000.000/0000-00"
                        value={form.cnpj}
                        onChange={handleCNPJChange}
                        maxLength={18}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Contact */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      Contato e Endereço
                    </CardTitle>
                    <CardDescription>Informações que aparecem no cabeçalho do PDF</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address" className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Endereço Completo
                      </Label>
                      <Input
                        id="address"
                        placeholder="Rua, número, bairro, cidade, estado"
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        maxLength={200}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          Telefone / WhatsApp
                        </Label>
                        <Input
                          id="phone"
                          placeholder="(00) 00000-0000"
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                          maxLength={20}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          E-mail
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="contato@empresa.com"
                          value={form.email}
                          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          maxLength={100}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website" className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        Site
                      </Label>
                      <Input
                        id="website"
                        placeholder="https://www.empresa.com"
                        value={form.website}
                        onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                        maxLength={100}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Closing message */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Mensagem de Encerramento
                    </CardTitle>
                    <CardDescription>Texto exibido no rodapé dos PDFs de orçamento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Ex: Agradecemos a oportunidade e aguardamos seu retorno."
                      value={form.closing_message}
                      onChange={(e) => setForm((f) => ({ ...f, closing_message: e.target.value }))}
                      className="resize-none"
                      rows={3}
                      maxLength={300}
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                      {form.closing_message.length}/300 caracteres
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right column: logo + color + preview */}
            <div className="space-y-6">
              {/* Logo */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card className="border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Upload className="w-4 h-4 text-primary" />
                      Logotipo
                    </CardTitle>
                    <CardDescription>PNG, JPG ou JPEG — máx. 2MB</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    {logoPreview ? (
                      <div className="relative group">
                        <div className="w-full h-32 rounded-xl border-2 border-border bg-muted flex items-center justify-center overflow-hidden">
                          <img src={logoPreview} alt="Logo" className="max-h-28 max-w-full object-contain" />
                        </div>
                        <button
                          onClick={removeLogo}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Trocar logo
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 group"
                      >
                        <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          Clique para enviar
                        </span>
                      </button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Color */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" />
                      Cor Primária
                    </CardTitle>
                    <CardDescription>Usada no cabeçalho e totais do PDF</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl border-2 border-border shadow-sm flex-shrink-0"
                        style={{ backgroundColor: form.primary_color }}
                      />
                      <Input
                        type="color"
                        value={form.primary_color}
                        onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                        className="h-10 w-full cursor-pointer"
                      />
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          title={preset.label}
                          onClick={() => setForm((f) => ({ ...f, primary_color: preset.value }))}
                          className={`w-full aspect-square rounded-lg border-2 transition-transform hover:scale-110 ${
                            form.primary_color === preset.value ? "border-foreground scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: preset.value }}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* PDF Preview */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Card className="border-border overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      Prévia do Cabeçalho PDF
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div
                      className="p-4 rounded-b-xl"
                      style={{ backgroundColor: form.primary_color }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {logoPreview && (
                            <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden mb-2">
                              <img src={logoPreview} alt="Logo preview" className="max-h-12 max-w-full object-contain" />
                            </div>
                          )}
                          <p className="text-white font-bold text-sm truncate">{displayName}</p>
                          {form.cnpj && <p className="text-white/80 text-xs">CNPJ: {form.cnpj}</p>}
                          {form.address && <p className="text-white/80 text-xs truncate">{form.address}</p>}
                          {form.phone && <p className="text-white/80 text-xs">{form.phone}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-white font-bold text-sm">ORÇAMENTO</p>
                          <p className="text-white/80 text-xs">#001</p>
                        </div>
                      </div>
                    </div>
                    {form.closing_message && (
                      <div className="px-4 py-3 bg-muted/50 rounded-b-xl border-t border-border">
                        <p className="text-xs text-muted-foreground text-center italic">{form.closing_message}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Save button */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Button className="w-full" size="lg" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ConfiguracaoEmpresa;
