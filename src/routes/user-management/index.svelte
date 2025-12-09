<script>
	import { onMount } from 'svelte';
	import { User } from '$lib/services/user.service';
	import { Company } from '$lib/services/company.service';
	import { Plus, Edit, Trash2, Building, Link2, Copy, RefreshCw, Check, X, Key, Clock } from 'lucide-svelte';
	import { createPageUrl } from '$lib/utils';
	import { listInvites, createInvite, revokeInvite } from '$lib/services/securityService';
	import { getToken } from '$lib/utils/auth';
	import { AUTH_BASE_URL } from '$lib/utils/constants';

	let users = [];
	let companies = [];
	let loading = true;
	let showAddModal = false;
	let editingUser = null;
	let invites = [];
	let invitesLoading = true;
	let latestInvite = null;
	let inviteForm = { email: '', expires_in_hours: 168 };
	let resetRequests = [];
	let resetRequestsLoading = true;
	let processingRequest = null;

	onMount(() => {
		loadUsers();
		loadCompanies();
		loadInvites();
		loadResetRequests();
	});

	async function loadUsers() {
		loading = true;
		try {
			const userList = await User.list();
			users = userList;
		} catch (error) {
			console.error('Failed to load users:', error);
		}
		loading = false;
	}

	async function loadCompanies() {
		try {
			const companyList = await Company.list();
			companies = companyList;
		} catch (error) {
			console.error('Failed to load companies:', error);
		}
	}

	async function handleAddUser(userData) {
		try {
			await User.create(userData);
			loadUsers();
			showAddModal = false;
		} catch (error) {
			console.error('Failed to add user:', error);
		}
	}

	async function handleEditUser(userId, userData) {
		try {
			await User.update(userId, userData);
			loadUsers();
			editingUser = null;
		} catch (error) {
			console.error('Failed to update user:', error);
		}
	}

	async function handleDeleteUser(userId) {
		if (!confirm('Are you sure you want to delete this user?')) return;
		try {
			await User.delete(userId);
			loadUsers();
		} catch (error) {
			console.error('Failed to delete user:', error);
		}
	}

	async function loadInvites() {
		invitesLoading = true;
		try {
			const data = await listInvites();
			invites = data?.invites || [];
		} catch (error) {
			console.error('Failed to load invites:', error);
		} finally {
			invitesLoading = false;
		}
	}

	async function handleCreateInvite(e) {
		e.preventDefault();
		try {
			const payload = {
				email: inviteForm.email.trim() || undefined,
				expires_in_hours: Number(inviteForm.expires_in_hours) || undefined,
			};
			const invite = await createInvite(payload);
			latestInvite = invite;
			inviteForm.email = '';
			await loadInvites();
		} catch (error) {
			console.error('Failed to create invite:', error);
			alert('Failed to create invite. Please try again.');
		}
	}

	async function handleRevokeInvite(token) {
		if (!confirm('Revoke this invite link? It will no longer work for new users.')) return;
		try {
			await revokeInvite(token);
			await loadInvites();
		} catch (error) {
			console.error('Failed to revoke invite:', error);
			alert('Failed to revoke invite. Please try again.');
		}
	}

	async function copyInviteLink(token) {
		const link = `${window.location.origin}/register?invite=${token}`;
		try {
			await navigator.clipboard.writeText(link);
			alert('Invite link copied to clipboard!');
		} catch {
			alert(`Copy failed. Use this link:\n${link}`);
		}
	}

	async function loadResetRequests() {
		resetRequestsLoading = true;
		try {
			const token = getToken();
			const res = await fetch(`${AUTH_BASE_URL}/password-reset-requests`, {
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});

			if (!res.ok) {
				throw new Error('Failed to load password reset requests');
			}

			const data = await res.json();
			resetRequests = Array.isArray(data) ? data : [];
		} catch (error) {
			console.error('Failed to load password reset requests:', error);
			resetRequests = [];
		} finally {
			resetRequestsLoading = false;
		}
	}

	async function handleApproveResetRequest(requestId) {
		if (!confirm('Approve this password reset request? A one-time reset token will be generated.')) return;

		processingRequest = requestId;
		try {
			const token = getToken();
			const res = await fetch(`${AUTH_BASE_URL}/password-reset-requests/${requestId}/approve`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});

			if (!res.ok) {
				throw new Error('Failed to approve reset request');
			}

			const data = await res.json();

			if (data.reset_token) {
				const resetLink = `${window.location.origin}/reset-password?token=${data.reset_token}`;
				const message = `Password reset approved!\n\nReset Token: ${data.reset_token}\n\nReset Link:\n${resetLink}\n\nPlease provide this token to the user. It expires in 24 hours.`;
				alert(message);

				try {
					await navigator.clipboard.writeText(resetLink);
				} catch (err) {
					console.error('Failed to copy to clipboard:', err);
				}
			}

			await loadResetRequests();
		} catch (error) {
			console.error('Failed to approve reset request:', error);
			alert('Failed to approve reset request. Please try again.');
		} finally {
			processingRequest = null;
		}
	}

	async function handleRejectResetRequest(requestId) {
		if (!confirm('Reject this password reset request? The user will need to submit a new request.')) return;

		processingRequest = requestId;
		try {
			const token = getToken();
			const res = await fetch(`${AUTH_BASE_URL}/password-reset-requests/${requestId}/reject`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});

			if (!res.ok) {
				throw new Error('Failed to reject reset request');
			}

			await loadResetRequests();
		} catch (error) {
			console.error('Failed to reject reset request:', error);
			alert('Failed to reject reset request. Please try again.');
		} finally {
			processingRequest = null;
		}
	}

	async function copyResetToken(token) {
		const link = `${window.location.origin}/reset-password?token=${token}`;
		try {
			await navigator.clipboard.writeText(link);
			alert('Reset link copied to clipboard!');
		} catch {
			alert(`Copy failed. Use this link:\n${link}`);
		}
	}

	function formatDate(dateString) {
		if (!dateString) return '—';
		const date = new Date(dateString);
		if (Number.isNaN(date.getTime())) return dateString;
		return date.toLocaleString();
	}
