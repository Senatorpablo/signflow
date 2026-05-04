#!/usr/bin/env node
/**
 * Stripe Setup Script for SignFlow
 * Automates product and price creation
 * 
 * Usage:
 *   export STRIPE_SECRET_KEY=sk_test_...
 *   node scripts/setup-stripe.js
 * 
 * Or with live keys:
 *   export STRIPE_SECRET_KEY=sk_live_...
 *   node scripts/setup-stripe.js --live
 */

import Stripe from 'stripe';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

async function main() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeKey) {
    console.error('❌ STRIPE_SECRET_KEY environment variable required');
    console.log('Set it first: export STRIPE_SECRET_KEY=sk_test_...');
    process.exit(1);
  }

  const isLive = stripeKey.startsWith('sk_live_');
  const isTest = stripeKey.startsWith('sk_test_');
  
  if (!isLive && !isTest) {
    console.error('❌ Invalid Stripe key format. Must start with sk_test_ or sk_live_');
    process.exit(1);
  }

  console.log(`\n🚀 SignFlow Stripe Setup (${isLive ? 'LIVE' : 'TEST'} mode)\n`);

  if (isLive) {
    const confirm = await prompt('⚠️  LIVE MODE: This will create real products. Continue? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

  try {
    // Verify API key works
    const account = await stripe.account.retrieve();
    console.log(`✅ Connected to Stripe account: ${account.settings?.dashboard?.display_name || account.id}`);

    // ==========================================
    // Create SignFlow Professional Product
    // ==========================================
    console.log('\n📦 Creating SignFlow Professional ($19/user/month)...');
    
    const proProduct = await stripe.products.create({
      name: 'SignFlow Professional',
      description: 'Unlimited signatures, templates, API access, and custom branding for teams',
      metadata: {
        tier: 'PROFESSIONAL',
        features: 'unlimited_docs,unlimited_templates,api_access,custom_branding,priority_support'
      }
    });
    console.log(`✅ Product created: ${proProduct.id}`);

    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 1900, // $19.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1
      },
      metadata: {
        tier: 'PROFESSIONAL'
      }
    });
    console.log(`✅ Price created: ${proPrice.id}`);

    // ==========================================
    // Create SignFlow Enterprise Product
    // ==========================================
    console.log('\n📦 Creating SignFlow Enterprise (Custom pricing)...');
    
    const enterpriseProduct = await stripe.products.create({
      name: 'SignFlow Enterprise',
      description: 'SSO, white-label, on-premise deployment, dedicated support, SLA',
      metadata: {
        tier: 'ENTERPRISE',
        features: 'sso,white_label,on_premise,dedicated_support,sla,unlimited_api'
      }
    });
    console.log(`✅ Product created: ${enterpriseProduct.id}`);

    // Enterprise uses custom pricing — no fixed price object
    // Sales team will handle via Stripe billing portal or manual invoices
    console.log('ℹ️  Enterprise: No fixed price. Handle via sales process.');

    // ==========================================
    // Output configuration
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('📝 Add these to your .env file:');
    console.log('='.repeat(60));
    console.log(`\n# Stripe ${isLive ? 'LIVE' : 'TEST'} keys`);
    console.log(`STRIPE_SECRET_KEY=${stripeKey}`);
    console.log(`STRIPE_PRICE_ID_PRO=${proPrice.id}`);
    console.log(`STRIPE_PRICE_ID_ENTERPRISE=custom`);
    console.log(`STRIPE_WEBHOOK_SECRET=whsec_...  # Add after webhook setup`);
    console.log('\n# Frontend URL (required for checkout redirects)');
    console.log('FRONTEND_URL=https://yourdomain.com');
    console.log('\n# Pricing display');
    console.log('PROFESSIONAL_PRICE_MONTHLY=19');
    console.log('PROFESSIONAL_PRICE_YEARLY=190');
    console.log('');

    if (!isLive) {
      console.log('🧪 Test Card Numbers:');
      console.log('  Successful: 4242 4242 4242 4242');
      console.log('  Declined:   4000 0000 0000 0002');
      console.log('  3D Secure:  4000 0025 0000 3155');
      console.log('');
    }

    console.log('🚀 Next steps:');
    console.log('  1. Copy the environment variables above into your .env');
    console.log('  2. Setup webhook: stripe listen --forward-to localhost:3000/api/subscriptions/webhook');
    console.log('  3. Test checkout flow');
    console.log('  4. Switch to live keys when ready');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.log('Your API key is invalid or expired.');
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
