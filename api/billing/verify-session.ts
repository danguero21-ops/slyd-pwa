import {
  SLYD_PLANS,
  getStripeSecretKey
} from "../_billing-shared.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sessionId = String(req.query.session_id || "");
    const planId = String(req.query.plan || "monthly");
    const plan = SLYD_PLANS[planId] || SLYD_PLANS.monthly;
    const secretKey = getStripeSecretKey();

    if (sessionId && secretKey) {
      const stripeRes = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`
          }
        }
      );
      const sessionData: any = await stripeRes.json();
      if (stripeRes.ok) {
        if (
          sessionData.payment_status === "paid" ||
          sessionData.status === "complete"
        ) {
          const now = Date.now();
          const matchedPlan =
            SLYD_PLANS[sessionData.metadata?.planId || planId] || plan;
          return res.status(200).json({
            verified: true,
            transactionId:
              sessionData.subscription ||
              sessionData.payment_intent ||
              sessionData.id,
            planId: matchedPlan.id,
            amount: sessionData.amount_total
              ? sessionData.amount_total / 100
              : matchedPlan.price,
            paymentMethod: "stripe_link",
            premiumSince: now,
            premiumExpiresAt: now + matchedPlan.durationDays * 86400000
          });
        } else {
          return res.status(200).json({
            verified: false,
            status: sessionData.status || "open",
            paymentStatus: sessionData.payment_status || "unpaid"
          });
        }
      }
    }

    return res.status(200).json({
      verified: false,
      error: "Session not yet completed"
    });
  } catch (err: any) {
    console.error("Stripe session verification error:", err);
    return res
      .status(500)
      .json({ verified: false, error: "Could not verify Stripe session" });
  }
}
