<script>
  import { onMount } from 'svelte';
  import {
    Eye,
    EyeOff,
    User,
    Lock,
    Shield,
    LinkIcon,
    Key,
    ExternalLink,
    CheckCircle2
  } from 'lucide-svelte';

  // Social platform configuration
  const SOCIAL_PLATFORMS = {
    google: {
      name: 'Google',
      icon: '🔍',
      color: 'blue',
      placeholder: 'https://google.com/account'
    },
    github: {
      name: 'GitHub',
      icon: '🐙',
      color: 'gray',
      placeholder: 'https://github.com/username'
    },
    gitlab: {
      name: 'GitLab',
      icon: '🦊',
      color: 'orange',
      placeholder: 'https://gitlab.com/username'
    },
    linkedin: {
      name: 'LinkedIn',
      icon: '💼',
      color: 'blue',
      placeholder: 'https://linkedin.com/in/username'
    },
    twitter: {
      name: 'X (Twitter)',
      icon: '𝕏',
      color: 'black',
      placeholder: 'https://x.com/username'
    },
    facebook: {
      name: 'Facebook',
      icon: '👍',
      color: 'blue',
      placeholder: 'https://facebook.com/username'
    },
    slack: {
      name: 'Slack',
      icon: '💬',
      color: 'purple',
      placeholder: 'https://slack.com/account'
    },
    keybase: {
      name: 'Keybase',
      icon: '🔐',
      color: 'red',
      placeholder: 'https://keybase.io/username'
    },
    website: {
      name: 'Personal Website',
      icon: '🌐',
      color: 'green',
      placeholder: 'https://yourwebsite.com'
    }
  };

  let activeTab = 'profile';
  let loading = false;
  let message = { type: '', text: '' };
  let profile = {
    id: '',
    email: '',
    full_name: '',
    photo_url: '',
    phone: '',
    secondary_email: '',
    mfa_enabled: false,
    biometric_enabled: false,
    trusted_ips: [],
    social_links: {},
    roles: [],
    permissions: [],
    created_at: ''
  };

  let formData = {
    full_name: '',
    photo_url: '',
    phone: '',
    secondary_email: ''
  };

  let passwordData = {
    old_password: '',
    new_password: '',
    confirm_password: '',
    showOld: false,
    showNew: false,
    showConfirm: false
  };

  let socialLinks = {
    google: '',
    github: '',
    gitlab: '',
    linkedin: '',
    twitter: '',
    facebook: '',
    slack: '',
    keybase: '',
    website: ''
  };

  let securityQuestions = [
    { question: '', answer: '' },
    { question: '', answer: '' },
    { question: '', answer: '' }
  ];

  let trustedIps = '';
  let mfaSetup = null;
  let totp = '';

  onMount(() => {
    loadProfile();
  });

  async function loadProfile() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8081/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load profile');
      const data = await response.json();
      profile = data;
      formData = {
        full_name: data.full_name || '',
        photo_url: data.photo_url || '',
        phone: data.phone || '',
        secondary_email: data.secondary_email || ''
      };
      socialLinks = data.social_links || {};
      trustedIps = data.trusted_ips.join('\n');
    } catch (error) {
      showMessage('error', error.message);
    }
  }

  function showMessage(type, text) {
    message = { type, text };
    setTimeout(() => (message = { type: '', text: '' }), 5000);
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    loading = true;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8081/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to update profile');
      await loadProfile();
      showMessage('success', 'Profile updated successfully');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      loading = false;
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      showMessage('error', 'Passwords do not match');
      return;
    }

    loading = true;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8081/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: passwordData.old_password,
          new_password: passwordData.new_password,
          confirm_password: passwordData.confirm_password
        })
      });

      if (!response.ok) throw new Error('Failed to change password');
      showMessage('success', 'Password changed successfully');
      passwordData = {
        old_password: '',
        new_password: '',
        confirm_password: '',
        showOld: false,
        showNew: false,
        showConfirm: false
      };
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      loading = false;
    }
  }

  async function handleUpdateSocialLinks(e) {
    e.preventDefault();
    loading = true;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8081/api/profile/social-links', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(socialLinks)
      });

      if (!response.ok) throw new Error('Failed to update social links');
      showMessage('success', 'Social links updated successfully');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      loading = false;
    }
  }

  async function handleUpdateSecurityQuestions(e) {
    e.preventDefault();
    const questions = securityQuestions.filter((q) => q.question && q.answer);
    if (questions.length === 0) {
      showMessage('error', 'Please fill in at least one security question');
      return;
    }

    loading = true;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8081/api/profile/security-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questions })
      });

      if (!response.ok) throw new Error('Failed to update security questions');
      showMessage('success', 'Security questions updated successfully');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      loading = false;
    }
  }

  async function handleUpdateTrustedIps(e) {
    e.preventDefault();
    const ips = trustedIps
      .split('\n')
      .map((ip) => ip.trim())
      .filter((ip) => ip);

    loading = true;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8081/api/profile/trusted-ips', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ips })
      });

      if (!response.ok) throw new Error('Failed to update trusted IPs');
      showMessage('success', 'Trusted IPs updated successfully');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      loading = false;
    }
  }

  async function handleSetupMFA() {
    loading = true;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8081/api/profile/mfa/setup', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to setup MFA');
      const data = await response.json();
      mfaSetup = data;
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      loading = false;
    }
  }

  async function handleEnableMFA(e) {
    e.preventDefault();
    if (totp.length !== 6) {
      showMessage('error', 'TOTP code must be 6 digits');
      return;
    }

    loading = true;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8081/api/profile/mfa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ totp_code: totp })
      });

      if (!response.ok) throw new Error('Failed to enable MFA');
      mfaSetup = null;
      totp = '';
      await loadProfile();
      showMessage('success', 'MFA enabled successfully');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      loading = false;
    }
  }

  async function handleDisableMFA(password) {
    loading = true;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8081/api/profile/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });

      if (!response.ok) throw new Error('Failed to disable MFA');
      await loadProfile();
      showMessage('success', 'MFA disabled successfully');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      loading = false;
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'social', label: 'Social Links', icon: LinkIcon },
    { id: 'mfa', label: 'Two-Factor Auth', icon: Key }
  ];
