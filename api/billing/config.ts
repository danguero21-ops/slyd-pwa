import {
  SLYD_PLANS,
  getStripePublishableKey,
  getStripeSecretKey
} from "../_billing-shared.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secretKey = getStripeSecretKey();
  const publishableKey = getStripePublishableKey();
  const isLiveMode =
    secretKey.startsWith("sk_live_") || publishableKey.startsWith("pk_live_");

  return res.status(200).json({
    plans: Object.values(SLYD_PLANS),
    stripeConfigured: Boolean(secretKey && publishableKey),
    stripeMode: secretKey ? (isLiveMode ? "live" : "test") : "direct",
    stripePublishableKey: publishableKey,
    stripePaymentLink: process.env.VITE_STRIPE_PAYMENT_LINK || ""
  });
}
