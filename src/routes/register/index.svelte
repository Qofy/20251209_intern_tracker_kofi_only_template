<script>
  import { onMount } from 'svelte';
  import { goto, page } from '@roxi$lib/routify-adapter.js';
  import {
    validateEmail,
    validatePassword,
    getPasswordStrength,
    RateLimiter
  } from '$lib/utils/validation';
  import { AUTH_BASE_URL } from '$lib/utils/constants';
  import { persistAuthSession } from '$lib/utils/auth';
  import { User } from '$lib/services/user.service';
  import { fetchPublicRegistrationStatus } from '$lib/services/securityService';

  // Client-side rate limiting
  const registerRateLimiter = new RateLimiter(3, 60000); // 3 attempts per minute

  let email = '';
  let password = '';
  let confirmPassword = '';
  let isLoading = false;
  let error = null;
  let fieldErrors = {};
  let passwordStrength = { score: 0, label: 'None', color: 'gray' };
  let registrationStatus = {
    loading: true,
    canRegister: true,
    inviteRequired: false,
    inviteTokenValid: false,
    message: '',
    inviteEmail: '',
    mode: 'public'
  };
  let statusError = '';

  $: inviteToken = $page?.params?.invite || '';
  $: disableRegistrationStatus =
    (typeof window !== 'undefined' && import.meta.env?.VITE_DISABLE_REGISTRATION_STATUS) === 'true';
  $: registrationMode = registrationStatus.mode;
  $: inviteOnlyMode = registrationMode === 'invite_only';
  $: registrationClosed = registrationMode === 'closed';
  $: formBlocked =
    !registrationStatus.loading &&
    (registrationClosed || (inviteOnlyMode && !registrationStatus.inviteTokenValid));
  $: formDisabled = registrationStatus.loading;

  onMount(() => {
    let active = true;
    statusError = '';
    if (disableRegistrationStatus) {
      statusError = '';
      registrationStatus = {
        ...registrationStatus,
        loading: false,
        canRegister: true,
        inviteRequired: false,
        inviteTokenValid: true,
        mode: 'public'
      };
      return () => {};
    }

    registrationStatus = { ...registrationStatus, loading: true };

    fetchPublicRegistrationStatus(inviteToken)
      .then((data) => {
        if (!active) return;
        registrationStatus = {
          loading: false,
          canRegister: data?.can_register !== false,
          inviteRequired: !!data?.invite_required,
          inviteTokenValid: !!data?.invite_token_valid,
          message: data?.message || '',
          inviteEmail: data?.invite_email || '',
          mode:
            data?.mode ||
            (data?.invite_required
              ? 'invite_only'
              : data?.registration_open !== false
                ? 'public'
                : 'closed')
        };
      })
      .catch((err) => {
        if (!active) return;
        statusError = err.message || 'Unable to verify registration status.';
        registrationStatus = { ...registrationStatus, loading: false };
      });

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

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.error;
    }

    // Confirm password match
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  function handlePasswordChange(value) {
    password = value;
    passwordStrength = getPasswordStrength(value);
    fieldErrors = { ...fieldErrors, password: null };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    error = null;
    fieldErrors = {};

    if (registrationStatus.loading) {
      error = 'Please wait while we verify registration eligibility.';
      return;
    }

    if (!registrationStatus.canRegister) {
      error = registrationStatus.message || 'Registration is currently restricted.';
      return;
    }

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    // Rate limiting
    if (!registerRateLimiter.canAttempt()) {
      const remainingTime = Math.ceil(registerRateLimiter.getRemainingTime() / 1000);
      error = `Too many registration attempts. Please wait ${remainingTime} seconds.`;
      return;
    }

    isLoading = true;

    try {
      registerRateLimiter.recordAttempt();
      const sanitizedEmail = validateEmail(email).value;

      // Call /auth/register endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const registerUrl = 'auth/register';
      const res = await fetch(registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sanitizedEmail,
          password,
          invite_token: inviteToken || undefined
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Registration failed' }));
        throw new Error(data.error || 'Registration failed');
      }

      const data = await res.json();

      if (data.token) {
        persistAuthSession({
          token: data.token,
          email: sanitizedEmail,
          claims: data.claims,
          user: data.user
        });
        if (data.user || data.claims) {
          await User.syncAuthUser({
            id: data.user?.id || data.claims?.sub,
            email: data.user?.email || sanitizedEmail,
            name: data.user?.name,
            roles: data.user?.roles || data.claims?.roles
          });
        }

        // Reset rate limiter on successful registration
        registerRateLimiter.reset();

        $goto('/dashboard');
      } else {
        throw new Error('Registration successful but no token received');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.name === 'AbortError') {
        error = 'Request timed out. Please check your connection and try again.';
      } else {
        error = err.message || 'Failed to register. Please try again.';
      }
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Create Account - QuoteFlow</title>
</svelte:head>

<div class="min-h-screen bg-[#e0e0e0] flex items-center justify-center p-6">
  <div class="neumorphic-card p-8 max-w-md w-full">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-primary mb-2">Create Account</h1>
      <p class="text-secondary">Join us to get started</p>
    </div>

    {#if registrationStatus.loading}
      <div class="neumorphic-inset bg-blue-50 text-blue-500 p-4 mb-4 rounded-xl text-sm">
        Checking registration status...
      </div>
    {/if}

    {#if !registrationStatus.loading && !registrationStatus.canRegister}
      <div class="neumorphic-inset bg-amber-50 text-amber-700 p-4 mb-4 rounded-xl text-sm">
        {registrationStatus.message || 'Registration is currently disabled.'}
        {#if registrationStatus.inviteRequired && !registrationStatus.inviteTokenValid}
          <p class="mt-2 text-xs text-amber-600">
            Registration is by private invite only. Please request an invite from an administrator.
          </p>
        {/if}
      </div>
    {/if}

    {#if registrationStatus.inviteTokenValid}
      <div class="neumorphic-inset bg-emerald-50 text-emerald-700 p-4 mb-4 rounded-xl text-sm">
        Invite accepted{registrationStatus.inviteEmail
          ? ` for ${registrationStatus.inviteEmail}`
          : ''}. You can finish creating your account.
      </div>
    {/if}

    {#if statusError}
      <div class="neumorphic-inset bg-yellow-50 text-yellow-600 p-4 mb-4 rounded-xl text-sm">
        {statusError}
      </div>
    {/if}

    {#if error}
      <div class="neumorphic-inset bg-red-50 text-red-500 p-4 mb-6 rounded-xl text-sm">
        {error}
      </div>
    {/if}

    {#if formBlocked && !registrationStatus.loading}
      <div class="neumorphic-inset bg-amber-50 text-amber-700 p-4 mb-6 rounded-xl text-sm">
        {registrationClosed
          ? registrationStatus.message || 'Registration is currently closed.'
          : registrationStatus.message || 'Registration is by private invite only.'}
      </div>
    {/if}

    {#if !formBlocked}
      <form on:submit={handleSubmit} class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-primary mb-2"> Email Address </label>
          <div class="neumorphic-inset p-3 {fieldErrors.email ? 'border-2 border-red-400' : ''}">
            <input
              type="email"
              bind:value={email}
              on:input={() => {
                fieldErrors = { ...fieldErrors, email: null };
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
              disabled={formDisabled}
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
              value={password}
              on:input={(e) => handlePasswordChange(e.target.value)}
              on:blur={() => {
                const validation = validatePassword(password);
                if (!validation.valid) {
                  fieldErrors = { ...fieldErrors, password: validation.error };
                }
              }}
              class="w-full bg-transparent outline-none text-primary placeholder-secondary"
              placeholder="••••••••"
              required
              autocomplete="new-password"
              maxlength="128"
              disabled={formDisabled}
            />
          </div>
          {#if fieldErrors.password}
            <p class="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
          {/if}
          {#if password && !fieldErrors.password}
            <div class="mt-2">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-secondary">Password Strength:</span>
                <span class="font-medium text-{passwordStrength.color}-600">
                  {passwordStrength.label}
                </span>
              </div>
              <div class="w-full h-1 bg-gray-300 rounded">
                <div
                  class="h-full bg-{passwordStrength.color}-500 rounded transition-all"
                  style="width: {(passwordStrength.score / 10) * 100}%"
                ></div>
              </div>
            </div>
          {/if}
          <p class="text-xs text-secondary mt-2">
            Must be 12+ characters with uppercase, lowercase, number, and special character
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-primary mb-2"> Confirm Password </label>
          <div
            class="neumorphic-inset p-3 {fieldErrors.confirmPassword ? 'border-2 border-red-400' : ''}"
          >
            <input
              type="password"
              bind:value={confirmPassword}
              on:input={() => {
                fieldErrors = { ...fieldErrors, confirmPassword: null };
              }}
              class="w-full bg-transparent outline-none text-primary placeholder-secondary"
              placeholder="••••••••"
              required
              autocomplete="new-password"
              maxlength="128"
              disabled={formDisabled}
            />
          </div>
          {#if fieldErrors.confirmPassword}
            <p class="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>
          {/if}
        </div>

        <button
          type="submit"
          disabled={isLoading || formDisabled}
          class="neumorphic-button w-full py-3 text-primary font-medium transition-all duration-200"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>

        <p class="text-sm text-secondary text-center mt-4">
          Already have an account?
          <button
            type="button"
            on:click={() => $goto('/login')}
            class="text-primary hover:underline font-medium"
          >
            Sign in
          </button>
        </p>
      </form>
    {/if}
  </div>
</div>
