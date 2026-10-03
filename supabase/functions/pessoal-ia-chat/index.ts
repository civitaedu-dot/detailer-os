import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODEL = "google/gemini-2.5-pro";
const MAX_TOOL_ROUNDS = 4;

const EXPENSE_CATEGORIES = [
  "Moradia", "Mercado", "Alimentação fora", "Transporte", "Saúde", "Educação",
  "Lazer", "Assinaturas", "Compras", "Cartão/Dívidas", "Impostos", "Outros",
];
const INCOME_CATEGORIES = ["Salário", "Negócio", "Freelance", "Investimentos", "Outros"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TOOLS = [
  {
    type: "function",
    function: {
      name: "add_transaction",
      description: "Registra uma receita ou despesa pessoal. Use quando o usuário disser que gastou, pagou, recebeu ou ganhou algo.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["income", "expense"] },
          amount: { type: "number", description: "Valor em reais, positivo" },
          category: { type: "string", description: `Despesas: ${EXPENSE_CATEGORIES.join(", ")}. Receitas: ${INCOME_CATEGORIES.join(", ")}.` },
          description: { type: "string" },
          date: { type: "string", description: "yyyy-MM-dd. Se omitido, hoje." },
          is_paid: { type: "boolean", description: "false para conta futura/a pagar. Padrão true." },
        },
        required: ["type", "amount", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_budget",
      description: "Define ou altera o limite mensal de gasto de uma categoria de despesa.",
      parameters: {
        type: "object",
        properties: { category: { type: "string" }, monthly_limit: { type: "number" } },
        required: ["category", "monthly_limit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_goal",
      description: "Cria uma meta financeira (ex.: reserva de emergência, viagem).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          target_amount: { type: "number" },
          current_amount: { type: "number" },
          deadline: { type: "string", description: "yyyy-MM-dd, opcional" },
        },
        required: ["name", "target_amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_goal",
      description: "Soma um valor guardado ao progresso de uma meta existente.",
      parameters: {
        type: "object",
        properties: { goal_name: { type: "string" }, amount: { type: "number" } },
        required: ["goal_name", "amount"],
      },
    },
  },
];

// deno-lint-ignore no-explicit-any
type Db = any;

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isMoney = (n: unknown): n is number => typeof n === "number" && isFinite(n) && n > 0 && n < 1e9;

/** Executa uma ferramenta em nome do usuário. O cliente usa o JWT dele, então o RLS vale. */
async function runTool(db: Db, userId: string, name: string, args: Record<string, unknown>) {
  const today = new Date().toISOString().slice(0, 10);
  switch (name) {
    case "add_transaction": {
      const type = args.type;
      if ((type !== "income" && type !== "expense") || !isMoney(args.amount) || typeof args.category !== "string") {
        return { error: "Parâmetros inválidos" };
      }
      const valid = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
      const category = valid.includes(args.category) ? args.category : "Outros";
      const { error } = await db.from("personal_transactions").insert({
        user_id: userId, type, amount: args.amount, category,
        description: typeof args.description === "string" ? args.description.slice(0, 120) : "",
        tx_date: isDate(args.date) ? args.date : today,
        is_paid: args.is_paid !== false,
      });
      return error ? { error: error.message } : { ok: true, category };
    }
    case "set_budget": {
      if (typeof args.category !== "string" || !EXPENSE_CATEGORIES.includes(args.category) || !isMoney(args.monthly_limit)) {
        return { error: `Categoria inválida. Use uma de: ${EXPENSE_CATEGORIES.join(", ")}` };
      }
      const { error } = await db.from("personal_budgets")
        .upsert({ user_id: userId, category: args.category, monthly_limit: args.monthly_limit }, { onConflict: "user_id,category" });
      return error ? { error: error.message } : { ok: true };
    }
    case "create_goal": {
      if (typeof args.name !== "string" || !args.name.trim() || !isMoney(args.target_amount)) return { error: "Parâmetros inválidos" };
      const current = typeof args.current_amount === "number" && args.current_amount >= 0 ? args.current_amount : 0;
      const { error } = await db.from("personal_goals").insert({
        user_id: userId, name: args.name.trim().slice(0, 80), target_amount: args.target_amount,
        current_amount: current, deadline: isDate(args.deadline) ? args.deadline : null,
      });
      return error ? { error: error.message } : { ok: true };
    }
    case "add_to_goal": {
      if (typeof args.goal_name !== "string" || !isMoney(args.amount)) return { error: "Parâmetros inválidos" };
      const { data: goals } = await db.from("personal_goals").select("id, name, current_amount");
      const wanted = args.goal_name.toLowerCase();
      const goal = (goals ?? []).find((g: { name: string }) => g.name.toLowerCase().includes(wanted));
      if (!goal) return { error: "Meta não encontrada", metas: (goals ?? []).map((g: { name: string }) => g.name) };
      const { error } = await db.from("personal_goals")
        .update({ current_amount: Number(goal.current_amount) + args.amount }).eq("id", goal.id);
      return error ? { error: error.message } : { ok: true, meta: goal.name };
    }
    default:
      return { error: "Ferramenta desconhecida" };
  }
}

async function buildContext(db: Db) {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);
  const [{ data: txs }, { data: budgets }, { data: goals }] = await Promise.all([
    db.from("personal_transactions").select("*").gte("tx_date", since).order("tx_date", { ascending: false }).limit(2000),
    db.from("personal_budgets").select("category, monthly_limit"),
    db.from("personal_goals").select("name, target_amount, current_amount, deadline"),
  ]);

  // Agrega por mês para não estourar o contexto
  const months: Record<string, { receitas: number; despesas: number; por_categoria: Record<string, number>; a_pagar: number }> = {};
  for (const t of txs ?? []) {
    const k = String(t.tx_date).slice(0, 7);
    const m = (months[k] ??= { receitas: 0, despesas: 0, por_categoria: {}, a_pagar: 0 });
    const v = Number(t.amount);
    if (t.type === "income") { if (t.is_paid) m.receitas += v; }
    else {
      m.despesas += v;
      m.por_categoria[t.category] = (m.por_categoria[t.category] ?? 0) + v;
      if (!t.is_paid) m.a_pagar += v;
    }
  }
  return {
    hoje: now.toISOString().slice(0, 10),
    resumo_por_mes: months,
    orcamentos_mensais: budgets ?? [],
    metas: goals ?? [],
    contas_fixas_recorrentes: (txs ?? []).filter((t: { is_recurring: boolean }) => t.is_recurring).slice(0, 30)
      .map((t: Record<string, unknown>) => ({ descricao: t.description, categoria: t.category, valor: t.amount, tipo: t.type })),
    ultimos_lancamentos: (txs ?? []).slice(0, 40).map((t: Record<string, unknown>) =>
      ({ data: t.tx_date, tipo: t.type, valor: t.amount, categoria: t.category, descricao: t.description, pago: t.is_paid })),
  };
}

const systemPrompt = (ctx: unknown) => `Você é o assistente financeiro pessoal do usuário: um consultor direto, honesto e sem julgamento, que fala português brasileiro.
Você trabalha exclusivamente com as finanças pessoais dele (não com o caixa da empresa).

DADOS ATUAIS (valores em reais):
${JSON.stringify(ctx)}

REGRAS
- Baseie-se nos dados acima. Se faltar informação para responder (ex.: sem receitas cadastradas), diga o que falta em vez de inventar.
- Seja concreto: cite valores, categorias e meses. Prefira respostas curtas; use listas ou tabelas só quando ajudarem.
- Para projeções e metas, mostre a conta (quanto guardar por mês, em quantos meses).
- Use as ferramentas para registrar lançamentos, orçamentos e metas quando o usuário pedir ou relatar um gasto/ganho. Se o pedido for ambíguo (valor ou categoria incerta), pergunte antes de registrar. Depois de registrar, confirme em uma frase o que foi salvo.
- Nunca registre algo que o usuário não tenha dito. Você não apaga nem edita lançamentos; se ele pedir, oriente a usar a aba Lançamentos.
- Você dá orientação de organização financeira, não é consultoria de investimentos regulada: não recomende ativos específicos.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const db: Db = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return json({ error: "Não autorizado" }, 401);

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user" || typeof last.content !== "string" || !last.content.trim() || last.content.length > 4000) {
      return json({ error: "Mensagem inválida" }, 400);
    }
    // Só repassa role/content simples de user/assistant
    const history = messages.slice(-20)
      .filter((m: { role: string; content: unknown }) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    for (const rule of ["ai_chat", "ai_chat_burst"] as const) {
      const r = await enforceRateLimit({
        req, rule, identity: user.id, userId: user.id, userEmail: user.email ?? null, endpoint: "pessoal-ia-chat",
      });
      if (!r.allowed) return rateLimitResponse(r, corsHeaders);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "IA não configurada" }, 500);

    await db.from("personal_chat_messages").insert({ user_id: user.id, role: "user", content: last.content });

    const convo: Record<string, unknown>[] = [
      { role: "system", content: systemPrompt(await buildContext(db)) },
      ...history,
    ];

    let changed = false;
    let reply = "";
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_MODEL, messages: convo,
          // na última rodada força resposta em texto
          ...(round < MAX_TOOL_ROUNDS ? { tools: TOOLS } : {}),
        }),
      });
      if (!resp.ok) {
        if (resp.status === 429) return json({ error: "Muitas requisições. Tente em alguns segundos." }, 429);
        if (resp.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
        console.error("AI gateway error:", resp.status, await resp.text());
        return json({ error: "Erro ao processar sua mensagem" }, 500);
      }
      const msg = (await resp.json()).choices?.[0]?.message;
      if (!msg) return json({ error: "Resposta vazia da IA" }, 500);

      if (!msg.tool_calls?.length) { reply = msg.content ?? ""; break; }

      convo.push(msg);
      for (const call of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(call.function.arguments || "{}"); } catch { /* args inválidos viram erro abaixo */ }
        const result = await runTool(db, user.id, call.function.name, args);
        if ((result as { ok?: boolean }).ok) changed = true;
        convo.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    if (!reply) reply = changed ? "Pronto, registrei isso para você." : "Não consegui responder agora. Tente reformular.";
    await db.from("personal_chat_messages").insert({ user_id: user.id, role: "assistant", content: reply });
    return json({ reply, changed });
  } catch (e) {
    console.error("pessoal-ia-chat error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
