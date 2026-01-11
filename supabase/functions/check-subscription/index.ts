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

// Mapping of Stripe product IDs to plan details
const PLAN_MAP: Record<string, { plan: string; aiLimit: number }> = {
  "prod_TlxaBncGC6ZRFS": { plan: "base", aiLimit: 5 },
  "prod_TlxbGKuCCztc85": { plan: "gestao", aiLimit: 10 },
  "prod_Tlxb8LLvPXjGS8": { plan: "escala", aiLimit: -1 }, // -1 = unlimited
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    logStep("Environment verified");

    // Initialize Supabase with service role key
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }
    logStep("Authorization header found");

    // Authenticate user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      logStep("Authentication error", { error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user has a profile
    const { data: existingProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      logStep("Profile fetch error", { error: profileError.message });
    }

    if (!existingProfile) {
      // Create profile if it doesn't exist
      logStep("No profile found, creating one");
      const { error: insertError } = await supabaseClient
        .from("profiles")
        .insert({
          user_id: user.id,
          name: user.user_metadata?.name || "Usuário",
          plan: "none",
          plan_status: "inactive",
        });
      
      if (insertError) {
        logStep("Profile insert error", { error: insertError.message });
      }
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer in Stripe by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, updating profile to inactive");
      
      // Update profile to inactive
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ 
          plan: "none", 
          plan_status: "inactive",
          stripe_customer_id: null,
          stripe_subscription_id: null,
          ai_interactions_limit: 0,
        })
        .eq("user_id", user.id);

      if (updateError) {
        logStep("Profile update error", { error: updateError.message });
      }

      return new Response(JSON.stringify({ 
        subscribed: false,
        plan: "none",
        plan_status: "inactive",
        ai_limit: 0,
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // List active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    logStep("Subscriptions fetched", { count: subscriptions.data.length });

    const hasActiveSub = subscriptions.data.length > 0;
    let plan = "none";
    let aiLimit = 0;
    let subscriptionEnd: string | null = null;
    let subscriptionId: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionId = subscription.id;
      
      // Safely handle current_period_end
      if (subscription.current_period_end) {
        try {
          const endTimestamp = subscription.current_period_end * 1000;
          subscriptionEnd = new Date(endTimestamp).toISOString();
        } catch (dateError) {
          logStep("Date parsing error", { 
            current_period_end: subscription.current_period_end,
            error: String(dateError)
          });
          subscriptionEnd = null;
        }
      }
      
      // Get product ID from subscription items
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
      
      logStep("Active subscription found", { 
        subscriptionId, 
        plan, 
        aiLimit,
        endDate: subscriptionEnd 
      });

      // Update profile with subscription info
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ 
          plan,
          plan_status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          ai_interactions_limit: aiLimit,
        })
        .eq("user_id", user.id);

      if (updateError) {
        logStep("Profile update error", { error: updateError.message });
      } else {
        logStep("Profile updated successfully", { plan, status: "active" });
      }
    } else {
      logStep("No active subscription found");
      
      // Update profile to inactive but keep customer ID
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ 
          plan: "none", 
          plan_status: "inactive",
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          ai_interactions_limit: 0,
        })
        .eq("user_id", user.id);

      if (updateError) {
        logStep("Profile update error", { error: updateError.message });
      }
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
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
