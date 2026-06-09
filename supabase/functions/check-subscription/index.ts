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

// Updated to match LIVE Stripe product IDs from stripe-plans.ts
const PLAN_MAP: Record<string, { plan: string; aiLimit: number }> = {
  "prod_ToPe3sO7yHoz7c": { plan: "base", aiLimit: 5 },
  "prod_ToPe9qWJjk3yE2": { plan: "gestao", aiLimit: 10 },
  "prod_ToPeE6xN70O7B0": { plan: "escala", aiLimit: -1 },
};

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
          plan: existingProfile.plan || "gestao",
          plan_status: "trial",
          ai_limit: 10,
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

    const hasActiveSub = subscriptions.data.length > 0;
    let plan = "none";
    let aiLimit = 0;
    let subscriptionEnd: string | null = null;
    let subscriptionId: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionId = subscription.id;
      
      if (subscription.current_period_end) {
        try {
          subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        } catch { subscriptionEnd = null; }
      }
      
      const priceItem = subscription.items.data[0];
      if (priceItem?.price?.product) {
        const productId = typeof priceItem.price.product === 'string' 
          ? priceItem.price.product 
          : priceItem.price.product.id;
        
        const planInfo = PLAN_MAP[productId];
        if (planInfo) {
          plan = planInfo.plan;
          aiLimit = planInfo.aiLimit;
          logStep("Plan matched", { productId, plan, aiLimit });
        } else {
          logStep("Unknown product ID", { productId, knownProducts: Object.keys(PLAN_MAP) });
        }
      }

      // Update profile to active (overrides trial if present)
      await supabaseClient.from("profiles").update({
        plan,
        plan_status: "active",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        ai_interactions_limit: aiLimit,
      }).eq("user_id", user.id);

      logStep("Profile updated to active", { plan });
    } else {
      logStep("No active subscription found");

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
            plan: existingProfile.plan || "gestao",
            plan_status: "trial",
            ai_limit: 10,
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
