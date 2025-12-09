<script>
  import { onMount } from 'svelte';
  import { goto, page } from '@roxi$lib/routify-adapter.js';
  import { validateEmail, RateLimiter } from '$lib/utils/validation';
  import { AUTH_BASE_URL } from '$lib/utils/constants';
  import { persistAuthSession } from '$lib/utils/auth';
  import { User } from '$lib/services/user.service';
  import { fetchPublicRegistrationStatus } from '$lib/services/securityService';
  import { sha256Hex } from '$lib/utils/hash';

  // Client-side rate limiting
  const loginRateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute

  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  let fieldErrors = {};
  let registrationStatus = {
    loading: true,
    canRegister: true,
    inviteRequired: false,
    message: '',
    mode: 'public'
  };
  let registrationStatusError = '';
  let legacyUpgradeRequired = false;

  $: redirectTo = $page?.params?.redirectTo || '/dashboard';

  onMount(() => {
    let active = true;

    const loadRegistrationStatus = async () => {
      registrationStatus = { ...registrationStatus, loading: true };
      try {
        const data = await fetch('auth/registration-settings',{
          headers: {Accept: 'application/json'}
        }).then(r =>r.json());
       if (!active) return;
 registrationStatus = {
  loading: false,
  canRegister: data?.can_register !== false,
  inviteRequired: !!data?.invite_required,
  message: data?.message || '',
  mode:
    data?.mode ||
    (data?.invite_required
      ? 'invite_only'
      : data?.registration_open !== false
        ? 'public'
        : 'closed')
};

registrationStatusError = ''; 
      } catch (statusErr) {
        if (!active) return;
        registrationStatus = { ...registrationStatus, loading: false };
        registrationStatusError = statusErr.message || 'Unable to verify registration status.';
      }
    };

    loadRegistrationStatus();
    return () => {
      active = false;
    };
  });

  function validateForm() {
    const errors = {};

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      errors.email = emailValidation.error;
    }

    // Basic password validation for login (not strength, just presence)
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length > 128) {
      errors.password = 'Password is too long';
    }

    fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async function attemptLogin({ useLegacy, sanitizedEmail }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const loginUrl = '/auth/login';
    const payload =
      useLegacy || legacyUpgradeRequired
        ? {
            email: sanitizedEmail,
            password
          }
        : {
            hashed_email: await sha256Hex(sanitizedEmail),
            hashed_password: await sha256Hex(password)
          };

    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({ error: 'Login failed' }));

    if (!res.ok) {
      if (!useLegacy && res.status === 409 && data?.upgrade_required) {
        legacyUpgradeRequired = true;
        return attemptLogin({ useLegacy: true, sanitizedEmail });
      }
      throw new Error(data.error || 'Login failed');
    }

    if (!data.token) {
      throw new Error('No token received');
    }

    legacyUpgradeRequired = useLegacy || legacyUpgradeRequired;
    return data;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    fieldErrors = {};

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    const sanitizedEmail = validateEmail(email).value;

    // Rate limiting
    if (!loginRateLimiter.canAttempt()) {
      const remainingTime = Math.ceil(loginRateLimiter.getRemainingTime() / 1000);
      error = `Too many login attempts. Please wait ${remainingTime} seconds.`;
      return;
    }

    loading = true;

    try {
      loginRateLimiter.recordAttempt();
      const data = await attemptLogin({ useLegacy: false, sanitizedEmail });
      persistAuthSession({
        token: data.token,
        email: validateEmail(email).value,
        claims: data.claims,
        user: data.user
      });
      if (data.user || data.claims) {
        await User.syncAuthUser({
          id: data.user?.id || data.claims?.sub,
          email: data.user?.email || validateEmail(email).value,
          name: data.user?.name,
          roles: data.user?.roles || data.claims?.roles
        });
      }
      loginRateLimiter.reset();
      $goto(redirectTo);
    } catch (err) {
      if (err.name === 'AbortError') {
        error = 'Request timed out. Please check your connection and try again.';
      } else {
        error = err.message;
      }
    } finally {
      loading = false;
    }
  }

  $: registrationMode = registrationStatus.mode;
  $: registrationClosed = registrationMode === 'closed';
  $: inviteOnlyMode = registrationMode === 'invite_only';
  $: registrationUnavailable =
    !registrationStatus.loading && (registrationClosed || !registrationStatus.canRegister);
  $: registerButtonLabel = registrationClosed
    ? 'Registration Closed'
    : inviteOnlyMode
      ? 'Invite Only'
      : 'Register account';
  $: registrationMessage = registrationClosed
    ? registrationStatus.message || 'Registration is currently disabled.'
    : inviteOnlyMode
      ? registrationStatus.message || 'Registration is by private invite only.'
      : registrationStatus.message || 'Registration is currently disabled.';
