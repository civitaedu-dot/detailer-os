// Stripe plan configuration
export const STRIPE_PLANS = {
  base: {
    id: "base",
    name: "Base",
    priceId: "price_1SqmoxQgltCrbsp3qLGG54YR",
    productId: "prod_ToPe3sO7yHoz7c",
    price: 97,
    aiLimit: 5,
  },
  gestao: {
    id: "gestao",
    name: "Gestão",
    priceId: "price_1SqmpHQgltCrbsp3NZyuA50m",
    productId: "prod_ToPe9qWJjk3yE2",
    price: 197,
    aiLimit: 10,
  },
  escala: {
    id: "escala",
    name: "Escala",
    priceId: "price_1SqmpRQgltCrbsp3hixy6H8b",
    productId: "prod_ToPeE6xN70O7B0",
    price: 297,
    aiLimit: -1, // Unlimited
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

export const getPlanByProductId = (productId: string) => {
  return Object.values(STRIPE_PLANS).find(plan => plan.productId === productId);
};
