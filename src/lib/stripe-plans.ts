// Stripe plan configuration — single plan (LIVE)
export const STRIPE_PLANS = {
  refinada: {
    id: "refinada",
    name: "Plano Gestão Refinada",
    priceId: "price_1TgYc5QgltCrbsp3nkIKAUqS",
    productId: "prod_UfuQAa62pMxeU7",
    price: 49.99,
    aiLimit: -1, // Ilimitado
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

export const SINGLE_PLAN = STRIPE_PLANS.refinada;

export const getPlanByProductId = (productId: string) => {
  return Object.values(STRIPE_PLANS).find(plan => plan.productId === productId);
};
