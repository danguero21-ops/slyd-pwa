import React, { useState, useEffect } from 'react';
import {
  Crown,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Lock,
  ArrowRight,
  ChevronLeft,
  AlertCircle,
  EyeOff,
  SlidersHorizontal,
  CheckCircle2,
  Eye,
  Compass,
  RotateCcw,
  Timer,
  MessageSquarePlus,
  LayoutGrid,
  Ban,
  CheckCheck
} from 'lucide-react';

export interface UpgradePaymentResult {
  transactionId: string;
  planId: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  amount: number;
  paymentMethod: 'stripe_card' | 'stripe_link';
  premiumSince: number;
  premiumExpiresAt: number;
}

interface PremiumPaywallProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (result: UpgradePaymentResult) => Promise<void> | void;
  featureName?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
}

interface BillingPlan {
  id: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  name: string;
  price: number;
  interval: string;
  monthlyEquivalent: string;
  badge?: string;
  durationDays: number;
}

const PLANS: BillingPlan[] = [
  {
    id: 'weekly',
    name: '1 Week',
    price: 9.99,
    interval: 'Weekly',
    monthlyEquivalent: '$9.99 / wk',
    durationDays: 7
  },
  {
    id: 'monthly',
    name: '1 Month',
    price: 19.99,
    interval: 'Monthly',
    monthlyEquivalent: '$19.99 / mo',
    badge: 'Most Popular',
    durationDays: 30
  },
  {
    id: 'quarterly',
    name: '3 Months',
    price: 49.99,
    interval: 'Every 3 Mos',
    monthlyEquivalent: '$16.66 / mo',
    badge: 'Save 17%',
    durationDays: 90
  },
  {
    id: 'annual',
    name: '12 Months',
    price: 99.99,
    interval: 'Yearly VIP',
    monthlyEquivalent: '$8.33 / mo',
    badge: 'Best Value · 58% Off',
    durationDays: 365
  }
];

const SLYD_PLUS_FEATURES = [
  {
    icon: Ban,
    title: 'Zero Third-Party Ads',
    desc: 'Enjoy a clean, uninterrupted discovery grid and chat experience.'
  },
  {
    icon: LayoutGrid,
    title: 'See Up to 600 Profiles (6x More)',
    desc: 'Unlock up to 600 profiles on your cascade grid vs. 100 on the free tier.'
  },
  {
    icon: Eye,
    title: 'Viewed Me & Who Liked You',
    desc: 'See every member who viewed your profile or sent you a Super Like.'
  },
  {
    icon: EyeOff,
    title: 'Incognito Browsing Mode',
    desc: 'Browse profiles and radar invisibly without appearing on the grid.'
  },
  {
    icon: RotateCcw,
    title: 'Unsend Messages & Photos',
    desc: 'Recall any sent text message or photo from both sides of the chat.'
  },
  {
    icon: Timer,
    title: 'Expiring Self-Destruct Photos',
    desc: 'Send 10-second view-once disappearing photos in any conversation.'
  },
  {
    icon: CheckCheck,
    title: 'Read Receipts & Typing Stealth',
    desc: 'See when messages are read and hide your own typing indicator.'
  },
  {
    icon: Compass,
    title: 'Global Roam / Teleport Mode',
    desc: 'Explore members and drop your pin in any city worldwide.'
  },
  {
    icon: SlidersHorizontal,
    title: 'All Advanced Pro Filters',
    desc: 'Filter by Online Now, Verified Only, Height, Role, Ethnicity & Status.'
  },
  {
    icon: MessageSquarePlus,
    title: 'Saved Chat Phrases & Private Notes',
    desc: 'One-tap saved quick replies plus private notes & Unlimited Favorites.'
  }
];

const COMPARISON_ROWS = [
  { label: 'No Third-Party Ads', free: false, plus: true },
  { label: 'Profile Grid Limit', free: '100 Profiles', plus: '600 Profiles' },
  { label: 'See Who Viewed & Liked You', free: false, plus: true },
  { label: 'Incognito Browsing Mode', free: false, plus: true },
  { label: 'Unsend Sent Messages & Photos', free: false, plus: true },
  { label: 'Expiring Disappearing Photos', free: false, plus: true },
  { label: 'Read Receipts & Typing Stealth', free: false, plus: true },
  { label: 'Global Roam / City Teleport', free: false, plus: true },
  { label: 'Advanced Pro Filters (Role, Height, Race)', free: false, plus: true },
  { label: 'Saved Phrases & Personal Profile Notes', free: false, plus: true },
  { label: 'Unlimited Favorites & Blocks', free: false, plus: true }
];

