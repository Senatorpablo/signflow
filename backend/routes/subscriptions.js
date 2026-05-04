/**
 * Stripe Subscription Routes
 */

import { Router } from 'express';
import { catchAsync } from '../middleware/errorHandler.js';
import { createCheckoutSession, createPortalSession, handleWebhook } from '../services/stripeService.js';

const router = Router();

// Create checkout session
router.post('/create', catchAsync(async (req, res) => {
  const { tier } = req.body;
  const userId = req.user?.id;

  const session = await createCheckoutSession(userId, tier);

  res.json({
    sessionId: session.id,
    url: session.url,
  });
}));

// Customer portal
router.post('/portal', catchAsync(async (req, res) => {
  const { customerId } = req.body;

  const session = await createPortalSession(customerId);

  res.json({
    url: session.url,
  });
}));

// Stripe webhook
router.post('/webhook', catchAsync(async (req, res) => {
  const signature = req.headers['stripe-signature'];

  const event = await handleWebhook(req.body, signature);

  res.json({ received: true, type: event.type });
}));

export default router;
