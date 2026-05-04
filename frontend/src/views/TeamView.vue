<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Team Management</h1>

    <div class="card overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Member</th>
            <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Role</th>
            <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
            <th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="member in teamMembers" :key="member.id">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span class="text-sm font-medium text-primary-700">{{ member.name.charAt(0) }}</span>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ member.name }}</p>
                  <p class="text-sm text-gray-500">{{ member.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                {{ member.role }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-success-100 text-success-800">
                Active
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button class="text-sm text-primary-600 hover:text-primary-700">Edit</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
const teamMembers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Owner' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Admin' },
]
</script>