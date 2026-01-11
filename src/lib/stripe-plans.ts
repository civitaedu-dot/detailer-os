// Stripe plan configuration
export const STRIPE_PLANS = {
  base: {
    id: "base",
    name: "Base",
    priceId: "price_1SoPfjHwVdWmxZBgdAbGLRI1",
    productId: "prod_TlxaBncGC6ZRFS",
    price: 97,
    aiLimit: 5,
  },
  gestao: {
    id: "gestao",
    name: "Gestão",
    priceId: "price_1SoPfuHwVdWmxZBgpwe34JCh",
    productId: "prod_TlxbGKuCCztc85",
    price: 197,
    aiLimit: 10,
  },
  escala: {
    id: "escala",
    name: "Escala",
    priceId: "price_1SoPg9HwVdWmxZBg7YHhJxFF",
    productId: "prod_Tlxb8LLvPXjGS8",
    price: 397,
    aiLimit: -1, // Unlimited
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

export const getPlanByProductId = (productId: string) => {
  return Object.values(STRIPE_PLANS).find(plan => plan.productId === productId);
};