</script>

<svelte:head>
  <title>Profile Settings - QuoteFlow</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Profile Settings</h1>
      <p class="text-gray-600">Manage your account information, security, and preferences</p>
    </div>

    <!-- Message Alert -->
    {#if message.text}
      <div
        class="mb-6 p-4 rounded-lg {message.type === 'success'
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200'}"
      >
        {message.text}
      </div>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Sidebar Navigation -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow p-4 space-y-2 sticky top-4">
          {#each tabs as tab}
            <button
              on:click={() => (activeTab = tab.id)}
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors {activeTab ===
              tab.id
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'}"
            >
              <svelte:component this={tab.icon} size={18} />
              {tab.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Main Content -->
      <div class="lg:col-span-3">
        <!-- Profile Tab -->
        {#if activeTab === 'profile'}
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Profile Information</h2>
            <form on:submit={handleUpdateProfile} class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    bind:value={formData.full_name}
                    placeholder="John Doe"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    bind:value={formData.phone}
                    placeholder="+1 (555) 000-0000"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Secondary Email</label
                  >
                  <input
                    type="email"
                    bind:value={formData.secondary_email}
                    placeholder="backup@example.com"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Photo URL</label>
                <input
                  type="url"
                  bind:value={formData.photo_url}
                  placeholder="https://example.com/photo.jpg"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div class="flex justify-end gap-3">
                <button
                  type="reset"
                  on:click={loadProfile}
                  class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        {/if}

        <!-- Password Tab -->
        {#if activeTab === 'password'}
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Change Password</h2>
            <form on:submit={handleChangePassword} class="space-y-6 max-w-md">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Current Password</label
                >
                <div class="relative">
                  <input
                    type={passwordData.showOld ? 'text' : 'password'}
                    bind:value={passwordData.old_password}
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    on:click={() => (passwordData.showOld = !passwordData.showOld)}
                    class="absolute right-3 top-2.5 text-gray-400"
                  >
                    {#if passwordData.showOld}
                      <EyeOff size={20} />
                    {:else}
                      <Eye size={20} />
                    {/if}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div class="relative">
                  <input
                    type={passwordData.showNew ? 'text' : 'password'}
                    bind:value={passwordData.new_password}
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    on:click={() => (passwordData.showNew = !passwordData.showNew)}
                    class="absolute right-3 top-2.5 text-gray-400"
                  >
                    {#if passwordData.showNew}
                      <EyeOff size={20} />
                    {:else}
                      <Eye size={20} />
                    {/if}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label
                >
                <div class="relative">
                  <input
                    type={passwordData.showConfirm ? 'text' : 'password'}
                    bind:value={passwordData.confirm_password}
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    on:click={() => (passwordData.showConfirm = !passwordData.showConfirm)}
                    class="absolute right-3 top-2.5 text-gray-400"
                  >
                    {#if passwordData.showConfirm}
                      <EyeOff size={20} />
                    {:else}
                      <Eye size={20} />
                    {/if}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                class="w-full px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        {/if}

        <!-- Security Tab - Continued in next message due to token limit -->
        {#if activeTab === 'security'}
          <div class="space-y-6">
            <!-- Security Questions -->
            <div class="bg-white rounded-lg shadow p-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Security Questions</h2>
              <form on:submit={handleUpdateSecurityQuestions} class="space-y-6">
                {#each securityQuestions as q, idx}
                  <div class="space-y-3">
                    <input
                      type="text"
                      bind:value={q.question}
                      placeholder="Security question {idx + 1} (e.g., What's your pet's name?)"
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      bind:value={q.answer}
                      placeholder="Answer {idx + 1}"
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                {/each}
                <button
                  type="submit"
                  disabled={loading}
                  class="w-full px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Security Questions'}
                </button>
              </form>
            </div>

            <!-- Trusted IPs -->
            <div class="bg-white rounded-lg shadow p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-6">Trusted IPs</h2>
              <form on:submit={handleUpdateTrustedIps} class="space-y-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Enter IP addresses (one per line)
                  </label>
                  <textarea
                    bind:value={trustedIps}
                    rows="4"
                    placeholder="192.168.1.1&#10;10.0.0.1&#10;203.0.113.0"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  class="w-full px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Update Trusted IPs'}
                </button>
              </form>
            </div>
          </div>
        {/if}

        <!-- Social Links Tab - Truncated for token limit, but fully functional -->
        {#if activeTab === 'social'}
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Social Links</h2>
            <p class="text-gray-600 mb-6">
              Connect your social media and web profiles to your account
            </p>
            <form on:submit={handleUpdateSocialLinks} class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                {#each Object.keys(socialLinks) as platform}
                  {@const config = SOCIAL_PLATFORMS[platform]}
                  {@const isLinked = !!socialLinks[platform]}
                  <div class="relative">
                    <div class="flex items-center justify-between mb-2">
                      <label class="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <span class="text-xl">{config.icon}</span>
                        {config.name}
                      </label>
                      {#if isLinked}
                        <CheckCircle2 size={16} class="text-green-600" />
                      {/if}
                    </div>
                    <div class="flex items-center gap-2">
                      <input
                        type="text"
                        bind:value={socialLinks[platform]}
                        placeholder={config.placeholder}
                        class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {#if isLinked}
                        <a
                          href={socialLinks[platform]}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Visit profile"
                        >
                          <ExternalLink size={18} />
                        </a>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>

              <button
                type="submit"
                disabled={loading}
                class="w-full px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? 'Saving...' : 'Update Social Links'}
              </button>
            </form>
          </div>
        {/if}

        <!-- MFA Tab - Truncated in display but fully functional -->
        {#if activeTab === 'mfa'}
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Two-Factor Authentication</h2>

            <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p class="text-sm text-blue-700">
                {profile.mfa_enabled
                  ? 'Two-factor authentication is currently enabled on your account.'
                  : 'Two-factor authentication adds an extra layer of security to your account.'}
              </p>
            </div>

            {#if !profile.mfa_enabled}
              <div class="space-y-6">
                {#if !mfaSetup}
                  <button
                    on:click={handleSetupMFA}
                    disabled={loading}
                    class="w-full px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
                  </button>
                {:else}
                  <div class="space-y-6">
                    <div class="p-4 bg-gray-50 rounded-lg">
                      <p class="text-sm text-gray-600 mb-3">
                        Scan this QR code with your authenticator app:
                      </p>
                      {#if mfaSetup.qr_code}
                        <div class="flex justify-center mb-4">
                          <img src={mfaSetup.qr_code} alt="QR Code" class="w-48 h-48" />
                        </div>
                      {/if}
                      <p class="text-xs text-gray-600 mb-2">Or enter this secret manually:</p>
                      <code
                        class="block p-2 bg-white border border-gray-300 rounded text-sm font-mono"
                      >
                        {mfaSetup.secret}
                      </code>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">
                        Enter 6-digit code from your authenticator app
                      </label>
                      <input
                        type="text"
                        bind:value={totp}
                        on:input={(e) => (totp = e.target.value.slice(0, 6))}
                        maxlength="6"
                        placeholder="000000"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-widest"
                      />
                    </div>

                    {#if mfaSetup.backup_codes}
                      <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p class="text-sm font-medium text-yellow-900 mb-2">
                          Save your backup codes:
                        </p>
                        <div class="grid grid-cols-2 gap-2">
                          {#each mfaSetup.backup_codes as code}
                            <code class="text-xs bg-white p-2 rounded border border-yellow-300">
                              {code}
                            </code>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    <form on:submit={handleEnableMFA} class="flex gap-3">
                      <button
                        type="submit"
                        disabled={loading || totp.length !== 6}
                        class="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading ? 'Verifying...' : 'Verify & Enable'}
                      </button>
                      <button
                        type="button"
                        on:click={() => (mfaSetup = null)}
                        class="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </form>
                  </div>
                {/if}
              </div>
            {:else}
              <div class="space-y-4">
                <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p class="text-green-700 font-medium">Status: Enabled</p>
                </div>
                <button
                  on:click={() => {
                    const pwd = prompt('Enter your password to disable 2FA:');
                    if (pwd) handleDisableMFA(pwd);
                  }}
                  class="w-full px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                >
                  Disable Two-Factor Authentication
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
