import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidatePersonal } from "@/hooks/usePersonalFinance";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Como está meu mês até agora?",
  "Gastei 85 no mercado hoje",
  "Onde posso cortar gastos?",
  "Consigo juntar 10 mil em 12 meses?",
];

export function PersonalAgent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const invalidate = useInvalidatePersonal();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("personal_chat_messages").select("role, content").order("created_at", { ascending: true }).limit(100)
      .then(({ data }) => setMessages((data ?? []).map((m) => ({ role: m.role as Msg["role"], content: m.content }))));
  }, [user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("pessoal-ia-chat", {
        body: { messages: next.slice(-20) },
      });
      if (error || !data?.reply) throw new Error(data?.error ?? error?.message ?? "Falha");
      setMessages([...next, { role: "assistant", content: data.reply }]);
      if (data.changed) invalidate(); // o agente registrou algo: atualiza o dashboard
    } catch (e) {
      setMessages(messages);
      toast({ title: "O assistente não respondeu", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    if (!user || !confirm("Apagar o histórico da conversa?")) return;
    await supabase.from("personal_chat_messages").delete().eq("user_id", user.id);
    setMessages([]);
  };

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-primary" />Assistente financeiro pessoal</div>
        {messages.length > 0 && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clear}><Trash2 className="h-4 w-4" /></Button>}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <p className="mb-1 font-display text-lg font-bold">Seu consultor financeiro pessoal</p>
            <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">
              Eu vejo seus lançamentos, orçamentos e metas. Posso analisar, projetar e também registrar gastos por você.
            </p>
            <div className="mx-auto grid max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" className="h-auto whitespace-normal py-2.5 text-left text-sm" onClick={() => send(s)}>{s}</Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-background"}`}>
              {m.role === "assistant"
                ? <div className="prose prose-sm max-w-none dark:prose-invert [&>ol]:mb-2 [&>p]:mb-2 [&>ul]:mb-2"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                : <p className="whitespace-pre-wrap">{m.content}</p>}
            </div>
          </div>
        ))}
        {loading && <div className="flex"><div className="rounded-2xl border border-border px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div></div>}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-2 border-t border-border p-3">
        <Textarea value={input} rows={1} disabled={loading} placeholder="Pergunte ou registre um gasto…"
          className="min-h-[44px] max-h-32 resize-none"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
        <Button size="icon" className="h-11 w-11 shrink-0" disabled={loading || !input.trim()} onClick={() => send(input)}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
