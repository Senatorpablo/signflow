#!/bin/bash
# Stripe Setup Script for SignFlow
# One-liner: curl -fsSL https://raw.githubusercontent.com/Senatorpablo/signflow/main/backend/scripts/setup-stripe.sh | bash

set -e

echo "🚀 SignFlow Stripe Setup"
echo ""

# Check for Stripe key
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ STRIPE_SECRET_KEY not set"
    echo ""
    echo "Get your key from: https://dashboard.stripe.com/apikeys"
    echo ""
    read -p "Enter your Stripe Secret Key: " STRIPE_KEY
    export STRIPE_SECRET_KEY=$STRIPE_KEY
fi

# Detect mode
if [[ "$STRIPE_SECRET_KEY" == sk_live_* ]]; then
    echo "⚠️  LIVE MODE detected"
    read -p "Are you sure you want to create LIVE products? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
else
    echo "🧪 TEST MODE"
fi

echo ""
echo "Installing dependencies..."
cd "$(dirname "$0")/.."
npm install stripe --no-save

echo ""
echo "Running setup script..."
node scripts/setup-stripe.js

echo ""
echo "✅ Done! Check the output above for your Price IDs."
