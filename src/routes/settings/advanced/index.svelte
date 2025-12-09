<script>
	import { goto } from '@roxi/routify';
	import { ArrowLeft, Database, Wifi, AlertCircle, RefreshCw, Trash2, Info } from 'lucide-svelte';
	import { useSettings } from '$lib/services/settings.service';

	const {
		settings,
		isFeatureEnabled,
		toggleFeature,
		resetToDefaults,
		getCacheSize,
		clearCache,
		getPendingQueueSize
	} = useSettings();

	let showConfirm = false;
	let confirmAction = null;

	function formatBytes(bytes) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
	}

	function handleToggle(featureName) {
		// Warn if disabling localStorage with cached data
		if (featureName === 'localStorage' && isFeatureEnabled('localStorage')) {
			const cacheSize = getCacheSize();
			if (cacheSize > 10000) {
				confirmAction = {
					type: 'disableCache',
					message: `You have ${formatBytes(cacheSize)} of cached data. Disabling local cache will make all data load from the server. Continue?`,
					onConfirm: () => {
						toggleFeature(featureName);
						showConfirm = false;
					}
				};
				showConfirm = true;
				return;
			}
		}

		// Warn if disabling syncQueue with pending operations
		if (featureName === 'syncQueue' && isFeatureEnabled('syncQueue')) {
			const pendingOps = getPendingQueueSize();
			if (pendingOps > 0) {
				confirmAction = {
					type: 'disableQueue',
					message: `You have ${pendingOps} pending operation(s) that haven't synced yet. Disabling will prevent them from syncing. Continue?`,
					onConfirm: () => {
						toggleFeature(featureName);
						showConfirm = false;
					}
				};
				showConfirm = true;
				return;
			}
		}

		toggleFeature(featureName);
	}

	async function handleClearCache() {
		confirmAction = {
			type: 'clearCache',
			message: 'This will clear all locally cached data (localStorage + IndexedDB). You will need to reload data from the server. Continue?',
			onConfirm: async () => {
				const success = await clearCache();
				if (success) {
					alert('Cache cleared successfully (localStorage + IndexedDB). Page will reload.');
					window.location.reload();
				} else {
					alert('Error clearing cache. Check console for details.');
				}
				showConfirm = false;
			}
		};
		showConfirm = true;
	}

	function handleReset() {
		confirmAction = {
			type: 'reset',
			message: 'Reset all settings to defaults? This will reload the page.',
			onConfirm: () => {
				resetToDefaults();
				showConfirm = false;
				window.location.reload();
			}
		};
		showConfirm = true;
	}

	$: cacheSize = getCacheSize();
	$: pendingOps = getPendingQueueSize();
	$: maxCacheSize = settings.performance?.cacheMaxSize || (10 * 1024 * 1024);
</script>

