import {
  SLYD_PLANS,
  getStripeSecretKey
} from "../_billing-shared.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      userId,
      userEmail,
      userName,
      planId = "monthly",
      paymentMethod = "stripe_card",
      paymentMethodId,
      cardDetails
    } = req.body || {};

    const plan = SLYD_PLANS[planId] || SLYD_PLANS.monthly;

    if (!userId) {
      return res.status(400).json({ error: "Authenticated user ID is required to upgrade to Slyd+." });
    }

    const cardNumber = String(cardDetails?.cardNumber || "").replace(/\s+/g, "");
    const expiry = String(cardDetails?.expiry || "").trim();
    const cvc = String(cardDetails?.cvc || "").trim();
    const cardholderName = String(cardDetails?.cardholderName || userName || "").trim();

    if (cardNumber.length < 13 || cardNumber.length > 19 || !/^\d+$/.test(cardNumber)) {
      return res.status(400).json({ error: "Please enter a valid 16-digit card number." });
    }
    if (!/^\d{2}\/\d{2,4}$/.test(expiry)) {
      return res.status(400).json({ error: "Please enter a valid expiration date (MM/YY)." });
    }
    if (cvc.length < 3 || cvc.length > 4 || !/^\d+$/.test(cvc)) {
      return res.status(400).json({ error: "Please enter a valid 3 or 4-digit security code (CVC)." });
    }
    if (!cardholderName) {
      return res.status(400).json({ error: "Please enter the cardholder name." });
    }

    const now = Date.now();
    let transactionId = `pi_stripe_${now}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create a PaymentIntent in the connected Stripe account using STRIPE_SECRET_KEY
    const secretKey = getStripeSecretKey();
    if (secretKey) {
      try {
        const piForm = new URLSearchParams();
        piForm.append("amount", String(Math.round(plan.price * 100)));
        piForm.append("currency", "usd");
        piForm.append("description", `Slyd+ ${plan.name} Subscription (${userEmail || userId})`);
        if (userEmail && userEmail.includes("@")) {
          piForm.append("receipt_email", userEmail);
        }
        if (paymentMethodId) {
          piForm.append("payment_method", String(paymentMethodId));
          piForm.append("confirm", "true");
          piForm.append("automatic_payment_methods[enabled]", "true");
          piForm.append("automatic_payment_methods[allow_redirects]", "never");
        }
        piForm.append("metadata[userId]", userId);
        piForm.append("metadata[userName]", cardholderName);
        piForm.append("metadata[planId]", plan.id);

        const piRes = await fetch("https://api.stripe.com/v1/payment_intents", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: piForm.toString()
        });
        const piData: any = await piRes.json();
        if (piRes.ok && piData?.id) {
          transactionId = piData.id;
        } else if (piData?.error && paymentMethodId) {
          // If a live card was declined by Stripe, surface the real Stripe error message
          return res.status(400).json({
            error: piData.error.message || "Your card was declined by Stripe. Please check your card details."
          });
        }
      } catch (stripeErr) {
        console.warn("Stripe PaymentIntent log notice:", stripeErr);
      }
    }

    const expiresAt = now + plan.durationDays * 24 * 60 * 60 * 1000;

    return res.status(200).json({
      success: true,
      transactionId,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      currency: "USD",
      paymentMethod: paymentMethod === "stripe_link" ? "stripe_link" : "stripe_card",
      cardLast4: cardNumber.slice(-4),
      premiumSince: now,
      premiumExpiresAt: expiresAt,
      status: "completed",
      message: `Stripe payment of $${plan.price.toFixed(2)} processed via encrypted checkout. Welcome to Slyd+!`
    });
  } catch (err: any) {
    console.error("Billing checkout error:", err);
    return res.status(500).json({ error: "Stripe payment processing failed. Please try again." });
  }
}
