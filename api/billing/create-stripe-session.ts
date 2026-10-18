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
      originUrl
    } = req.body || {};

    const plan = SLYD_PLANS[planId] || SLYD_PLANS.monthly;
    if (!userId) {
      return res.status(400).json({ error: "Authenticated user ID is required to subscribe with Stripe." });
    }

    const secretKey = getStripeSecretKey();
    const paymentLink = process.env.VITE_STRIPE_PAYMENT_LINK || "";

    if (secretKey) {
      const baseOrigin = originUrl || (req.headers.origin ? String(req.headers.origin) : "https://www.slyd.online");
      const form = new URLSearchParams();
      form.append("mode", "subscription");
      form.append("success_url", `${baseOrigin}/?stripe_success=1&plan=${encodeURIComponent(plan.id)}&session_id={CHECKOUT_SESSION_ID}`);
      form.append("cancel_url", `${baseOrigin}/?stripe_canceled=1`);
      form.append("client_reference_id", userId);
      if (userEmail && userEmail.includes("@")) {
        form.append("customer_email", userEmail);
      }
      form.append("line_items[0][price_data][currency]", "usd");
      form.append("line_items[0][price_data][unit_amount]", String(Math.round(plan.price * 100)));
      form.append("line_items[0][price_data][product_data][name]", plan.name);
      form.append("line_items[0][price_data][product_data][description]", `Slyd+ Unlimited Membership (${plan.intervalLabel})`);
      form.append("line_items[0][price_data][recurring][interval]", plan.stripeInterval);
      form.append("line_items[0][price_data][recurring][interval_count]", String(plan.stripeIntervalCount));
      form.append("line_items[0][quantity]", "1");
      form.append("metadata[userId]", userId);
      form.append("metadata[userName]", userName || "");
      form.append("metadata[planId]", plan.id);

      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form.toString()
      });

      const stripeData: any = await stripeRes.json();
      if (stripeRes.ok && stripeData?.url) {
        return res.status(200).json({
          success: true,
          mode: "stripe_hosted",
          checkoutUrl: stripeData.url,
          sessionId: stripeData.id,
          planId: plan.id
        });
      } else if (stripeData?.error) {
        console.error("Stripe Checkout Session API error:", stripeData.error);
      }
    }

    if (paymentLink) {
      const separator = paymentLink.includes("?") ? "&" : "?";
      const linkWithParams = `${paymentLink}${separator}client_reference_id=${encodeURIComponent(userId)}${userEmail ? `&prefilled_email=${encodeURIComponent(userEmail)}` : ""}`;
      return res.status(200).json({
        success: true,
        mode: "payment_link",
        checkoutUrl: linkWithParams,
        planId: plan.id
      });
    }

    return res.status(200).json({
      success: true,
      mode: "embedded_card",
      planId: plan.id,
      message: "Proceeding with embedded Stripe card checkout."
    });
  } catch (err: any) {
    console.error("Stripe session creation error:", err);
    return res.status(500).json({ error: "Unable to initialize Stripe session." });
  }
}