</script>

<svelte:head>
	<title>User Management</title>
</svelte:head>

<div class="p-6">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold text-gray-900">User Management</h1>
		<button
			on:click={() => showAddModal = true}
			class="neumorphic-button flex items-center gap-2 px-4 py-2 text-primary"
		>
			<Plus class="w-5 h-5" /> Add User
		</button>
	</div>

	<!-- Invites Section -->
	<div class="neumorphic-card p-6 mb-8">
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="text-xl font-semibold text-gray-900">Private Invite Links</h2>
				<p class="text-sm text-gray-600">
					Generate single-use URLs for onboarding when public registration is disabled.
				</p>
			</div>
			<button
				on:click={loadInvites}
				class="neumorphic-button px-4 py-2 text-primary flex items-center gap-2"
			>
				<RefreshCw class="w-4 h-4 {invitesLoading ? 'animate-spin' : ''}" />
				Refresh
			</button>
		</div>

		<form on:submit={handleCreateInvite} class="mt-4 grid gap-4 md:grid-cols-3">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Optional email hint</label>
				<input
					type="email"
					bind:value={inviteForm.email}
					placeholder="colleague@example.com"
					class="neumorphic-input w-full"
				/>
				<p class="text-xs text-gray-500 mt-1">Used only to label the invite.</p>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Expires in (hours)</label>
				<input
					type="number"
					min="1"
					max="720"
					bind:value={inviteForm.expires_in_hours}
					class="neumorphic-input w-full"
				/>
			</div>
			<div class="flex items-end">
				<button
					type="submit"
					class="neumorphic-button w-full py-3 text-primary font-medium flex items-center gap-2 justify-center"
				>
					<Link2 class="w-5 h-5" /> Generate Invite Link
				</button>
			</div>
		</form>

		{#if latestInvite}
			<div class="neumorphic-inset bg-gray-50 p-4 rounded-xl mt-4 text-sm text-gray-700 flex flex-col gap-2">
				<span class="font-semibold text-primary">New invite ready</span>
				<code class="block text-xs break-all bg-white p-3 rounded-lg border border-gray-200">
					{`${window.location.origin}/register?invite=${latestInvite.token}`}
				</code>
				<div class="flex gap-3">
					<button
						type="button"
						on:click={() => copyInviteLink(latestInvite.token)}
						class="neumorphic-button px-4 py-2 text-primary flex items-center gap-2"
					>
						<Copy class="w-4 h-4" /> Copy Link
					</button>
				</div>
			</div>
		{/if}

		<div class="mt-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-3">Active invites</h3>
			{#if invitesLoading}
				<p class="text-sm text-gray-600">Loading invites…</p>
			{:else if invites.length === 0}
				<p class="text-sm text-gray-600">No pending invites yet.</p>
			{:else}
				<div class="space-y-3">
					{#each invites as invite (invite.token)}
						{@const inviteLink = `${window.location.origin}/register?invite=${invite.token}`}
						<div class="neumorphic-inset p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
							<div>
								<p class="text-sm font-semibold text-gray-900">
									{invite.email || 'Unassigned invite'}
								</p>
								<p class="text-xs text-gray-600 break-all">{inviteLink}</p>
								<p class="text-xs text-gray-500 mt-1">
									{invite.used_at
										? `Used ${formatDate(invite.used_at)} by ${invite.used_by || 'unknown user'}`
										: invite.expires_at
										? `Expires ${formatDate(invite.expires_at)}`
										: 'No expiration set'}
								</p>
							</div>
							<div class="flex gap-2">
								<button
									type="button"
									on:click={() => copyInviteLink(invite.token)}
									class="neumorphic-button px-3 py-2 text-primary flex items-center gap-2 text-sm"
								>
									<Copy class="w-4 h-4" /> Copy
								</button>
								{#if !invite.used_at}
									<button
										type="button"
										on:click={() => handleRevokeInvite(invite.token)}
										class="neumorphic-button px-3 py-2 text-red-600 flex items-center gap-2 text-sm"
									>
										<Trash2 class="w-4 h-4" /> Revoke
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Password Reset Requests Section -->
	<div class="neumorphic-card p-6 mb-8">
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="text-xl font-semibold text-gray-900">Password Reset Requests</h2>
				<p class="text-sm text-gray-600">
					Review and approve user password reset requests. Approved requests generate a one-time reset token.
				</p>
			</div>
			<button
				on:click={loadResetRequests}
				class="neumorphic-button px-4 py-2 text-primary flex items-center gap-2"
			>
				<RefreshCw class="w-4 h-4 {resetRequestsLoading ? 'animate-spin' : ''}" />
				Refresh
			</button>
		</div>

		<div class="mt-6">
			{#if resetRequestsLoading}
				<p class="text-sm text-gray-600">Loading password reset requests...</p>
			{:else if resetRequests.length === 0}
				<p class="text-sm text-gray-600">No pending password reset requests.</p>
			{:else}
				<div class="space-y-4">
					{#each resetRequests as request (request.id)}
						{@const isPending = request.status === 'pending'}
						{@const isApproved = request.status === 'approved'}
						{@const isProcessing = processingRequest === request.id}

						<div class="neumorphic-inset p-4 rounded-xl">
							<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
								<div class="flex-1">
									<div class="flex items-center gap-3 mb-2">
										<p class="text-sm font-semibold text-gray-900">
											{request.user_email}
										</p>
										<span
											class="inline-block px-2 py-1 text-xs rounded-full {isPending
												? 'bg-yellow-100 text-yellow-800'
												: isApproved
												? 'bg-green-100 text-green-800'
												: request.status === 'rejected'
												? 'bg-red-100 text-red-800'
												: request.status === 'used'
												? 'bg-gray-100 text-gray-600'
												: 'bg-gray-100 text-gray-600'}"
										>
											{request.status}
										</span>
									</div>

									<div class="space-y-1 text-xs text-gray-600">
										<p>
											<Clock class="w-3 h-3 inline mr-1" />
											Requested: {formatDate(request.requested_at)}
										</p>
										{#if request.approved_at}
											<p>
												<Check class="w-3 h-3 inline mr-1" />
												{request.status === 'rejected' ? 'Rejected' : 'Approved'}: {formatDate(request.approved_at)}
												{#if request.approved_by} by {request.approved_by}{/if}
											</p>
										{/if}
										{#if request.used_at}
											<p>
												<Key class="w-3 h-3 inline mr-1" />
												Used: {formatDate(request.used_at)}
											</p>
										{/if}
										{#if request.expires_at && isApproved}
											<p class="text-amber-600 font-medium">
												<Clock class="w-3 h-3 inline mr-1" />
												Token expires: {formatDate(request.expires_at)}
											</p>
										{/if}
										{#if request.ip_address}
											<p class="text-gray-500">
												IP: {request.ip_address}
											</p>
										{/if}
										{#if request.user_agent}
											<p class="text-gray-500 truncate" title={request.user_agent}>
												Agent: {request.user_agent}
											</p>
										{/if}
									</div>

									{#if isApproved && request.reset_token}
										<div class="mt-3 p-3 bg-green-50 rounded-lg">
											<p class="text-xs font-semibold text-green-800 mb-1">Reset Token (expires in 24h):</p>
											<code class="block text-xs break-all font-mono text-green-900 bg-white p-2 rounded border border-green-200">
												{request.reset_token}
											</code>
											<p class="text-xs text-green-700 mt-2">
												Reset link: {window.location.origin}/reset-password?token={request.reset_token}
											</p>
										</div>
									{/if}
								</div>

								<div class="flex gap-2">
									{#if isPending}
										<button
											type="button"
											on:click={() => handleApproveResetRequest(request.id)}
											disabled={isProcessing}
											class="neumorphic-button px-3 py-2 text-green-600 flex items-center gap-2 text-sm disabled:opacity-50"
										>
											<Check class="w-4 h-4" />
											{isProcessing ? 'Approving...' : 'Approve'}
										</button>
										<button
											type="button"
											on:click={() => handleRejectResetRequest(request.id)}
											disabled={isProcessing}
											class="neumorphic-button px-3 py-2 text-red-600 flex items-center gap-2 text-sm disabled:opacity-50"
										>
											<X class="w-4 h-4" />
											{isProcessing ? 'Rejecting...' : 'Reject'}
										</button>
									{/if}
									{#if isApproved && request.reset_token}
										<button
											type="button"
											on:click={() => copyResetToken(request.reset_token)}
											class="neumorphic-button px-3 py-2 text-primary flex items-center gap-2 text-sm"
										>
											<Copy class="w-4 h-4" /> Copy Link
										</button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Users Grid -->
	{#if loading}
		<div>Loading...</div>
	{:else}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each users as user (user.id)}
				<div class="neumorphic-card p-6">
					<div class="flex justify-between items-start mb-4">
						<div>
							<h3 class="text-lg font-semibold text-gray-900">
								{user.name}
							</h3>
							<p class="text-sm text-gray-600">{user.email}</p>
							<div class="mt-2">
								<span
									class="inline-block px-2 py-1 text-xs rounded-full {user.role === 'admin'
										? 'bg-purple-100 text-purple-800'
										: 'bg-gray-100 text-gray-800'}"
								>
									{user.role}
								</span>
							</div>
						</div>
						<div class="flex gap-2">
							<button
								on:click={() => editingUser = user}
								class="neumorphic-button p-2 text-blue-600"
							>
								<Edit class="w-4 h-4" />
							</button>
							{#if user.role !== 'admin'}
								<button
									on:click={() => handleDeleteUser(user.id)}
									class="neumorphic-button p-2 text-red-600"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							{/if}
						</div>
					</div>

					{#if user.company_ids?.length > 0}
						<div class="mt-4">
							<h4 class="text-sm font-medium text-gray-700 mb-2">
								Associated Companies
							</h4>
							<div class="flex flex-wrap gap-2">
								{#each user.company_ids as companyId}
									{@const company = companies.find((c) => c.id === companyId)}
									<span
										class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
									>
										<Building class="w-3 h-3" />
										{company?.name || companyId}
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- User Form Modal (simplified - would need full implementation) -->
	{#if showAddModal || editingUser}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
				<h2 class="text-xl font-bold mb-4">
					{editingUser ? 'Edit User' : 'Add New User'}
				</h2>
				<p class="text-sm text-gray-600 mb-4">User form implementation goes here...</p>
				<div class="flex gap-3 justify-end">
					<button
						on:click={() => {
							showAddModal = false;
							editingUser = null;
						}}
						class="neumorphic-button px-4 py-2 text-gray-600"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
