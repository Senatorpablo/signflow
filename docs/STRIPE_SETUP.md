# Stripe Setup Guide for SignFlow

Complete guide to configure Stripe payments for SignFlow e-signature platform.

## Prerequisites

- Stripe account (https://stripe.com)
- SignFlow backend running
- Domain with HTTPS (for production)

## Step 1: Get Your Stripe API Keys

1. Login to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers → API keys**
3. Copy your **Secret key**:
   - Test mode: `sk_test_...` (for development)
   - Live mode: `sk_live_...` (for production)

**⚠️ Security:** Never share or commit secret keys. Use environment variables.

## Step 2: Automated Setup (Recommended)

### Option A: One-Liner Script

```bash
curl -fsSL https://raw.githubusercontent.com/Senatorpablo/signflow/main/backend/scripts/setup-stripe.sh | bash
```

### Option B: Manual Setup

```bash
cd backend
npm install stripe

export STRIPE_SECRET_KEY=sk_test_...
node scripts/setup-stripe.js
```

The script will:
- ✅ Create "SignFlow Professional" product ($19/mo)
- ✅ Create "SignFlow Enterprise" product (custom pricing)
- ✅ Output exact Price IDs to copy into `.env`

## Step 3: Configure Environment Variables

```bash
# backend/.env
STRIPE_SECRET_KEY=sk_test_...          # Your secret key
STRIPE_PRICE_ID_PRO=price_...          # From script output
STRIPE_WEBHOOK_SECRET=whsec_...        # From webhook setup
FRONTEND_URL=https://yourdomain.com     # Your domain
```

## Step 4: Setup Webhooks

### Local Development

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/subscriptions/webhook
```

Copy the webhook signing secret and add to `.env`.

### Production

1. Dashboard → **Developers → Webhooks**
2. Add endpoint: `https://yourdomain.com/api/subscriptions/webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
4. Copy **Signing secret**

## Step 5: Test Payments

### Test Card Numbers

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | 3D Secure |

### Test Flow

1. Create checkout session: `POST /api/subscriptions/create`
2. Redirect customer to Stripe Checkout URL
3. Complete payment with test card
4. Webhook updates subscription status
5. User gets Pro access

## Step 6: Going Live

### Checklist

- [ ] Switch to `sk_live_` key
- [ ] Create live products with `setup-stripe.js`
- [ ] Configure live webhook endpoint
- [ ] Enable HTTPS on domain
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Test with $1 payment
- [ ] Connect bank account for payouts
- [ ] Configure tax settings (if applicable)

### Switching to Live

```bash
# In Stripe Dashboard, toggle "Test mode" off
# Then run:
export STRIPE_SECRET_KEY=sk_live_...
node scripts/setup-stripe.js
```

## Pricing Configuration

### Current Pricing

| Plan | Monthly | Yearly |
|------|---------|--------|
| Free | $0 | $0 |
| Professional | $19/user | $190/user |
| Enterprise | Custom | Custom |

### Modifying Prices

Edit `backend/services/stripeService.js`:

```javascript
export const TIERS = {
  PROFESSIONAL: {
    price: 1900,  // $19.00 in cents
    // ...
  }
};
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Check key format (sk_test_ or sk_live_) |
| "Webhook signature invalid" | Verify `STRIPE_WEBHOOK_SECRET` |
| "Price not found" | Run setup script to create products |
| "Payment declined" | Use test cards, check card number |
| "Subscription not updating" | Check webhook delivery in Dashboard |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/subscriptions/create` | POST | Create checkout session |
| `/api/subscriptions/portal` | POST | Customer portal |
| `/api/subscriptions/webhook` | POST | Stripe webhook |

## Support

- Stripe Docs: https://stripe.com/docs
- SignFlow Issues: https://github.com/Senatorpablo/signflow/issues
