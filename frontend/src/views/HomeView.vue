<template>
  <div class="min-h-screen bg-white">
    <!-- Navigation -->
    <nav class="border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span class="text-xl font-bold text-gray-900">SignFlow</span>
          </div>

          <div class="flex items-center gap-4">
            <router-link to="/login" class="text-gray-700 hover:text-gray-900 font-medium">Sign in</router-link>
            <router-link to="/register" class="btn-primary">Get Started Free</router-link>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div class="text-center">
        <h1 class="text-5xl font-bold text-gray-900 mb-6">
          E-Signatures Without
          <span class="text-primary-600">The Tax</span>
        </h1>
        <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Open-source DocuSign alternative. Self-host for free, or use our cloud at
          <span class="font-semibold text-primary-600">52% less cost</span>.
          Unlimited documents. Unlimited signers.
        </p>

        <div class="flex justify-center gap-4">
          <router-link to="/register" class="btn-primary text-lg px-8 py-3">
            Start Free — No Credit Card
          </router-link>
          <a href="#pricing" class="btn-secondary text-lg px-8 py-3">
            See Pricing
          </a>
        </div>

        <!-- Savings comparison -->
        <div class="mt-12 inline-flex items-center gap-6 bg-gray-50 rounded-2xl p-6">
          <div class="text-center">
            <p class="text-sm text-gray-500">DocuSign Business Pro</p>
            <p class="text-2xl font-bold text-gray-900">$40<span class="text-sm font-normal">/mo</span></p>
          </div>
          <div class="text-gray-300">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-500">SignFlow Professional</p>
            <p class="text-2xl font-bold text-primary-600">$19<span class="text-sm font-normal">/mo</span></p>
          </div>
        </div>
      </div>
    </div>

    <!-- Features -->
    <div class="bg-gray-50 py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">Everything You Need</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div v-for="feature in features" :key="feature.title" class="card p-6">
            <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
              <component :is="feature.icon" class="w-6 h-6 text-primary-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ feature.title }}</h3>
            <p class="text-gray-600">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Pricing -->
    <div id="pricing" class="py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">Simple Pricing</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <!-- Free -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900">Free</h3>
            <p class="text-3xl font-bold text-gray-900 mt-2">$0<span class="text-sm font-normal text-gray-500">/mo</span></p>
            <ul class="mt-6 space-y-3">
              <li v-for="feature in freeFeatures" :key="feature" class="flex items-center gap-2 text-sm text-gray-600">
                <svg class="w-5 h-5 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ feature }}
              </li>
            </ul>
            <router-link to="/register" class="block w-full btn-secondary mt-6 text-center">Get Started</router-link>
          </div>

          <!-- Professional -->
          <div class="card p-6 border-2 border-primary-500 relative">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Most Popular</div>
            <h3 class="text-lg font-semibold text-gray-900">Professional</h3>
            <p class="text-3xl font-bold text-primary-600 mt-2">$19<span class="text-sm font-normal text-gray-500">/mo per user</span></p>
            <ul class="mt-6 space-y-3">
              <li v-for="feature in proFeatures" :key="feature" class="flex items-center gap-2 text-sm text-gray-600">
                <svg class="w-5 h-5 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ feature }}
              </li>
            </ul>
            <router-link to="/register" class="block w-full btn-primary mt-6 text-center">Start Free Trial</router-link>
          </div>

          <!-- Enterprise -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900">Enterprise</h3>
            <p class="text-3xl font-bold text-gray-900 mt-2">Custom</p>
            <ul class="mt-6 space-y-3">
              <li v-for="feature in enterpriseFeatures" :key="feature" class="flex items-center gap-2 text-sm text-gray-600">
                <svg class="w-5 h-5 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ feature }}
              </li>
            </ul>
            <a href="mailto:enterprise@signflow.io" class="block w-full btn-secondary mt-6 text-center">Contact Sales</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="border-t border-gray-200 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span class="text-lg font-bold text-gray-900">SignFlow</span>
          </div>
          <p class="text-sm text-gray-500">© 2026 SignFlow. Open source e-signature platform.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const features = [
  {
    title: 'Unlimited Documents',
    description: 'No envelope limits. No hidden fees. Send as many documents as you need.',
  },
  {
    title: 'Self-Host Option',
    description: 'Host on your own servers. Your data, your control. Completely free.',
  },
  {
    title: 'Full API Access',
    description: 'Integrate with your workflows. Webhooks, REST API, SDKs included.',
  },
]

const freeFeatures = [
  'Unlimited signatures',
  'Up to 3 team members',
  '10 templates',
  'Basic audit trail',
  'Email notifications',
]

const proFeatures = [
  'Everything in Free',
  'Unlimited team members',
  'Unlimited templates',
  'Custom branding',
  'API access',
  'Bulk send',
  'Priority support',
]

const enterpriseFeatures = [
  'Everything in Professional',
  'SSO / SAML',
  'White-label',
  'On-premises deployment',
  'HIPAA compliance',
  'Dedicated support',
  'Custom contracts',
]
</script>