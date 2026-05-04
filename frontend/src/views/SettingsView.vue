<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

    <div class="max-w-2xl space-y-6">
      <!-- Profile Settings -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" class="input" value="John Doe" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" class="input" value="john@example.com" />
          </div>
          <button class="btn-primary">Save Changes</button>
        </div>
      </div>

      <!-- Organization Settings -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Organization</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
            <input type="text" class="input" value="Acme Corp" />
          </div>
          <button class="btn-primary">Save Changes</button>
        </div>
      </div>

      <!-- Billing -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Billing</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900">Current Plan: Free</p>
            <p class="text-sm text-gray-500">Upgrade for more features</p>
          </div>
          <button class="btn-primary">Upgrade Plan</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Settings view
</script>