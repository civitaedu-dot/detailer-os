import { useState, useEffect, useRef, useCallback } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Send,
  Loader2,
  LogOut,
  MessageSquare,
  Trash2,
  Shield,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpeg";
import ReactMarkdown from "react-markdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Msg = { role: "user" | "assistant"; content: string };

const PLAN_LIMITS: Record<string, number> = {
  base: 3,
  gestao: 10,
  escala: -1,
};

const SocioIA = () => {
  const { user, profile, session, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const plan = profile?.plan || "base";
  const limit = PLAN_LIMITS[plan] ?? 3;
  const isUnlimited = limit === -1;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - monthlyUsed);

  const getCurrentMonthYear = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  // Load chat history and count
  useEffect(() => {
    if (!user) return;
    const monthYear = getCurrentMonthYear();

    const loadData = async () => {
      setIsLoadingHistory(true);
      const [{ data: history }, { count }] = await Promise.all([
        supabase
          .from("chat_messages")
          .select("role, content, created_at")
          .eq("user_id", user.id)
          .eq("month_year", monthYear)
          .order("created_at", { ascending: true }),
        supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("month_year", monthYear)
          .eq("role", "user"),
      ]);

      if (history) {
        setMessages(history.map((m: any) => ({ role: m.role, content: m.content })));
      }
      setMonthlyUsed(count || 0);
      setIsLoadingHistory(false);
    };

    loadData();
  }, [user]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (!isUnlimited && remaining <= 0) {
      toast({
        title: "Limite atingido",
        description: "Você atingiu o limite de interações do seu plano. Faça upgrade para continuar.",
        variant: "destructive",
      });
      return;
    }

    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setMonthlyUsed((prev) => prev + 1);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socio-ia-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        if (errorData.upgrade_needed) {
          toast({
            title: "Limite de interações atingido",
            description: `Você usou todas as ${errorData.limit} interações do mês. Faça upgrade do seu plano para continuar.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro",
            description: errorData.error || "Erro ao processar mensagem",
            variant: "destructive",
          });
        }
        setMonthlyUsed((prev) => prev - 1);
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem. Tente novamente.",
        variant: "destructive",
      });
      setMonthlyUsed((prev) => prev - 1);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, session, isUnlimited, remaining, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    const monthYear = getCurrentMonthYear();
    await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", user.id)
      .eq("month_year", monthYear);
    setMessages([]);
    toast({ title: "Histórico limpo", description: "Suas mensagens deste mês foram removidas." });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={logo} alt="DetailerOS Logo" className="w-8 h-8 rounded-lg object-contain" />
              <span className="font-display font-semibold hidden sm:block">
                Detailer<span className="text-primary">OS</span>
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/dashboard">Dashboard</Link></Button>
            <Button variant="ghost" size="sm" asChild><Link to="/financeiro">Financeiro</Link></Button>
            <Button variant="ghost" size="sm" asChild><Link to="/agenda">Agenda</Link></Button>
            <Button variant="ghost" size="sm" asChild><Link to="/clientes">Clientes</Link></Button>
            <Button variant="ghost" size="sm" asChild><Link to="/servicos">Serviços</Link></Button>
            <Button variant="ghost" size="sm" asChild><Link to="/orcamentos">Orçamentos</Link></Button>
            <Button variant="default" size="sm" asChild>
              <Link to="/socio-ia">
                <Bot className="w-4 h-4 mr-1" />
                Sócio IA
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild><Link to="/configuracoes">Config.</Link></Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin" className="text-primary">
                  <Shield className="w-4 h-4 mr-1" />
                  Admin
                </Link>
              </Button>
            )}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                  <span className="text-xs font-semibold text-primary">
                    {profile?.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <span className="hidden sm:block">{profile?.name || "Usuário"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col container px-4 sm:px-6 py-4 max-w-4xl mx-auto w-full">
        {/* Info bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">Sócio IA</h1>
              <p className="text-xs text-muted-foreground">
                Consultor estratégico do seu negócio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {isUnlimited
                ? "∞ interações"
                : `${remaining} restante${remaining !== 1 ? "s" : ""}`}
            </Badge>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearHistory}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef as any}>
          <div className="space-y-4 pb-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-display text-xl font-bold mb-2">
                  Olá! Sou seu Sócio IA 🤖
                </h2>
                <p className="text-muted-foreground max-w-md text-sm">
                  Posso analisar seus dados financeiros, sugerir melhorias, ajudar com
                  precificação e estratégias para crescer seu negócio. Como posso ajudar?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
                  {[
                    "Como está meu faturamento este mês?",
                    "Analise meus custos fixos",
                    "Qual meu ticket médio?",
                    "Sugira melhorias para o negócio",
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      className="text-sm text-left h-auto py-3 px-4"
                      onClick={() => {
                        setInput(suggestion);
                        setTimeout(() => textareaRef.current?.focus(), 100);
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </motion.div>
            ) : (
              messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="pt-4 border-t border-border">
          {!isUnlimited && remaining <= 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Você atingiu o limite de {limit} interações deste mês.
              </p>
              <Button asChild>
                <Link to="/planos">Fazer upgrade do plano</Link>
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua pergunta..."
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="shrink-0 h-11 w-11"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocioIA;
