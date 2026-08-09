import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Lock,
  User,
  Loader2,
  Phone,
  Building2,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { guardRateLimit } from "@/lib/rateLimit";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  BUSINESS_TYPES,
  EMPLOYEE_RANGES,
  OPERATING_TIME,
  SERVICE_OPTIONS,
  OnboardingData,
  savePendingOnboarding,
  saveOnboardingToProfile,
} from "@/lib/onboarding";
import { supabase } from "@/integrations/supabase/client";

const TOTAL_STEPS = 3;

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const parseNumber = (value: string): number | null => {
  const clean = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return clean === "" || Number.isNaN(n) ? null : n;
};

const brl = (n: number | null) =>
  n === null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Chip = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3.5 py-2.5 rounded-xl border text-sm transition-all text-left ${
      active
        ? "border-primary bg-primary/10 text-foreground font-medium"
        : "border-border bg-background/40 text-muted-foreground hover:border-primary/40"
    }`}
  >
    {children}
  </button>
);

const Field = ({
  id,
  label,
  icon: Icon,
  hint,
  children,
}: {
  id: string;
  label: string;
  icon?: React.ElementType;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm">
      {label}
    </Label>
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      )}
      {children}
    </div>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const Cadastro = () => {
  const { signUp } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  // Step 2
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [employees, setEmployees] = useState("");
  const [operatingTime, setOperatingTime] = useState("");
  const [businessType, setBusinessType] = useState("");
  // Step 3
  const [servicesPerMonth, setServicesPerMonth] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [mainServices, setMainServices] = useState<string[]>([]);
  const [otherServices, setOtherServices] = useState("");

  const onboarding: OnboardingData = useMemo(
    () => ({
      name: name.trim(),
      phone: phone.trim(),
      business_name: businessName.trim(),
      city: city.trim(),
      business_type: businessType,
      employees_count: employees,
      years_operating: operatingTime,
      monthly_services_avg: parseNumber(servicesPerMonth),
      monthly_revenue_estimate: parseNumber(monthlyRevenue),
      main_services: [
        ...mainServices,
        ...otherServices
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ],
    }),
    [
      name,
      phone,
      businessName,
      city,
      businessType,
      employees,
      operatingTime,
      servicesPerMonth,
      monthlyRevenue,
      mainServices,
      otherServices,
    ]
  );

  const validateStep1 = () => {
    if (!name.trim() || !email.trim() || !password) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome, e-mail e senha.", variant: "destructive" });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: "E-mail inválido", description: "Confira o e-mail informado.", variant: "destructive" });
      return false;
    }
    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "Use pelo menos 6 caracteres.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!businessName.trim()) {
      toast({ title: "Nome da empresa", description: "Informe o nome da sua estética.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleCreateAccount = async () => {
    setIsLoading(true);

    const limit = await guardRateLimit("auth_signup", { endpoint: "/cadastro" });
    if (!limit.allowed) {
      toast({ title: "Muitas solicitações", description: limit.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email.trim().toLowerCase(), password, name.trim());

    if (error) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    // Persist onboarding answers. If the session already exists (auto-confirm),
    // write straight to the profile; otherwise keep it pending until first login.
    savePendingOnboarding(onboarding);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      try {
        await saveOnboardingToProfile(session.user.id, onboarding);
      } catch {
        /* stays pending, applied on next session */
      }
      toast({ title: "Conta criada!", description: "Vamos configurar seu acesso." });
      // Redirect handled by auth state (→ /planos ou trial)
    } else {
      setEmailSent(true);
      toast({
        title: "Confirme seu e-mail",
        description: "Enviamos um link de confirmação para você ativar a conta.",
      });
    }

    setIsLoading(false);
  };

  const toggleService = (service: string) =>
    setMainServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );

  const progress = Math.min(step, TOTAL_STEPS);

  if (emailSent) {
    return (
      <AuthShell title="Falta só um passo" subtitle="Confirme seu e-mail para ativar sua conta">
        <div className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para <span className="text-foreground font-medium">{email}</span>.
            Ao confirmar, seus dados de cadastro serão aplicados automaticamente.
          </p>
          <Button asChild variant="hero" size="lg" className="w-full">
            <Link to="/login">Ir para o login</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      maxWidth="md"
      title={step > TOTAL_STEPS ? "Tudo pronto!" : "Crie sua conta"}
      subtitle={
        step > TOTAL_STEPS
          ? "Confira seus dados e comece a usar o DetailerOS"
          : "Leva menos de 2 minutos e já começa com teste grátis"
      }
      aside={
        step <= TOTAL_STEPS ? (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-medium text-foreground">Etapa {progress} de {TOTAL_STEPS}</span>
              <span>
                {step === 1 ? "Seus dados" : step === 2 ? "Sua empresa" : "Sua operação"}
              </span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < progress ? "bg-primary" : "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22 }}
          className="space-y-5"
        >
          {step === 1 && (
            <>
              <Field id="name" label="Nome completo" icon={User}>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="pl-10 h-12"
                  autoComplete="name"
                  maxLength={100}
                />
              </Field>

              <Field id="email" label="E-mail" icon={Mail}>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-10 h-12"
                  maxLength={255}
                />
              </Field>

              <Field id="phone" label="Telefone / WhatsApp" icon={Phone}>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="pl-10 h-12"
                />
              </Field>

              <Field id="password" label="Senha" icon={Lock} hint="Mínimo de 6 caracteres">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-12 h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field id="businessName" label="Nome da estética" icon={Building2}>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex.: Prime Detailing"
                  className="pl-10 h-12"
                  maxLength={100}
                />
              </Field>

              <Field id="city" label="Cidade" icon={MapPin}>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex.: São Paulo - SP"
                  className="pl-10 h-12"
                  maxLength={80}
                />
              </Field>

              <div className="space-y-2">
                <Label className="text-sm">Tipo de negócio</Label>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  {BUSINESS_TYPES.map((t) => (
                    <Chip key={t} active={businessType === t} onClick={() => setBusinessType(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Quantidade de funcionários</Label>
                <div className="flex flex-wrap gap-2">
                  {EMPLOYEE_RANGES.map((r) => (
                    <Chip key={r} active={employees === r} onClick={() => setEmployees(r)}>
                      {r}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Tempo de funcionamento</Label>
                <div className="flex flex-wrap gap-2">
                  {OPERATING_TIME.map((t) => (
                    <Chip key={t} active={operatingTime === t} onClick={() => setOperatingTime(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Opcional — usamos essas informações para personalizar seu dashboard, os cálculos
                  financeiros e as recomendações do Sócio IA.
                </p>
              </div>

              <Field id="servicesPerMonth" label="Serviços realizados por mês (média)">
                <Input
                  id="servicesPerMonth"
                  inputMode="numeric"
                  value={servicesPerMonth}
                  onChange={(e) => setServicesPerMonth(e.target.value)}
                  placeholder="Ex.: 60"
                  className="h-12"
                />
              </Field>

              <Field id="monthlyRevenue" label="Faturamento mensal aproximado (R$)">
                <Input
                  id="monthlyRevenue"
                  inputMode="decimal"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(e.target.value)}
                  placeholder="Ex.: 25000"
                  className="h-12"
                />
              </Field>

              <div className="space-y-2">
                <Label className="text-sm">Principais serviços oferecidos</Label>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  {SERVICE_OPTIONS.map((s) => (
                    <Chip key={s} active={mainServices.includes(s)} onClick={() => toggleService(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
                <Textarea
                  value={otherServices}
                  onChange={(e) => setOtherServices(e.target.value)}
                  placeholder="Outros serviços (separe por vírgula)"
                  className="mt-2 min-h-[70px]"
                  maxLength={300}
                />
              </div>
            </>
          )}

          {step > TOTAL_STEPS && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">Boas-vindas, {name.split(" ")[0]}!</span>{" "}
                  Revise os dados abaixo e crie sua conta para liberar o teste grátis.
                </p>
              </div>

              <div className="rounded-xl border border-border divide-y divide-border text-sm">
                {[
                  ["Nome", name],
                  ["E-mail", email],
                  ["WhatsApp", phone || "—"],
                  ["Empresa", businessName],
                  ["Cidade", city || "—"],
                  ["Tipo de negócio", businessType || "—"],
                  ["Funcionários", employees || "—"],
                  ["Tempo de mercado", operatingTime || "—"],
                  ["Serviços/mês", servicesPerMonth || "—"],
                  ["Faturamento", brl(parseNumber(monthlyRevenue))],
                  ["Principais serviços", onboarding.main_services.join(", ") || "—"],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex gap-3 px-4 py-2.5">
                    <span className="text-muted-foreground w-40 shrink-0">{label}</span>
                    <span className="text-foreground break-words min-w-0">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-1">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12 px-4"
                onClick={goBack}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            )}
            {step <= TOTAL_STEPS ? (
              <Button type="button" variant="hero" size="lg" className="flex-1 h-12" onClick={goNext}>
                {step === TOTAL_STEPS ? "Revisar cadastro" : "Continuar"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="hero"
                size="lg"
                className="flex-1 h-12"
                onClick={handleCreateAccount}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta e começar"
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-xs text-muted-foreground mt-5">
        Ao criar sua conta, você concorda com nossos{" "}
        <a href="#" className="text-primary hover:underline">Termos de Uso</a> e{" "}
        <a href="#" className="text-primary hover:underline">Política de Privacidade</a>
      </p>

      <p className="text-center text-sm text-muted-foreground mt-5 pt-5 border-t border-border">
        Já tem uma conta?{" "}
        <Link to="/login" className="text-primary hover:underline font-medium">
          Fazer login
        </Link>
      </p>
    </AuthShell>
  );
};

export default Cadastro;