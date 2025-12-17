<script>
  import { onMount } from 'svelte';
  import apiClient from '../../api/client.js';

  let companyName = '';
  let description = '';
  let industry = '';
  let generatedKey = '';
  let error = '';
  let success = '';
  let loading = false;

  async function handleCreateCompany() {
    error = '';
    success = '';
    loading = true;

    if (!companyName.trim()) {
      error = 'Company name is required';
      loading = false;
      return;
    }

    try {
      const response = await apiClient.request('/api/companies', {
        method: 'POST',
        body: JSON.stringify({
          name: companyName,
          description: description || null,
          industry: industry || null,
        }),
      });

      generatedKey = response.companyKey;
      success = 'Company created successfully! Save your company key.';
      
      // Clear form
      companyName = '';
      description = '';
      industry = '';
    } catch (err) {
      error = err.message || 'Failed to create company';
    } finally {
      loading = false;
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(generatedKey);
    alert('Company key copied to clipboard!');
  }

  function goToLogin() {
    window.location.href = '/';
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
  <div class="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8">
    <h1 class="text-4xl font-bold text-white mb-2 text-center">Create Company Account</h1>
    <p class="text-purple-200 mb-8 text-center">Set up your company to manage students, mentors, and admins</p>

    {#if !generatedKey}
      <form on:submit|preventDefault={handleCreateCompany} class="space-y-6">
        <!-- Company Name -->
        <div>
          <label class="block text-sm font-medium text-purple-200 mb-2">
            Company Name <span class="text-red-400">*</span>
          </label>
          <input
            type="text"
            bind:value={companyName}
            placeholder="Enter your company name"
            class="w-full px-4 py-3 bg-white/20 border border-purple-300/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        <!-- Industry -->
        <div>
          <label class="block text-sm font-medium text-purple-200 mb-2">
            Industry
          </label>
          <select
            bind:value={industry}
            class="w-full px-4 py-3 bg-white/20 border border-purple-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="" class="bg-purple-900">Select industry</option>
            <option value="Technology" class="bg-purple-900">Technology</option>
            <option value="Healthcare" class="bg-purple-900">Healthcare</option>
            <option value="Finance" class="bg-purple-900">Finance</option>
            <option value="Education" class="bg-purple-900">Education</option>
            <option value="Manufacturing" class="bg-purple-900">Manufacturing</option>
            <option value="Retail" class="bg-purple-900">Retail</option>
            <option value="Other" class="bg-purple-900">Other</option>
          </select>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-purple-200 mb-2">
            Description
          </label>
          <textarea
            bind:value={description}
            placeholder="Brief description of your company"
            rows="3"
            class="w-full px-4 py-3 bg-white/20 border border-purple-300/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          ></textarea>
        </div>

        {#if error}
          <div class="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p class="text-red-200">{error}</p>
          </div>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Company'}
        </button>

        <button
          type="button"
          on:click={goToLogin}
          class="w-full py-3 px-6 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
        >
          Back to Login
        </button>
      </form>
    {:else}
      <!-- Success View -->
      <div class="space-y-6">
        <div class="p-6 bg-green-500/20 border border-green-500/50 rounded-lg">
          <p class="text-green-200 text-center mb-4">{success}</p>
        </div>

        <div class="p-6 bg-purple-800/30 border border-purple-500/50 rounded-lg">
          <h3 class="text-xl font-bold text-white mb-4 text-center">Your Company Key</h3>
          <div class="bg-black/30 p-4 rounded-lg mb-4">
            <p class="text-2xl font-mono text-purple-200 text-center break-all">{generatedKey}</p>
          </div>
          <button
            on:click={copyToClipboard}
            class="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all mb-4"
          >
            📋 Copy Key to Clipboard
          </button>
          <div class="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <p class="text-yellow-200 text-sm">
              ⚠️ <strong>Important:</strong> Save this key securely! Share it with your team members during registration.
              This key links all users (admins, mentors, students) to your company.
            </p>
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-xl font-bold text-white text-center">Next Steps:</h3>
          <div class="bg-white/10 rounded-lg p-4 space-y-2 text-purple-200">
            <p>✅ Share the company key with your team members</p>
            <p>✅ Team members use this key during registration</p>
            <p>✅ Admins can manage the entire company</p>
            <p>✅ Mentors will see their assigned students</p>
            <p>✅ Students will receive tasks from their mentors</p>
          </div>
        </div>

        <button
          on:click={goToLogin}
          class="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          Go to Login
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