<svelte:head>
	<title>Advanced Settings</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="neumorphic-card p-6">
		<div class="flex items-center gap-3 mb-2">
			<button
				on:click={() => $goto('/settings')}
				class="neumorphic-button p-2 text-secondary hover:text-primary transition-colors"
			>
				<ArrowLeft class="w-5 h-5" />
			</button>
			<h1 class="text-3xl font-bold text-primary">Advanced Settings</h1>
		</div>
		<p class="text-secondary ml-14">Configure performance and storage features</p>
	</div>

	<!-- Warning Banner -->
	<div class="neumorphic-card p-4 bg-yellow-50 border-2 border-yellow-400">
		<div class="flex items-start gap-3">
			<AlertCircle class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
			<div class="flex-1">
				<p class="text-sm font-semibold text-yellow-900 mb-1">Advanced Features</p>
				<p class="text-xs text-yellow-800">
					Changing these settings may affect app performance and offline functionality.
					The app will reload when you change certain settings.
				</p>
			</div>
		</div>
	</div>

	<!-- Feature Toggles -->
	<div class="neumorphic-card p-6">
		<h2 class="text-xl font-bold text-primary mb-4">Performance & Storage Features</h2>

		<div class="space-y-6">
			<!-- Local Storage Cache -->
			<div class="space-y-3">
				<div class="flex items-start justify-between">
					<div class="flex items-start gap-3 flex-1">
						<Database class="w-5 h-5 text-primary mt-1" />
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-1">
								<h3 class="font-semibold text-primary">
									{$settings.features?.localStorage?.label}
								</h3>
								<span class="text-xs px-2 py-0.5 rounded-full {isFeatureEnabled('localStorage')
									? 'bg-green-100 text-green-800'
									: 'bg-gray-100 text-gray-600'}">
									{isFeatureEnabled('localStorage') ? 'Enabled' : 'Disabled'}
								</span>
							</div>
							<p class="text-sm text-secondary mb-1">
								{$settings.features?.localStorage?.description}
							</p>
							<p class="text-xs text-muted italic">
								Impact: {$settings.features?.localStorage?.impact}
							</p>
							{#if isFeatureEnabled('localStorage')}
								<div class="mt-2 p-2 neumorphic-inset rounded-lg">
									<div class="flex items-center justify-between text-xs">
										<span class="text-secondary">Storage used:</span>
										<span class="font-mono text-primary">
											{formatBytes(cacheSize)} / {formatBytes(maxCacheSize)}
										</span>
									</div>
									<div class="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
										<div
											class="h-full bg-blue-500 transition-all"
											style="width: {Math.min((cacheSize / maxCacheSize) * 100, 100)}%"
										/>
									</div>
								</div>
							{/if}
						</div>
					</div>
					<label class="relative inline-flex items-center cursor-pointer ml-4">
						<input
							type="checkbox"
							checked={isFeatureEnabled('localStorage')}
							on:change={() => handleToggle('localStorage')}
							class="sr-only peer"
						/>
						<div class="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
					</label>
				</div>

				{#if isFeatureEnabled('localStorage')}
					<div class="ml-8 flex gap-2">
						<button
							on:click={handleClearCache}
							class="neumorphic-button px-3 py-1 text-xs text-secondary hover:text-primary flex items-center gap-1"
						>
							<Trash2 class="w-3 h-3" />
							Clear Cache
						</button>
					</div>
				{/if}
			</div>

			<!-- Sync Queue -->
			<div class="pt-4 border-t border-gray-200">
				<div class="flex items-start justify-between">
					<div class="flex items-start gap-3 flex-1">
						<Wifi class="w-5 h-5 text-primary mt-1" />
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-1">
								<h3 class="font-semibold text-primary">
									{$settings.features?.syncQueue?.label}
								</h3>
								<span class="text-xs px-2 py-0.5 rounded-full {isFeatureEnabled('syncQueue')
									? 'bg-green-100 text-green-800'
									: 'bg-gray-100 text-gray-600'}">
									{isFeatureEnabled('syncQueue') ? 'Enabled' : 'Disabled'}
								</span>
							</div>
							<p class="text-sm text-secondary mb-1">
								{$settings.features?.syncQueue?.description}
							</p>
							<p class="text-xs text-muted italic">
								Impact: {$settings.features?.syncQueue?.impact}
							</p>
							{#if isFeatureEnabled('syncQueue')}
								<div class="mt-2 p-2 neumorphic-inset rounded-lg">
									<div class="flex items-center justify-between text-xs">
										<span class="text-secondary">Pending operations:</span>
										<span class="font-mono {pendingOps > 0 ? 'text-yellow-600 font-semibold' : 'text-primary'}">
											{pendingOps}
										</span>
									</div>
								</div>
							{/if}
						</div>
					</div>
					<label class="relative inline-flex items-center cursor-pointer ml-4">
						<input
							type="checkbox"
							checked={isFeatureEnabled('syncQueue')}
							on:change={() => handleToggle('syncQueue')}
							class="sr-only peer"
						/>
						<div class="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
					</label>
				</div>
			</div>

			<!-- Advanced Validation -->
			<div class="pt-4 border-t border-gray-200">
				<div class="flex items-start justify-between">
					<div class="flex items-start gap-3 flex-1">
						<AlertCircle class="w-5 h-5 text-primary mt-1" />
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-1">
								<h3 class="font-semibold text-primary">
									{$settings.features?.advancedValidation?.label}
								</h3>
								<span class="text-xs px-2 py-0.5 rounded-full {isFeatureEnabled('advancedValidation')
									? 'bg-green-100 text-green-800'
									: 'bg-gray-100 text-gray-600'}">
									{isFeatureEnabled('advancedValidation') ? 'Enabled' : 'Disabled'}
								</span>
							</div>
							<p class="text-sm text-secondary mb-1">
								{$settings.features?.advancedValidation?.description}
							</p>
							<p class="text-xs text-muted italic">
								Impact: {$settings.features?.advancedValidation?.impact}
							</p>
						</div>
					</div>
					<label class="relative inline-flex items-center cursor-pointer ml-4">
						<input
							type="checkbox"
							checked={isFeatureEnabled('advancedValidation')}
							on:change={() => handleToggle('advancedValidation')}
							class="sr-only peer"
						/>
						<div class="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
					</label>
				</div>
			</div>
		</div>
	</div>

	<!-- Recommended Configurations -->
	<div class="neumorphic-card p-6">
		<h2 class="text-xl font-bold text-primary mb-4 flex items-center gap-2">
			<Info class="w-5 h-5" />
			Recommended Configurations
		</h2>

		<div class="grid md:grid-cols-2 gap-4">
			<div class="p-4 neumorphic-inset rounded-lg">
				<h3 class="font-semibold text-primary mb-2">Full Offline Support</h3>
				<p class="text-xs text-secondary mb-2">Best for unreliable connections</p>
				<div class="space-y-1 text-xs">
					<div class="flex items-center gap-2">
						<div class="w-2 h-2 rounded-full bg-green-500" />
						<span>Local Cache: ON</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-2 h-2 rounded-full bg-green-500" />
						<span>Sync Queue: ON</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-2 h-2 rounded-full bg-green-500" />
						<span>Validation: ON</span>
					</div>
				</div>
			</div>

			<div class="p-4 neumorphic-inset rounded-lg">
				<h3 class="font-semibold text-primary mb-2">Server-Only Mode</h3>
				<p class="text-xs text-secondary mb-2">Always fresh data, no local storage</p>
				<div class="space-y-1 text-xs">
					<div class="flex items-center gap-2">
						<div class="w-2 h-2 rounded-full bg-gray-400" />
						<span>Local Cache: OFF</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-2 h-2 rounded-full bg-gray-400" />
						<span>Sync Queue: OFF</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-2 h-2 rounded-full bg-green-500" />
						<span>Validation: ON</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="neumorphic-card p-6">
		<div class="flex justify-between items-center">
			<button
				on:click={handleReset}
				class="neumorphic-button px-6 py-3 text-secondary hover:text-primary font-medium flex items-center gap-2"
			>
				<RefreshCw class="w-4 h-4" />
				Reset to Defaults
			</button>
		</div>
	</div>

	<!-- Confirmation Modal -->
	{#if showConfirm}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="neumorphic-card p-6 max-w-md mx-4">
				<h3 class="text-lg font-bold text-primary mb-3">Confirm Action</h3>
				<p class="text-secondary mb-6">{confirmAction?.message}</p>
				<div class="flex gap-3 justify-end">
					<button
						on:click={() => showConfirm = false}
						class="neumorphic-button px-4 py-2 text-secondary hover:text-primary"
					>
						Cancel
					</button>
					<button
						on:click={confirmAction?.onConfirm}
						class="neumorphic-button px-4 py-2 text-primary font-semibold bg-blue-50"
					>
						Confirm
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
