import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_LIMITS: Record<string, number> = {
  base: 3,
  gestao: 10,
  escala: -1, // unlimited
};

const MODEL_BY_PLAN: Record<string, string> = {
  base: "google/gemini-2.5-flash-lite",
  gestao: "google/gemini-3-flash-preview",
  escala: "google/gemini-2.5-pro",
};

function getSystemPrompt(plan: string, userData: any): string {
  const baseContext = `Você é o Sócio IA, um consultor estratégico especializado em estética automotiva e gestão de negócios. 
Você tem acesso aos dados reais do negócio do usuário e deve usá-los para fundamentar suas respostas.
Sempre responda em português brasileiro. Seja profissional mas acessível.

DADOS DO NEGÓCIO DO USUÁRIO:
${JSON.stringify(userData, null, 2)}`;

  if (plan === "base") {
    return `${baseContext}

NÍVEL DE RESPOSTA: BÁSICO
- Responda de forma objetiva e direta
- Foque em dicas práticas e simples
- Não faça análises aprofundadas ou comparativos mensais
- Máximo 3-4 parágrafos por resposta`;
  }

  if (plan === "gestao") {
    return `${baseContext}

NÍVEL DE RESPOSTA: ANALÍTICO
- Cruze dados do sistema para gerar insights
- Analise tendências e padrões nos dados
- Sugira melhorias baseadas nos números
- Faça comparações quando possível
- Responda com profundidade moderada`;
  }

  // escala
  return `${baseContext}

NÍVEL DE RESPOSTA: ESTRATÉGICO PROFUNDO
- Atue como um sócio estratégico do negócio
- Faça análises completas com cruzamento de todos os dados disponíveis
- Compare períodos, identifique tendências e projeções
- Sugira otimizações detalhadas de custos, precificação e operação
- Proponha metas e estratégias de crescimento
- Use tabelas e formatação quando útil
- Seja abrangente e aprofundado nas análises`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = profile.plan || "base";
    const limit = PLAN_LIMITS[plan] ?? 3;

    // Check interaction limit (count messages this month)
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { count: monthlyCount } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .eq("role", "user");

    const used = monthlyCount || 0;

    if (limit !== -1 && used >= limit) {
      return new Response(
        JSON.stringify({
          error: "Limite de interações atingido",
          limit,
          used,
          upgrade_needed: true,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch user's business data for context
    const [
      { data: financialData },
      { data: fixedCosts },
      { data: variableCosts },
      { data: services },
      { data: appointments },
      { data: clients },
      { data: financialEntries },
    ] = await Promise.all([
      supabase.from("financial_data").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("fixed_costs").select("*").eq("user_id", user.id).eq("is_active", true),
      supabase.from("variable_costs").select("*").eq("user_id", user.id),
      supabase.from("services").select("*").eq("user_id", user.id).eq("is_active", true),
      supabase.from("appointments").select("*").eq("user_id", user.id).order("appointment_date", { ascending: false }).limit(50),
      supabase.from("clients").select("*").eq("user_id", user.id),
      supabase.from("financial_entries").select("*").eq("user_id", user.id).order("entry_date", { ascending: false }).limit(100),
    ]);

    const userData = {
      nome_negocio: profile.business_name || "Não informado",
      plano: plan,
      dados_financeiros: financialData,
      custos_fixos: fixedCosts,
      custos_variaveis: variableCosts,
      servicos: services,
      total_clientes: clients?.length || 0,
      agendamentos_recentes: appointments?.slice(0, 20),
      entradas_financeiras_recentes: financialEntries?.slice(0, 30),
      mes_atual: monthYear,
    };

    const systemPrompt = getSystemPrompt(plan, userData);
    const model = MODEL_BY_PLAN[plan] || "google/gemini-3-flash-preview";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save user message
    const userMessage = messages[messages.length - 1];
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      content: userMessage.content,
      month_year: monthYear,
    });

    // Call AI with streaming
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      return new Response(JSON.stringify({ error: "Erro ao processar sua mensagem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // We need to collect the full response to save it, while also streaming
    // Use TransformStream to tee the response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = aiResponse.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Parse SSE to collect content
          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line.slice(6).trim() !== "[DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullContent += content;
              } catch { /* ignore parse errors */ }
            }
          }
          
          await writer.write(value);
        }
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        // Save assistant response
        if (fullContent) {
          const serviceClient = createClient(
            supabaseUrl,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          await serviceClient.from("chat_messages").insert({
            user_id: user.id,
            role: "assistant",
            content: fullContent,
            month_year: monthYear,
          });
        }
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("socio-ia-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
