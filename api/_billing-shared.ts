export const DEFAULT_STRIPE_PUBLISHABLE_KEY = process.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

export const DEFAULT_STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

export function getStripeSecretKey(): string {
  return (process.env.STRIPE_SECRET_KEY || DEFAULT_STRIPE_SECRET_KEY).trim();
}

export function getStripePublishableKey(): string {
  return (
    process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    DEFAULT_STRIPE_PUBLISHABLE_KEY
  ).trim();
}

export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  intervalLabel: string;
  stripeInterval: "week" | "month" | "year";
  stripeIntervalCount: number;
}

export const SLYD_PLANS: Record<string, PlanConfig> = {
  weekly: {
    id: "weekly",
    name: "Slyd+ Weekly Pass",
    price: 9.99,
    durationDays: 7,
    intervalLabel: "/week",
    stripeInterval: "week",
    stripeIntervalCount: 1
  },
  monthly: {
    id: "monthly",
    name: "Slyd+ 1-Month Pass",
    price: 19.99,
    durationDays: 30,
    intervalLabel: "/month",
    stripeInterval: "month",
    stripeIntervalCount: 1
  },
  quarterly: {
    id: "quarterly",
    name: "Slyd+ 3-Month Pass",
    price: 49.99,
    durationDays: 90,
    intervalLabel: "/3 mos",
    stripeInterval: "month",
    stripeIntervalCount: 3
  },
  annual: {
    id: "annual",
    name: "Slyd+ 1-Year VIP",
    price: 99.99,
    durationDays: 365,
    intervalLabel: "/year",
    stripeInterval: "year",
    stripeIntervalCount: 1
  }
};
