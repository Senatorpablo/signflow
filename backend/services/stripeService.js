/**
 * Stripe Payment Service
 * Subscription management for SignFlow
 */

import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

// Subscription tiers
export const TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    documentsPerMonth: null, // unlimited
    signersPerDocument: 3,
    templatesLimit: 10,
    apiAccess: false,
    customBranding: false,
  },
  PROFESSIONAL: {
    id: 'pro',
    name: 'Professional',
    price: 1900, // $19.00 in cents
    documentsPerMonth: null, // unlimited
    signersPerDocument: null, // unlimited
    templatesLimit: null, // unlimited
    apiAccess: true,
    customBranding: true,
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null, // custom
    documentsPerMonth: null,
    signersPerDocument: null,
    templatesLimit: null,
    apiAccess: true,
    customBranding: true,
    whiteLabel: true,
    sso: true,
  },
};

/**
 * Create a checkout session for subscription
 */
export const createCheckoutSession = async (userId, tier) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const tierConfig = TIERS[tier.toUpperCase()];
  if (!tierConfig) {
    throw new Error('Invalid tier');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: process.env[`STRIPE_PRICE_ID_${tier.toUpperCase()}`],
      quantity: 1,
    }],
    success_url: `${process.env.FRONTEND_URL}/settings?tab=billing&success=true`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
    client_reference_id: userId,
    metadata: { userId, tier },
  });

  return session;
};

/**
 * Create customer portal session
 */
export const createPortalSession = async (customerId) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL}/settings?tab=billing`,
  });

  return session;
};

/**
 * Handle Stripe webhook
 */
export const handleWebhook = async (payload, signature) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      // Update user subscription
      console.log('✅ Subscription created:', session.id);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      console.log('✅ Payment succeeded:', invoice.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      console.log('❌ Subscription canceled:', subscription.id);
      break;
    }

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  return event;
};

/**
 * Check if feature is allowed for subscription tier
 */
export const checkFeature = (tier, feature) => {
  const tierConfig = TIERS[tier.toUpperCase()] || TIERS.FREE;
  return tierConfig[feature] || false;
};

/**
 * Check if within limits
 */
export const checkLimit = (tier, limitType, currentUsage) => {
  const tierConfig = TIERS[tier.toUpperCase()] || TIERS.FREE;
  const limit = tierConfig[limitType];

  // null means unlimited
  if (limit === null || limit === undefined) {
    return { allowed: true };
  }

  return {
    allowed: currentUsage < limit,
    limit,
    current: currentUsage,
    remaining: Math.max(0, limit - currentUsage),
  };
};

export default {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  checkFeature,
  checkLimit,
  TIERS,
};