const PremiumPaywall: React.FC<PremiumPaywallProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  featureName = 'Slyd+ Plus & Unlimited',
  userId = 'member',
  userEmail = '',
  userName = ''
}) => {
  const [step, setStep] = useState<'overview' | 'checkout' | 'success'>('overview');
  const [selectedPlanId, setSelectedPlanId] = useState<'weekly' | 'monthly' | 'quarterly' | 'annual'>('monthly');
  const [featureTab, setFeatureTab] = useState<'highlights' | 'compare'>('highlights');

  // Card form state
  const [cardholderName, setCardholderName] = useState(userName || '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [billingZip, setBillingZip] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isStartingStripeHosted, setIsStartingStripeHosted] = useState(false);
  const [hostedSessionInfo, setHostedSessionInfo] = useState<{ checkoutUrl: string; sessionId: string; planId: string } | null>(null);
  const [stripeConfig, setStripeConfig] = useState<{
    stripeConfigured: boolean;
    stripePaymentLink: string;
    stripeMode: string;
    stripePublishableKey: string;
  }>({
    stripeConfigured: true,
    stripePaymentLink: '',
    stripeMode: 'live',
    stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<UpgradePaymentResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('overview');
      setErrorMsg(null);
      setIsProcessing(false);
      setIsStartingStripeHosted(false);
      setHostedSessionInfo(null);
      if (userName && !cardholderName) {
        setCardholderName(userName);
      }
      fetch('/api/billing/config')
        .then(r => r.json())
        .then(cfg => {
          if (cfg) {
            setStripeConfig({
              stripeConfigured: Boolean(cfg.stripeConfigured),
              stripePaymentLink: cfg.stripePaymentLink || '',
              stripeMode: cfg.stripeMode || 'live',
              stripePublishableKey:
                cfg.stripePublishableKey ||
                import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
                ''
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, userName]);

  // Poll Stripe Checkout Session status when a live Stripe Hosted Checkout session is active
  useEffect(() => {
    if (!isOpen || !hostedSessionInfo?.sessionId) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/billing/verify-session?session_id=${encodeURIComponent(hostedSessionInfo.sessionId)}&plan=${encodeURIComponent(hostedSessionInfo.planId)}`
        );
        const data = await res.json();
        if (!cancelled && data?.verified) {
          clearInterval(interval);
          const planObj = PLANS.find(p => p.id === hostedSessionInfo.planId) || PLANS[1];
          const result: UpgradePaymentResult = {
            transactionId: data.transactionId || hostedSessionInfo.sessionId,
            planId: planObj.id,
            amount: data.amount || planObj.price,
            paymentMethod: 'stripe_link',
            premiumSince: data.premiumSince || Date.now(),
            premiumExpiresAt: data.premiumExpiresAt || Date.now() + planObj.durationDays * 86400000
          };
          setCompletedResult(result);
          setHostedSessionInfo(null);
          await onUpgrade(result);
          setStep('success');
        }
      } catch {
        // Ignore transient network errors while polling
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, hostedSessionInfo, onUpgrade]);

  if (!isOpen) return null;

  const selectedPlan = PLANS.find(p => p.id === selectedPlanId) || PLANS[1];

  const handleLaunchStripeHostedCheckout = async () => {
    setErrorMsg(null);
    setIsStartingStripeHosted(true);
    try {
      const res = await fetch('/api/billing/create-stripe-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userEmail,
          userName,
          planId: selectedPlan.id,
          originUrl: window.location.origin
        })
      });
      const data = await res.json();
      if (data?.checkoutUrl) {
        if (data.sessionId) {
          setHostedSessionInfo({
            checkoutUrl: data.checkoutUrl,
            sessionId: data.sessionId,
            planId: selectedPlan.id
          });
        }
        // Stripe Checkout forbids framing (X-Frame-Options: DENY), so if inside an iframe open via anchor target="_blank"
        const inIframe = (() => {
          try {
            return window.self !== window.top;
          } catch {
            return true;
          }
        })();
        if (inIframe) {
          const link = document.createElement('a');
          link.href = data.checkoutUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          window.location.href = data.checkoutUrl;
        }
        return;
      }
      setStep('checkout');
    } catch {
      setStep('checkout');
    } finally {
      setIsStartingStripeHosted(false);
    }
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const rawCard = cardNumber.replace(/\s+/g, '');
    if (rawCard.length < 13) {
      setErrorMsg('Please enter a valid 16-digit card number.');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      setErrorMsg('Please enter a valid expiration date (MM/YY).');
      return;
    }
    if (cvc.length < 3) {
      setErrorMsg('Please enter a valid 3 or 4-digit security code.');
      return;
    }
    if (!cardholderName.trim()) {
      setErrorMsg('Please enter the cardholder name.');
      return;
    }

    setIsProcessing(true);

    try {
      let paymentMethodId: string | undefined;
      if (stripeConfig.stripePublishableKey) {
        try {
          const [expMonth, expYearShort] = expiry.split('/');
          const expYear = expYearShort.length === 2 ? `20${expYearShort}` : expYearShort;
          const pmForm = new URLSearchParams();
          pmForm.append('type', 'card');
          pmForm.append('card[number]', rawCard);
          pmForm.append('card[exp_month]', expMonth);
          pmForm.append('card[exp_year]', expYear);
          pmForm.append('card[cvc]', cvc);
          pmForm.append('billing_details[name]', cardholderName.trim());
          if (userEmail && userEmail.includes('@')) {
            pmForm.append('billing_details[email]', userEmail);
          }
          if (billingZip.trim()) {
            pmForm.append('billing_details[address][postal_code]', billingZip.trim());
          }
          const pmRes = await fetch('https://api.stripe.com/v1/payment_methods', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${stripeConfig.stripePublishableKey}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: pmForm.toString()
          });
          const pmData = await pmRes.json();
          if (pmRes.ok && pmData?.id) {
            paymentMethodId = pmData.id;
          }
        } catch {
          // Proceed with backend PaymentIntent processing
        }
      }

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userEmail,
          userName,
          planId: selectedPlan.id,
          paymentMethod: 'stripe_card',
          paymentMethodId,
          cardDetails: {
            cardholderName: cardholderName.trim(),
            cardNumber: rawCard,
            expiry,
            cvc,
            billingZip
          }
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Payment verification failed. Please check your details.');
      }

      const result: UpgradePaymentResult = {
        transactionId: data.transactionId,
        planId: selectedPlan.id,
        amount: selectedPlan.price,
        paymentMethod: 'stripe_card',
        premiumSince: data.premiumSince || Date.now(),
        premiumExpiresAt: data.premiumExpiresAt || (Date.now() + selectedPlan.durationDays * 86400000)
      };

      setCompletedResult(result);
      await onUpgrade(result);
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to process payment right now. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={isProcessing ? undefined : onClose} />

      <div className="relative w-full max-w-md max-h-[92dvh] bg-slate-950 border border-slate-800 rounded-[2.25rem] shadow-2xl overflow-y-auto overflow-x-hidden no-scrollbar z-10 flex flex-col">
        {/* Top Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-sky-500/20 blur-[60px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-blue-600/20 blur-[60px] rounded-full pointer-events-none" />

        {/* Header Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 pt-5 pb-3 bg-slate-950/90 backdrop-blur-md border-b border-slate-900">
          {step === 'checkout' ? (
            <button
              type="button"
              onClick={() => { setStep('overview'); setErrorMsg(null); }}
              disabled={isProcessing}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white py-1.5 px-2.5 rounded-xl bg-slate-900 border border-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-sky-400" />
              <span>Plans</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/20">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-black tracking-tight text-white font-display">
                SLYD<span className="text-sky-400">+</span> UNLIMITED
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            aria-label="Close paywall"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5 relative z-10">
          {step === 'overview' && (
            <>
              {/* Hero Pitch */}
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Unlock {featureName}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
                  Slyd<span className="text-sky-400">+</span> Plus & Unlimited
                </h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  600 profiles on your grid, Viewed Me, Incognito mode, Unsend messages, Expiring photos, Global Roam, and zero ads.
                </p>
              </div>

              {/* 4-Tier Pricing Grid ($9.99/wk, $19.99/mo, $49.99/3mo, $99.99/yr) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400">
                    Choose Your Billing Cycle
                  </label>
                  <span className="text-[11px] text-sky-400 font-semibold">Cancel anytime</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {PLANS.map(plan => {
                    const isSelected = plan.id === selectedPlanId;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-400 shadow-lg shadow-sky-950/50 ring-1 ring-sky-400'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-slate-200">{plan.name}</span>
                          {plan.badge && (
                            <span className="text-[9px] font-black text-sky-300 truncate">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-white tabular-nums">
                            ${plan.price.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 tabular-nums flex items-center justify-between">
                          <span>{plan.monthlyEquivalent}</span>
                          <span className="text-slate-500">{plan.interval}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feature Highlights vs Tier Comparison Toggle */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFeatureTab('highlights')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                      featureTab === 'highlights'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    10 Premium Features
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeatureTab('compare')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                      featureTab === 'compare'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Free vs. Slyd+ Table
                  </button>
                </div>

                {featureTab === 'highlights' ? (
                  <div className="bg-slate-900/50 border border-slate-800/90 rounded-2xl p-4 space-y-3 max-h-64 overflow-y-auto no-scrollbar">
                    {SLYD_PLUS_FEATURES.map((item, idx) => {
                      const IconComponent = item.icon;
                      return (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5 text-sky-400">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white">{item.title}</div>
                            <div className="text-[11px] text-slate-400 leading-snug">{item.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-900/50 border border-slate-800/90 rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-12 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <div className="col-span-7">Feature</div>
                      <div className="col-span-2 text-center">Free</div>
                      <div className="col-span-3 text-center text-sky-400">Slyd+</div>
                    </div>
                    <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto no-scrollbar">
                      {COMPARISON_ROWS.map((row, i) => (
                        <div key={i} className="grid grid-cols-12 items-center px-4 py-2.5 text-xs">
                          <div className="col-span-7 text-slate-200 font-medium pr-2 text-[11px]">
                            {row.label}
                          </div>
                          <div className="col-span-2 text-center text-[10px] text-slate-500 font-semibold">
                            {typeof row.free === 'string' ? row.free : row.free ? '✓' : '—'}
                          </div>
                          <div className="col-span-3 text-center text-[11px] font-bold text-sky-400">
                            {typeof row.plus === 'string' ? row.plus : '✓ Included'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {hostedSessionInfo && (
                  <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 text-xs text-cyan-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        Secure Checkout Ready
                      </span>
                      <a
                        href={hostedSessionInfo.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-cyan-400 text-slate-950 font-black text-[11px] hover:bg-cyan-300 transition-colors"
                      >
                        Continue Upgrade ↗
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Complete your upgrade in the checkout tab. Your Slyd+ membership will unlock automatically as soon as payment completes.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-all whitespace-nowrap"
                >
                  <Crown className="w-4 h-4" />
                  <span>Get Slyd+ — ${selectedPlan.price.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {(stripeConfig.stripeConfigured || stripeConfig.stripePaymentLink) && (
                  <button
                    type="button"
                    disabled={isStartingStripeHosted}
                    onClick={handleLaunchStripeHostedCheckout}
                    className="w-full py-3.5 px-5 bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/40 text-cyan-200 font-black text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-[0.99] transition-all whitespace-nowrap"
                  >
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      {isStartingStripeHosted
                        ? 'Opening Express Upgrade...'
                        : `Upgrade Now (${selectedPlan.name} · $${selectedPlan.price.toFixed(2)})`}
                    </span>
                    <ArrowRight className="w-4 h-4 text-cyan-400" />
                  </button>
                )}

                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Encrypted 256-bit billing · Cancel anytime</span>
                </div>
              </div>
            </>
          )}

          {step === 'checkout' && (
            <form onSubmit={handleCompletePayment} className="space-y-5">
              {/* Order Summary Header */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Slyd+ {selectedPlan.name} Membership</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 text-[9px] font-black uppercase tracking-wider">
                      VIP
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Encrypted Credit / Debit Card Upgrade
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-cyan-300 tabular-nums">${selectedPlan.price.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500">USD Total</div>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={cardholderName}
                    onChange={e => setCardholderName(e.target.value)}
                    placeholder="Name on card"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4242 •••• •••• 4242"
                      className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono tabular-nums placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <CreditCard className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Expiry
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={expiry}
                      onChange={e => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      className="w-full px-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono tabular-nums placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      CVC
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={4}
                      value={cvc}
                      onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      className="w-full px-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono tabular-nums placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      ZIP / Postal
                    </label>
                    <input
                      type="text"
                      value={billingZip}
                      onChange={e => setBillingZip(e.target.value.slice(0, 10))}
                      placeholder="10001"
                      className="w-full px-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono tabular-nums placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all whitespace-nowrap"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Activating Slyd+...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>Get Slyd+ (${selectedPlan.price.toFixed(2)})</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>256-bit encrypted checkout · Instant Slyd+ activation</span>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/50">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-black text-white font-display">
                  Welcome to Slyd<span className="text-sky-400">+</span>!
                </h3>
                <p className="text-xs text-slate-300 max-w-xs mx-auto">
                  All 10 Plus & Unlimited features are now unlocked: 600-profile grid, Viewed Me, Unsend messages, Expiring photos, Global Roam, and Ad-Free browsing.
                </p>
              </div>

              {completedResult && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plan</span>
                    <span className="font-bold text-white">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount Paid</span>
                    <span className="font-bold text-emerald-400 tabular-nums">${completedResult.amount.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Method</span>
                    <span className="font-bold text-slate-200">Card Checkout</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Receipt ID</span>
                    <span className="font-mono text-[11px] text-sky-400">{completedResult.transactionId}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white font-black text-xs rounded-2xl shadow-lg shadow-sky-500/25 transition-all"
              >
                Start Using Slyd+ Features
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumPaywall;