</script>

<svelte:head>
  <title>Login - QuoteFlow</title>
</svelte:head>

<div class="min-h-screen bg-[#e0e0e0] flex items-center justify-center p-6">
  <div class="neumorphic-card p-8 max-w-md w-full">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-primary mb-2">Login</h1>
      <p class="text-secondary">Please sign in to continue</p>
    </div>

    {#if error}
      <div class="neumorphic-inset bg-red-50 text-red-500 p-4 mb-6 rounded-xl text-sm">
        {error}
      </div>
    {/if}
    {#if legacyUpgradeRequired}
      <div class="neumorphic-inset bg-amber-50 text-amber-700 p-3 mb-4 rounded-xl text-xs">
        We detected an older credential format. Click Sign In again to perform a one-time secure
        upgrade.
      </div>
    {/if}

    <form on:submit={handleSubmit} class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-primary mb-2"> Email Address </label>
        <div class="neumorphic-inset p-3 {fieldErrors.email ? 'border-2 border-red-400' : ''}">
          <input
            type="email"
            bind:value={email}
            on:input={() => {
              fieldErrors = { ...fieldErrors, email: null };
              legacyUpgradeRequired = false;
            }}
            on:blur={() => {
              const validation = validateEmail(email);
              if (!validation.valid) {
                fieldErrors = { ...fieldErrors, email: validation.error };
              }
            }}
            class="w-full bg-transparent outline-none text-primary placeholder-secondary"
            placeholder="you@example.com"
            required
            autocomplete="email"
            maxlength="254"
          />
        </div>
        {#if fieldErrors.email}
          <p class="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
        {/if}
      </div>

      <div>
        <label class="block text-sm font-medium text-primary mb-2"> Password </label>
        <div class="neumorphic-inset p-3 {fieldErrors.password ? 'border-2 border-red-400' : ''}">
          <input
            type="password"
            bind:value={password}
            on:input={() => {
              fieldErrors = { ...fieldErrors, password: null };
              legacyUpgradeRequired = false;
            }}
            class="w-full bg-transparent outline-none text-primary placeholder-secondary"
            placeholder="••••••••"
            required
            autocomplete="current-password"
            maxlength="128"
          />
        </div>
        {#if fieldErrors.password}
          <p class="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
        {/if}
      </div>

      <button
        type="submit"
        disabled={loading}
        class="neumorphic-button w-full py-3 text-primary font-medium transition-all duration-200"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      <p class="text-sm text-secondary text-center mt-4">
        <button
          type="button"
          on:click={() => $goto('/register')}
          class="text-primary hover:underline {registrationUnavailable
            ? 'opacity-60 cursor-not-allowed'
            : ''}"
          disabled={registrationClosed || registrationUnavailable}
          title={registrationUnavailable ? registrationMessage : undefined}
        >
          {registerButtonLabel}
        </button>
        {' · '}
        <button
          type="button"
          on:click={() => $goto('/forgot-password')}
          class="text-primary hover:underline"
        >
          Forgot Password?
        </button>
      </p>
    </form>
  </div>
  {#if registrationStatus.loading}
    <p class="text-xs text-secondary text-center mt-4">Checking registration availability...</p>
  {/if}
  {#if !registrationStatus.loading && registrationUnavailable}
    <div
      class="neumorphic-inset bg-amber-50 text-amber-700 p-4 mt-4 rounded-xl text-sm text-center"
    >
      {registrationMessage}
    </div>
  {/if}
  {#if registrationStatusError}
    <p class="text-xs text-amber-600 text-center mt-3">
      {registrationStatusError}
    </p>
  {/if}
</div>
