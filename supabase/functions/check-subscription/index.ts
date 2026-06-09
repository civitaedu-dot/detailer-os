import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Plano único (LIVE) — apenas este price/product conta como assinatura ativa.
// Qualquer assinatura ativa em preços antigos é tratada como "inativa" para
// forçar a migração no próximo login (usuário será redirecionado a /planos).
const NEW_PRICE_ID = "price_1TgYc5QgltCrbsp3nkIKAUqS";
const NEW_PRODUCT_ID = "prod_UfuQAa62pMxeU7";
const NEW_PLAN_NAME = "refinada";
const AI_LIMIT_UNLIMITED = -1;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) throw new Error("Missing Supabase configuration");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Environment verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    // Auth client uses anon key + forwarded Authorization header to validate the user JWT
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // Service-role client for DB writes that bypass RLS
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user?.email) {
      logStep("No authenticated user", { error: userError?.message });
      return new Response(
        JSON.stringify({ subscribed: false, plan: "none", plan_status: "inactive" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Fetch current profile
    const { data: existingProfile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      logStep("No profile found, creating one");
      await supabaseClient.from("profiles").insert({
        user_id: user.id,
        name: user.user_metadata?.name || "Usuário",
        plan: "none",
        plan_status: "inactive",
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");

      // If user is on trial, DON'T overwrite to inactive — preserve trial status
      if (existingProfile?.plan_status === "trial") {
        const trialEnd = existingProfile.trial_end ? new Date(existingProfile.trial_end) : null;
        const isTrialActive = trialEnd && trialEnd > new Date();

        logStep("User is on trial", { trialEnd: existingProfile.trial_end, isActive: isTrialActive });

        if (!isTrialActive) {
          // Trial expired, no Stripe subscription → mark inactive
          await supabaseClient.from("profiles").update({
            plan_status: "inactive",
            plan: "none",
            ai_interactions_limit: 0,
          }).eq("user_id", user.id);

          return new Response(JSON.stringify({
            subscribed: false,
            plan: "none",
            plan_status: "inactive",
            ai_limit: 0,
            subscription_end: null,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
        }

        // Trial still active — return current trial info
        return new Response(JSON.stringify({
          subscribed: false,
          plan: NEW_PLAN_NAME,
          plan_status: "trial",
          ai_limit: AI_LIMIT_UNLIMITED,
          subscription_end: existingProfile.trial_end,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }

      // Not on trial and no Stripe customer → inactive
      await supabaseClient.from("profiles").update({
        plan: "none",
        plan_status: "inactive",
        stripe_customer_id: null,
        stripe_subscription_id: null,
        ai_interactions_limit: 0,
      }).eq("user_id", user.id);

      return new Response(JSON.stringify({
        subscribed: false,
        plan: "none",
        plan_status: "inactive",
        ai_limit: 0,
        subscription_end: null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    // Considera ativo APENAS se a assinatura usa o preço novo (R$49,99).
    // Assinantes legados (base/gestão/escala) são forçados a migrar.
    const matchingSub = subscriptions.data.find((sub) => {
      const priceItem = sub.items.data[0];
      if (!priceItem?.price) return false;
      if (priceItem.price.id === NEW_PRICE_ID) return true;
      const productId = typeof priceItem.price.product === 'string'
        ? priceItem.price.product
        : priceItem.price.product?.id;
      return productId === NEW_PRODUCT_ID;
    });

    const hasActiveSub = !!matchingSub;
    let plan = "none";
    let aiLimit = 0;
    let subscriptionEnd: string | null = null;
    let subscriptionId: string | null = null;

    if (matchingSub) {
      subscriptionId = matchingSub.id;
      if (matchingSub.current_period_end) {
        try {
          subscriptionEnd = new Date(matchingSub.current_period_end * 1000).toISOString();
        } catch { subscriptionEnd = null; }
      }
      plan = NEW_PLAN_NAME;
      aiLimit = AI_LIMIT_UNLIMITED;

      await supabaseClient.from("profiles").update({
        plan,
        plan_status: "active",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        ai_interactions_limit: aiLimit,
      }).eq("user_id", user.id);

      logStep("Profile updated to active (Plano Gestão Refinada)");
    } else {
      logStep("No active subscription found");

      if (subscriptions.data.length > 0) {
        logStep("Legacy subscription detected — forcing migration", {
          legacyCount: subscriptions.data.length,
        });
      }

      // Has Stripe customer but no active sub — check trial before overwriting
      if (existingProfile?.plan_status === "trial") {
        const trialEnd = existingProfile.trial_end ? new Date(existingProfile.trial_end) : null;
        const isTrialActive = trialEnd && trialEnd > new Date();

        if (isTrialActive) {
          // Keep trial status, just store the customer ID
          await supabaseClient.from("profiles").update({
            stripe_customer_id: customerId,
          }).eq("user_id", user.id);

          return new Response(JSON.stringify({
            subscribed: false,
            plan: NEW_PLAN_NAME,
            plan_status: "trial",
            ai_limit: AI_LIMIT_UNLIMITED,
            subscription_end: existingProfile.trial_end,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
        }
      }

      // No active sub, no active trial → inactive
      await supabaseClient.from("profiles").update({
        plan: "none",
        plan_status: "inactive",
        stripe_customer_id: customerId,
        stripe_subscription_id: null,
        ai_interactions_limit: 0,
      }).eq("user_id", user.id);
    }

    const response = {
      subscribed: hasActiveSub,
      plan,
      plan_status: hasActiveSub ? "active" : "inactive",
      ai_limit: aiLimit,
      subscription_end: subscriptionEnd,
    };

    logStep("Response prepared", response);
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({
      error: errorMessage,
      subscribed: false,
      plan: "none",
      plan_status: "inactive",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
