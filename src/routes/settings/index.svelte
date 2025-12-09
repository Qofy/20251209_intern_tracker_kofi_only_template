<script>
	import { onMount } from 'svelte';
	import { goto } from '@roxi/routify';
	import { User } from '$lib/services/user.service';
	import { Product } from '$lib/services/product.service';
	import {
		Save,
		CreditCard,
		DollarSign,
		Smartphone,
		DownloadCloud,
		BrainCircuit,
		Banknote,
		Package,
		RefreshCw,
		Settings as SettingsIcon,
		ChevronRight,
		Info,
		Users,
		Palette,
		FileText,
		Layers,
		MessageSquare,
		Bike,
		Book,
		BookOpen,
		UserCog,
		HardDrive,
		Database,
		Bot,
		Network,
		ShoppingCart,
		Image as ImageIcon,
	} from 'lucide-svelte';
	import PaymentMethodConfig from '$lib/components/settings/PaymentMethodConfig.svelte';
	import { fetchRegistrationSettings, updateRegistrationSettings } from '$lib/services/securityService';
	import { auth } from '$lib/stores/auth';
    import { API_BASE_URL, PRODUCTS_API_URL } from '$lib/utils/constants';
    import { useSettings } from '$lib/services/settings.service';
	
	 $: canManageSystemSettings = $auth.permissions.has('manage_system_settings');

	const normalizeProductUrlKey = (url = '') =>
		String(url || '')
			.trim()
			.replace(/\/+$/, '')
			.toLowerCase();

	const DEFAULT_PRODUCTS_ENDPOINT = (PRODUCTS_API_URL || '').trim();
	const DEFAULT_PRODUCTS_ENDPOINT_KEY = normalizeProductUrlKey(DEFAULT_PRODUCTS_ENDPOINT);

	const dedupeAndSortSources = (list = []) => {
		const seen = new Set();
		if (DEFAULT_PRODUCTS_ENDPOINT_KEY) {
			seen.add(DEFAULT_PRODUCTS_ENDPOINT_KEY);
		}
		const cleaned = [];
		list.forEach((source = {}) => {
			const url = source.url?.trim();
			if (!url) return;
			const key = normalizeProductUrlKey(url);
			if (seen.has(key)) return;
			seen.add(key);
			cleaned.push({
				name: source.name?.trim() || url,
				url,
			});
		});
		return cleaned.sort((a, b) => a.url.localeCompare(b.url));
	};

	let paymentConfig = {
		stripe: { enabled: false, public_key: '', secret_key: '', success_url: '', cancel_url: '' },
		paypal: { enabled: false, client_id: '', client_secret: '', success_url: '', cancel_url: '' },
		hyperswitch: { enabled: false, public_key: '', secret_key: '', success_url: '', cancel_url: '' },
		mercadopago: { enabled: false, public_key: '', access_token: '', success_url: '', cancel_url: '' },
		jazzcash: { enabled: false, merchant_id: '', password: '', success_url: '', cancel_url: '' },
		easypaisa: { enabled: false, store_id: '', secret_key: '', success_url: '', cancel_url: '' },
		velmo: { enabled: false, api_key: '', secret_key: '', success_url: '', cancel_url: '' },
		revolut: { enabled: false, api_key: '', success_url: '', cancel_url: '' },
		klarna: { enabled: false, api_key: '', success_url: '', cancel_url: '' },
		bank_transfer: { enabled: false, iban: '', bic: '', account_name: '', bank_name: '' }
	};

	let aiConfig = {
		provider: 'openai',
		openai: { model: 'gpt-3.5-turbo', api_key: '', endpoint: 'https://api.openai.com/v1' },
		gemini: { model: 'gemini-pro', api_key: '' },
		anthropic: { model: 'claude-3-haiku-20240307', api_key: '' },
		mistral: { model: 'mistral-tiny', api_key: '' },
		ollama: { model: 'llama3:latest', endpoint: 'http://localhost:11434' }
	};

	let securityConfig = {
		registration_open: true,
		invite_only: false,
		invite_message: 'Registration is by private invite only.',
	};

	let securityState = {
		mode: 'public',
		effectiveOpen: true,
	};

	let securityLoading = true;
	let securitySaving = false;
	let loading = true;
	let saving = false;
	let productsUpdating = false;
	let productsCacheStatus = { cached: false, count: 0, last_updated: null };
	let productUpdateLog = null;
	let productSources = [];
	let newProductSource = { name: '', url: '' };

	const {
		settings: featureSettings,
		isFeatureEnabled: isFeatureEnabledFlag,
		toggleFeature: toggleFeatureFlag,
	} = useSettings();

	const featureIconMap = {
		multiUser: Users,
		userManagement: UserCog,
		whiteLabelBranding: Palette,
		personalizedLogo: ImageIcon,
		invoices: FileText,
		invoiceTemplates: Layers,
		quotes: MessageSquare,
		onlineSales: ShoppingCart,
		products: Package,
		loadProducts: DownloadCloud,
		fahrrad: Bike,
		blogs: BookOpen,
		imageGallery: ImageIcon,
		books: Book,
		localStorage: HardDrive,
		indexedDb: Database,
		aiChat: Bot,
		aiConnections: Network,
	};

	const featureGroups = [
		{
			title: 'Tenant & Branding',
			description: 'Control multi-user access, white-label settings, and branding surfaces.',
			keys: ['multiUser', 'userManagement', 'whiteLabelBranding', 'personalizedLogo'],
		},
		{
			title: 'Sales & Document Suites',
			description: 'Enable quoting, invoicing, and customer purchase flows.',
			keys: ['invoices', 'invoiceTemplates', 'quotes', 'onlineSales'],
		},
		{
			title: 'Catalog & Content',
			description: 'Manage products, editorial experiences, and marketing content.',
			keys: ['products', 'loadProducts', 'fahrrad', 'blogs', 'imageGallery', 'books'],
		},
		{
			title: 'Data & Intelligence',
			description: 'Configure storage and AI capabilities for this tenant.',
			keys: ['localStorage', 'indexedDb', 'aiChat', 'aiConnections'],
		},
	];

	let availableFeatures = {};
	$: if ($featureSettings && $featureSettings.features) {
		availableFeatures = $featureSettings.features;
	}

	const handleSourceFieldChange = (index, field, value) => {
		productSources = productSources.map((source, idx) =>
			idx === index ? { ...source, [field]: value } : source
		);
		const hasEmptyUrl = productSources.some((source) => !source.url?.trim());
		if (!hasEmptyUrl) {
			productSources = dedupeAndSortSources(productSources);
		}
	};

	const handleAddProductSource = () => {
		const name = newProductSource.name.trim();
		const url = newProductSource.url.trim();
		if (!name || !url) {
			alert('Please provide both a label and URL.');
			return;
		}
		const normalizedKey = normalizeProductUrlKey(url);
		if (!normalizedKey) {
			alert('Please provide a valid URL.');
			return;
		}
		if (DEFAULT_PRODUCTS_ENDPOINT_KEY && normalizedKey === DEFAULT_PRODUCTS_ENDPOINT_KEY) {
			alert('This endpoint is already provided by the environment configuration.');
			newProductSource = { name: '', url: '' };
			return;
		}
		if (productSources.some((source) => normalizeProductUrlKey(source.url) === normalizedKey)) {
			alert('This endpoint is already configured.');
			newProductSource = { name: '', url: '' };
			return;
		}
		productSources = dedupeAndSortSources([...productSources, { name, url }]);
		newProductSource = { name: '', url: '' };
	};

	const handleRemoveProductSource = (index) => {
		productSources = dedupeAndSortSources(productSources.filter((_, idx) => idx !== index));
	};

	onMount(() => { loadSettings(); loadProductsStatus(); loadSecuritySettings(); });

	async function loadSettings() {
		try {
			const user = await User.me();
			if (user.payment_config) {
				paymentConfig = { ...paymentConfig, ...user.payment_config };
			}
			if (user.ai_config) {
				aiConfig = {
					...aiConfig,
					...user.ai_config,
					openai: {...aiConfig.openai, ...(user.ai_config.openai || {})},
					gemini: {...aiConfig.gemini, ...(user.ai_config.gemini || {})},
					anthropic: {...aiConfig.anthropic, ...(user.ai_config.anthropic || {})},
					mistral: {...aiConfig.mistral, ...(user.ai_config.mistral || {})},
					ollama: {...aiConfig.ollama, ...(user.ai_config.ollama || {})},
				};
			}
			if (Array.isArray(user.product_sources)) {
				productSources = dedupeAndSortSources(user.product_sources);
			} else {
				productSources = [];
			}
		} catch (error) {
			console.error('Error loading settings:', error);
		} finally {
			loading = false;
		}
	}

	async function loadSecuritySettings() {
		securityLoading = true;
		try {
			const data = await fetchRegistrationSettings();
			securityConfig = {
				...securityConfig,
				registration_open:
					typeof data?.registration_flag === 'boolean'
						? data.registration_flag
						: data?.registration_open !== false,
				invite_only: !!data?.invite_only,
				invite_message: data?.message || securityConfig.invite_message,
			};
			securityState = {
				mode: data?.mode || (data?.invite_only ? 'invite_only' : data?.registration_open !== false ? 'public' : 'closed'),
				effectiveOpen: data?.registration_open !== false,
			};
		} catch (error) {
			console.error('Error loading access settings:', error);
		} finally {
			securityLoading = false;
		}
	}

	async function handleSave() {
		saving = true;
		try {
			await User.updateMyUserData({
				payment_config: paymentConfig,
				ai_config: aiConfig,
				product_sources: productSources,
			});
			alert('Settings saved successfully!');
		} catch (error) {
			console.error('Error saving settings:', error);
			alert('Error saving settings. Please try again.');
		} finally {
			saving = false;
		}
	}

	async function handleSecuritySave() {
		securitySaving = true;
		try {
			await updateRegistrationSettings(securityConfig);
			await loadSecuritySettings();
			alert('Access settings saved successfully!');
		} catch (error) {
			console.error('Error saving access settings:', error);
			alert('Error saving access settings. Please try again.');
		} finally {
			securitySaving = false;
		}
	}

	const updatePaymentMethod = (method, config) => {
		paymentConfig = { ...paymentConfig, [method]: { ...paymentConfig[method], ...config } };
	};

	const handleAiConfigChange = (provider, key, value) => {
		if(provider === 'provider') { aiConfig = {...aiConfig, provider: value}; }
		else { aiConfig = { ...aiConfig, [provider]: { ...aiConfig[provider], [key]: value } }; }
	};

	async function loadProductsStatus() {
		try {
			const status = await Product.getCacheStatus();
			productsCacheStatus = status;
		} catch (error) {
			console.error('Error loading products cache status:', error);
		}
	}

	async function handleUpdateProducts(source) {
		const sourceLabel = source?.name?.trim() || 'Default (.env)';
		const overrideUrl = source?.url?.trim();
		const endpoint = `${API_BASE_URL.replace(/\/$/, '')}/products/update`;
		productsUpdating = true;
		productUpdateLog = {
			status: 'pending',
			url: overrideUrl || 'ENV/PRODUCTS_API_URL',
			label: sourceLabel,
			message: 'Sending request to backend...',
			timestamp: new Date().toISOString(),
		};
		try {
			const result = await Product.updateFromExternal(
				overrideUrl ? { url: overrideUrl } : {}
			);
			await loadProductsStatus();
			const successCount = result?.count_incoming ?? 0;
			productUpdateLog = {
				status: 'success',
				url: overrideUrl || 'ENV/PRODUCTS_API_URL',
				label: sourceLabel,
				message: result?.message || 'Products updated',
				timestamp: new Date().toISOString(),
				details: {
					countIncoming: successCount,
					countFailed: result?.count_failed ?? 0,
					countAdded: result?.count_added ?? 0,
					countUpdated: result?.count_updated ?? 0,
					lastUpdated: result?.last_updated,
					sourceEndpoint: result?.source_url || overrideUrl || endpoint,
				},
			};
			alert(
				`${sourceLabel}: imported ${successCount} records${
					result?.count_added ? `, added ${result.count_added}` : ''
				}${
					result?.count_updated ? `, updated ${result.count_updated}` : ''
				}${
					result?.count_failed ? ` (${result.count_failed} failed)` : ''
				}.`,
			);
		} catch (error) {
			console.error('Error updating products:', error);
			productUpdateLog = {
				status: 'error',
				url: overrideUrl || 'ENV/PRODUCTS_API_URL',
				label: sourceLabel,
				message: error?.data?.error || error?.message || 'Update failed',
				timestamp: new Date().toISOString(),
				details: error?.data,
			};
			alert('Error updating products. Please try again.');
		} finally {
			productsUpdating = false;
		}
	}

	const paymentFields = {
		stripe: [ { key: 'public_key', label: 'Publishable Key', type: 'text', placeholder: 'pk_test_...' }, { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'sk_test_...' } ],
		paypal: [ { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Your PayPal Client ID' }, { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Your PayPal Client Secret' } ],
		hyperswitch: [ { key: 'public_key', label: 'Public Key', type: 'text', placeholder: 'Your Hyperswitch Public Key' }, { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'Your Hyperswitch Secret Key' } ],
		mercadopago: [ { key: 'public_key', label: 'Public Key', type: 'text', placeholder: 'Your Mercado Pago Public Key' }, { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Your Mercado Pago Access Token' } ],
		jazzcash: [ { key: 'merchant_id', label: 'Merchant ID', type: 'text', placeholder: 'Your JazzCash Merchant ID' }, { key: 'password', label: 'Password', type: 'password', placeholder: 'Your JazzCash Password' } ],
		easypaisa: [ { key: 'store_id', label: 'Store ID', type: 'text', placeholder: 'Your EasyPaisa Store ID' }, { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'Your EasyPaisa Secret Key' } ],
		velmo: [ { key: 'api_key', label: 'API Key', type: 'text', placeholder: 'Your Velmo API Key' }, { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'Your Velmo Secret Key' } ],
		revolut: [ { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your Revolut API Key' } ],
		klarna: [ { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your Klarna API Key' } ],
		bank_transfer: [
			{ key: 'account_name', label: 'Account Holder Name', type: 'text' },
			{ key: 'bank_name', label: 'Bank Name', type: 'text' },
			{ key: 'iban', label: 'IBAN', type: 'text' },
			{ key: 'bic', label: 'BIC / SWIFT', type: 'text' }
		]
	};
	const commonFields = [ { key: 'success_url', label: 'Success URL', type: 'text', placeholder: 'https://.../payment-success' }, { key: 'cancel_url', label: 'Cancel URL', type: 'text', placeholder: 'https://.../payment-cancel' } ];
</script>

<svelte:head>
	<title>Settings</title>
</svelte:head>

{#if loading}
	<div>Loading...</div>
{:else}
	<div class="space-y-6">
		<div class="neumorphic-card p-6">
			<div class="flex justify-between items-center">
				<div>
					<h1 class="text-3xl font-bold text-primary mb-2">Settings</h1>
					<p class="text-secondary">Configure payment methods and manage application data</p>
				</div>
				<button on:click={handleSave} disabled={saving} class="neumorphic-button px-6 py-3 text-primary font-medium flex items-center gap-2">
					<Save class="w-5 h-5" /> {saving ? 'Saving...' : 'Save Settings'}
				</button>
			</div>
		</div>

		<!-- Advanced Settings Link -->
		{#if canManageSystemSettings}
			<div
				class="neumorphic-card p-6 cursor-pointer hover:shadow-lg transition-shadow"
				on:click={() => $goto('/settings/advanced')}
				on:keypress={() => $goto('/settings/advanced')}
				role="button"
				tabindex="0"
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<div class="neumorphic-inset p-3 rounded-lg">
							<SettingsIcon class="w-6 h-6 text-primary" />
						</div>
						<div>
							<h3 class="text-lg font-semibold text-primary">Advanced Settings</h3>
							<p class="text-sm text-secondary mt-1">
								Configure LocalStorage cache, Sync Queue, and Advanced Validation features
							</p>
						</div>
					</div>
					<ChevronRight class="w-6 h-6 text-secondary" />
				</div>
			</div>
		{/if}

		<div class="neumorphic-card p-6">
			<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
				<div>
					<h2 class="text-xl font-bold text-primary">Feature Toggles</h2>
					<p class="text-sm text-secondary mt-1">
						Enable or disable product modules to tailor multi-user, white-label deployments per tenant.
					</p>
				</div>
				<div class="neumorphic-inset px-3 py-2 text-xs text-secondary rounded-lg">
					<span class="font-semibold text-primary">Tip:</span> Changes apply instantly and persist locally for
					this tenant.
				</div>
			</div>

			<div class="space-y-8">
				{#if availableFeatures && Object.keys(availableFeatures).length > 0}
					{#each featureGroups as group}
						{@const visibleKeys = group.keys.filter((key) => availableFeatures[key])}
					{#if visibleKeys.length > 0}
						<div class="space-y-4">
							<div>
								<h3 class="text-lg font-semibold text-primary">{group.title}</h3>
								<p class="text-sm text-secondary mt-1">{group.description}</p>
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								{#each visibleKeys as key}
									{@const feature = availableFeatures[key]}
									{#if feature}
									{@const Icon = featureIconMap[key] || Info}
									{@const enabled = isFeatureEnabledFlag(key)}
									<div class="neumorphic-inset p-4 flex items-start justify-between gap-4">
										<div class="flex items-start gap-3">
											<div class="neumorphic-button p-2 text-primary flex-shrink-0">
												<svelte:component this={Icon} class="w-4 h-4" />
											</div>
											<div>
												<div class="flex items-center gap-2">
													<h4 class="font-semibold text-primary">{feature.label}</h4>
													<span
														class="text-xs px-2 py-0.5 rounded-full {enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}"
													>
														{enabled ? 'Enabled' : 'Disabled'}
													</span>
												</div>
												{#if feature.description}
													<p class="text-sm text-secondary mt-1">{feature.description}</p>
												{/if}
												{#if feature.impact}
													<p class="text-xs text-muted italic mt-1">Impact: {feature.impact}</p>
												{/if}
											</div>
										</div>
										<label class="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												class="sr-only peer"
												checked={enabled}
												on:change={() => toggleFeatureFlag(key)}
												aria-label="Toggle {feature.label}"
											/>
											<div class="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
										</label>
									</div>
									{/if}
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			{/if}
			</div>
		</div>

		{#if canManageSystemSettings}
			<div class="neumorphic-card p-6">
				<div class="flex items-start justify-between">
					<div>
						<h2 class="text-xl font-bold text-primary mb-1">Access Control</h2>
						<p class="text-sm text-secondary">
							Manage public registration and the private invite workflow for new users.
						</p>
						<p class="text-xs text-secondary mt-2">
							<span class="font-semibold text-primary">Effective mode:</span>{' '}
							{securityState.mode === 'invite_only'
								? 'Invite Only'
								: securityState.mode === 'closed'
									? 'Registration Closed'
									: 'Public Registration'}
							{' · '}
							{securityState.effectiveOpen ? 'Register endpoint enabled' : 'Register endpoint disabled'}
						</p>
					</div>
					{#if securityLoading}
						<span class="text-xs text-secondary">Loading…</span>
					{/if}
				</div>

				<div class="mt-4 space-y-4">
					<label class="flex items-start gap-3">
						<input
							type="checkbox"
							class="mt-1"
							bind:checked={securityConfig.registration_open}
							on:change={(e) => {
								if (e.target.checked) {
									securityConfig.invite_only = false;
								}
							}}
							disabled={securityLoading || securitySaving}
						/>
						<div>
							<p class="font-semibold text-primary">Allow public registration</p>
							<p class="text-sm text-secondary">
								When disabled, only admins can invite new users.
							</p>
						</div>
					</label>

					<label class="flex items-start gap-3 {securityConfig.registration_open ? 'opacity-60' : ''}">
						<input
							type="checkbox"
							class="mt-1"
							bind:checked={securityConfig.invite_only}
							disabled={securityLoading || securitySaving || securityConfig.registration_open}
						/>
						<div>
							<p class="font-semibold text-primary">Require invite-only links</p>
							<p class="text-sm text-secondary">
								Show a "Registration is by private invite only" notice when public sign-up is closed.
							</p>
						</div>
					</label>

					<div>
						<label class="block text-sm font-medium text-primary mb-2">
							Invite-only message
						</label>
						<div class="neumorphic-inset p-3">
							<textarea
								rows={3}
								bind:value={securityConfig.invite_message}
								disabled={securityLoading || securitySaving}
								class="w-full bg-transparent outline-none text-primary placeholder-secondary resize-none"
								placeholder="Registration is by private invite only."
							/>
						</div>
					</div>
				</div>

				<button
					on:click={handleSecuritySave}
					disabled={securityLoading || securitySaving}
					class="neumorphic-button px-6 py-3 text-primary font-medium flex items-center gap-2 mt-6"
				>
					<RefreshCw class="w-5 h-5 {securitySaving ? 'animate-spin' : ''}" />
					{securitySaving ? 'Saving access settings...' : 'Save Access Settings'}
				</button>
			</div>
		{:else}
			<div class="neumorphic-card p-6">
				<h2 class="text-xl font-bold text-primary mb-2">Access Control</h2>
				<p class="text-sm text-secondary">
					Only workspace administrators can modify registration and invite policies. Contact a super admin if you need changes.
				</p>
			</div>
		{/if}

		<div class="neumorphic-card p-6">
			<h2 class="text-xl font-bold text-primary mb-4">Payment Methods</h2>
			<div class="grid lg:grid-cols-2 gap-6">
				<PaymentMethodConfig title="Stripe" icon={CreditCard} method="stripe" config={paymentConfig.stripe} onUpdate={(config) => updatePaymentMethod('stripe', config)} fields={[...paymentFields.stripe, ...commonFields]} />
				<PaymentMethodConfig title="PayPal" icon={DollarSign} method="paypal" config={paymentConfig.paypal} onUpdate={(config) => updatePaymentMethod('paypal', config)} fields={[...paymentFields.paypal, ...commonFields]} />
				<PaymentMethodConfig title="Hyperswitch" icon={CreditCard} method="hyperswitch" config={paymentConfig.hyperswitch} onUpdate={(config) => updatePaymentMethod('hyperswitch', config)} fields={[...paymentFields.hyperswitch, ...commonFields]} />
				<PaymentMethodConfig title="Mercado Pago" icon={DollarSign} method="mercadopago" config={paymentConfig.mercadopago} onUpdate={(config) => updatePaymentMethod('mercadopago', config)} fields={[...paymentFields.mercadopago, ...commonFields]} />
				<PaymentMethodConfig title="JazzCash" icon={Smartphone} method="jazzcash" config={paymentConfig.jazzcash} onUpdate={(config) => updatePaymentMethod('jazzcash', config)} fields={[...paymentFields.jazzcash, ...commonFields]} />
				<PaymentMethodConfig title="EasyPaisa" icon={Smartphone} method="easypaisa" config={paymentConfig.easypaisa} onUpdate={(config) => updatePaymentMethod('easypaisa', config)} fields={[...paymentFields.easypaisa, ...commonFields]} />
				<PaymentMethodConfig title="Velmo" icon={Smartphone} method="velmo" config={paymentConfig.velmo} onUpdate={(config) => updatePaymentMethod('velmo', config)} fields={[...paymentFields.velmo, ...commonFields]} />
				<PaymentMethodConfig title="Revolut" icon={CreditCard} method="revolut" config={paymentConfig.revolut} onUpdate={(config) => updatePaymentMethod('revolut', config)} fields={[...paymentFields.revolut, ...commonFields]} />
				<PaymentMethodConfig title="Klarna" icon={CreditCard} method="klarna" config={paymentConfig.klarna} onUpdate={(config) => updatePaymentMethod('klarna', config)} fields={[...paymentFields.klarna, ...commonFields]} />
				<PaymentMethodConfig title="Bank Transfer" icon={Banknote} method="bank_transfer" config={paymentConfig.bank_transfer} onUpdate={(config) => updatePaymentMethod('bank_transfer', config)} fields={paymentFields.bank_transfer} />
			</div>
		</div>

		<div class="neumorphic-card p-6">
			<h2 class="text-xl font-bold text-primary mb-4 flex items-center gap-3">
				<BrainCircuit class="w-6 h-6"/> AI Provider Configuration
			</h2>

			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-primary mb-2">
						Active AI Provider
					</label>
					<div class="neumorphic-inset p-1">
						<select bind:value={aiConfig.provider} on:change={(e) => handleAiConfigChange('provider', null, e.target.value)} class="w-full bg-transparent outline-none p-2 text-primary placeholder-secondary">
							<option value="openai">OpenAI</option>
							<option value="gemini">Google Gemini</option>
							<option value="anthropic">Anthropic</option>
							<option value="mistral">Mistral</option>
							<option value="ollama">Ollama (Local)</option>
						</select>
					</div>
				</div>
				<div class="neumorphic-inset p-4 space-y-4">
					{#if aiConfig.provider === 'openai'}
						<div>
							<h4 class="font-semibold text-primary mb-2">OpenAI Settings</h4>
							<div class="space-y-3">
								<div>
									<label class="block text-sm font-medium text-primary mb-1">API Key</label>
									<div class="neumorphic-inset p-3"><input type="password" bind:value={aiConfig.openai.api_key} on:input={e => handleAiConfigChange('openai', 'api_key', e.target.value)} class="w-full bg-transparent outline-none text-primary" placeholder="sk-proj-..." /></div>
								</div>
								<div>
									<label class="block text-sm font-medium text-primary mb-1">Model Name</label>
									<div class="neumorphic-inset p-3"><input type="text" bind:value={aiConfig.openai.model} on:input={e => handleAiConfigChange('openai', 'model', e.target.value)} class="w-full bg-transparent outline-none text-primary" placeholder="gpt-4, gpt-3.5-turbo, etc." /></div>
								</div>
								<div>
									<label class="block text-sm font-medium text-primary mb-1">API Endpoint</label>
									<div class="neumorphic-inset p-3"><input type="text" bind:value={aiConfig.openai.endpoint} on:input={e => handleAiConfigChange('openai', 'endpoint', e.target.value)} class="w-full bg-transparent outline-none text-primary" placeholder="https://api.openai.com/v1" /></div>
								</div>
							</div>
						</div>
					{/if}
					{#if aiConfig.provider === 'gemini'}
						<div>
							<h4 class="font-semibold text-primary mb-2">Google Gemini Settings</h4>
							<div class="space-y-3">
								<div>
									<label class="block text-sm font-medium text-primary mb-1">API Key</label>
									<div class="neumorphic-inset p-3"><input type="password" bind:value={aiConfig.gemini.api_key} on:input={e => handleAiConfigChange('gemini', 'api_key', e.target.value)} class="w-full bg-transparent outline-none text-primary" placeholder="AIza..." /></div>
								</div>
								<div>
									<label class="block text-sm font-medium text-primary mb-1">Model Name</label>
									<div class="neumorphic-inset p-3"><input type="text" bind:value={aiConfig.gemini.model} on:input={e => handleAiConfigChange('gemini', 'model', e.target.value)} class="w-full bg-transparent outline-none text-primary" placeholder="gemini-pro, gemini-1.5-pro, etc." /></div>
								</div>
							</div>
						</div>
					{/if}
					{#if aiConfig.provider === 'anthropic'}
						<div>
							<h4 class="font-semibold text-primary mb-2">Anthropic Settings</h4>
							<div class="space-y-3">
								<div>
									<label class="block text-sm font-medium text-primary mb-1">API Key</label>
									<div class="neumorphic-inset p-3"><input type="password" bind:value={aiConfig.anthropic.api_key} on:input={e => handleAiConfigChange('anthropic', 'api_key', e.target.value)} class="w-full bg-transparent outline-none text-primary" placeholder="sk-ant-..." /></div>
								</div>
								<div>
									<label class="block text-sm font-medium text-primary mb-1">Model Name</label>
									<div class="neumorphic-inset p-3"><input type="text" bind:value={aiConfig.anthropic.model} on:input={e => handleAiConfigChange('anthropic', 'model', e.target.value)} class="w-full bg-transparent outline-none text-primary" placeholder="claude-3-haiku-20240307, claude-3-sonnet-20240229, etc." /></div>
								</div>
							</div>
						</div>
					{/if}
					{#if aiConfig.provider === 'mistral'}
						<div>
							<h4 class="font-semibold text-primary mb-2">Mistral Settings</h4>
							<div class="space-y-3">
								<div>
									<label class="block text-sm font-medium text-primary mb-1">API Key</label>
									<div class="neumorphic-inset p-3"><input type="password" bind:value={aiConfig.mistral.api_key} on:input={e => handleAiConfigChange('mistral', 'api_key', e.target.value)} class="w-full bg-transparent outline-none text-primary" placeholder="Your Mistral API Key" /></div>
								</div>
								<div>
									<label class="block text-sm font-medium text-primary mb-1">Model Name</label>
									<div class="neumorphic-inset p-3"><input type="text" bind:value={aiConfig.mistral.model} on:input={e => handleAiConfigChange('mistral', 'model', e.target.value)} class="w-full bg-transparent outline-none text-primary" placeholder="mistral-tiny, mistral-small, mistral-medium, etc." /></div>
								</div>
							</div>
						</div>
					{/if}
					{#if aiConfig.provider === 'ollama'}
						<div>
							<h4 class="font-semibold text-primary mb-2">Ollama (Local) Settings</h4>
							<div class="space-y-3">
								<div>
									<label class="block text-sm font-medium text-primary mb-1">Endpoint URL</label>
									<div class="neumorphic-inset p-3"><input type="text" bind:value={aiConfig.ollama.endpoint} on:input={e => handleAiConfigChange('ollama', 'endpoint', e.target.value)} class="w-full bg-transparent outline-none text-primary" placeholder="http://localhost:11434" /></div>
								</div>
								<div>
									<label class="block text-sm font-medium text-primary mb-1">Model Name</label>
									<div class="neumorphic-inset p-3"><input type="text" bind:value={aiConfig.ollama.model} on:input={e => handleAiConfigChange('ollama', 'model', e.target.value)} class="w-full bg-transparent outline-none text-primary" placeholder="llama3:latest, codellama, mistral, etc." /></div>
								</div>
							</div>
						</div>
					{/if}
					<div class="text-xs text-secondary pt-3" style="border-top: 1px solid #d4d4d4">
						<p><strong>Security Note:</strong> API keys are stored securely and encrypted. Never share your API keys publicly. For production use, ensure your keys have appropriate permissions and rate limits configured.</p>
					</div>
				</div>
			</div>
		</div>

		<div class="neumorphic-card p-6">
			<h2 class="text-xl font-bold text-primary mb-4 flex items-center gap-3">
				<Package class="w-6 h-6"/> Product Data
			</h2>
			<div class="space-y-4">
				<div class="flex flex-col md:flex-row items-center gap-6">
					<div class="neumorphic-inset p-4 flex-shrink-0">
						<Package class="w-8 h-8 text-primary" />
					</div>
					<div class="flex-1">
						<h3 class="font-semibold text-primary">Update Products from External API</h3>
						<p class="text-sm text-secondary mt-1">
							Fetch and cache the latest products from Velophil external API. Products are cached in the backend for faster loading.
						</p>
						<div class="mt-2 text-xs text-secondary space-y-1">
							<p>
								<strong>Cached Products:</strong>{' '}
								{productsCacheStatus.count ?? 0}
							</p>
							<p>
								<strong>Last Updated:</strong>{' '}
								{productsCacheStatus.last_updated
									? new Date(productsCacheStatus.last_updated).toLocaleString()
									: 'Never'}
							</p>
							{#if !productsCacheStatus.cached}
								<p class="text-[11px] text-amber-600 flex items-center gap-1">
									<Info class="w-3 h-3" />
									Cache empty. Run "Update Products" to pull data from the external API.
								</p>
							{/if}
						</div>
					</div>
					<button
						on:click={() => handleUpdateProducts()}
						disabled={productsUpdating}
						class="neumorphic-button px-6 py-3 text-primary font-medium flex items-center gap-2"
					>
						<RefreshCw class="w-5 h-5 {productsUpdating ? 'animate-spin' : ''}" />
						{productsUpdating ? 'Updating...' : 'Update Products'}
					</button>
				</div>
				<div class="space-y-3">
					<h4 class="font-semibold text-primary">Additional Sources</h4>
					{#if productSources.length === 0}
						<p class="text-xs text-secondary">
							No custom sources yet. Add endpoints below to merge products from multiple feeds.
						</p>
					{/if}
					{#each productSources as source, index (`${source.name || 'source'}-${index}`)}
						<div class="neumorphic-inset p-4 space-y-3">
							<div class="grid md:grid-cols-2 gap-3">
								<div>
									<label class="text-xs uppercase tracking-wide text-secondary">Label</label>
									<input
										type="text"
										value={source.name}
										on:input={(e) => handleSourceFieldChange(index, 'name', e.target.value)}
										class="neumorphic-inset mt-1 p-2 w-full bg-transparent outline-none text-sm"
										placeholder="Velophil EU"
									/>
								</div>
								<div>
									<label class="text-xs uppercase tracking-wide text-secondary">URL</label>
									<input
										type="url"
										value={source.url}
										on:input={(e) => handleSourceFieldChange(index, 'url', e.target.value)}
										class="neumorphic-inset mt-1 p-2 w-full bg-transparent outline-none text-sm"
										placeholder="https://example.com/api/products"
									/>
								</div>
							</div>
							<div class="flex flex-wrap gap-2">
								<button
									on:click={() => handleUpdateProducts(source)}
									class="neumorphic-button px-4 py-2 text-sm flex items-center gap-2"
									disabled={!source.url}
								>
									<RefreshCw class="w-4 h-4 {productsUpdating ? 'animate-spin' : ''}" />
									Update {source.name || `Source ${index + 1}`}
								</button>
								<button
									on:click={() => handleRemoveProductSource(index)}
									class="neumorphic-button px-3 py-2 text-sm text-red-500"
								>
									Remove
								</button>
							</div>
						</div>
					{/each}
					<div class="neumorphic-inset p-4 space-y-3">
						<h5 class="text-sm font-semibold text-primary">Add new source</h5>
						<div class="grid md:grid-cols-2 gap-3">
							<input
								type="text"
								bind:value={newProductSource.name}
								class="neumorphic-inset p-2 bg-transparent outline-none text-sm"
								placeholder="Label"
							/>
							<input
								type="url"
								bind:value={newProductSource.url}
								class="neumorphic-inset p-2 bg-transparent outline-none text-sm"
								placeholder="https://source.example/api/products"
							/>
						</div>
						<button
							type="button"
							on:click={handleAddProductSource}
							class="neumorphic-button px-4 py-2 text-sm text-primary"
						>
							Add Source
						</button>
					</div>
				</div>
				{#if productUpdateLog}
					<div
						class="mt-4 w-full text-xs rounded-2xl border p-4 space-y-2 {productUpdateLog.status === 'error'
								? 'border-red-300 text-red-600'
								: productUpdateLog.status === 'success'
									? 'border-emerald-300 text-primary'
									: 'border-amber-300 text-secondary'}"
					>
						<div class="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide">
							<span>Last request</span>
							<span class="text-secondary">
								{new Date(productUpdateLog.timestamp).toLocaleString()}
							</span>
						</div>
						<div class="font-mono text-[11px] break-all">
							{productUpdateLog.label ? `[${productUpdateLog.label}] ` : ''}
							{productUpdateLog.url}
						</div>
						<div class="flex flex-wrap gap-2">
							<span class="font-semibold">
								Status: {productUpdateLog.status}
							</span>
							<span class="text-secondary">
								{productUpdateLog.message}
							</span>
						</div>
						{#if productUpdateLog.details}
							<div class="grid gap-1 text-secondary">
								{#if 'countIncoming' in productUpdateLog.details}
									<span>Imported: {productUpdateLog.details.countIncoming}</span>
								{/if}
								{#if 'countAdded' in productUpdateLog.details}
									<span>Added: {productUpdateLog.details.countAdded}</span>
								{/if}
								{#if 'countUpdated' in productUpdateLog.details}
									<span>Updated: {productUpdateLog.details.countUpdated}</span>
								{/if}
								{#if 'countFailed' in productUpdateLog.details}
									<span>Skipped: {productUpdateLog.details.countFailed}</span>
								{/if}
								{#if productUpdateLog.details.status}
									<span>HTTP Status: {productUpdateLog.details.status}</span>
								{/if}
								{#if productUpdateLog.details.lastUpdated}
									<span>
										Backend timestamp:{' '}
										{new Date(productUpdateLog.details.lastUpdated).toLocaleString()}
									</span>
								{/if}
								{#if productUpdateLog.details.sourceEndpoint}
									<span class="break-all">
										Source: {productUpdateLog.details.sourceEndpoint}
									</span>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
				<div class="neumorphic-inset p-4 space-y-2 text-sm text-secondary">
					<p><strong>About Products:</strong></p>
					<ul class="list-disc list-inside text-xs">
						<li>Products are fetched from the configured external API (PRODUCTS_API_URL in .env)</li>
						<li>Backend caches products in memory for fast access</li>
						<li>Click "Update Products" to refresh the cache with latest data</li>
						<li>Products can be used in blog advertisements and quotes</li>
					</ul>
				</div>
			</div>
		</div>

		<div class="neumorphic-card p-6">
			<h2 class="text-xl font-bold text-primary mb-4">Data Backup</h2>
			<div class="flex flex-col md:flex-row items-center gap-6">
				<div class="neumorphic-inset p-4 flex-shrink-0"><DownloadCloud class="w-8 h-8 text-primary" /></div>
				<div class="flex-1">
					<h3 class="font-semibold text-primary">Create a Backup of Your Data</h3>
					<p class="text-sm text-secondary mt-1">Generating a full backup (code, data, assets) is a platform-level feature. This ensures the integrity and security of your application's data. Please refer to the base44 platform documentation or contact support to initiate a full application backup.</p>
				</div>
				<button disabled class="neumorphic-button px-6 py-3 text-secondary font-medium flex items-center gap-2 opacity-50 cursor-not-allowed">Generate Backup</button>
			</div>
			<div class="neumorphic-inset p-4 mt-4 space-y-2 text-sm text-secondary">
				<p>A full backup typically includes:</p>
				<ul class="list-disc list-inside text-xs">
					<li>All application code (React components, pages, styles).</li>
					<li>All entity data (Customers, Quotes, Invoices, etc.) exported as JSON or CSV.</li>
					<li>A README file with instructions on how to restore or redeploy the application.</li>
				</ul>
			</div>
		</div>
		<div class="neumorphic-card p-6">
			<h3 class="text-lg font-semibold text-primary mb-4">Important Notes</h3>
			<div class="neumorphic-inset p-4 space-y-2 text-sm text-secondary">
				<p>• Keep your API keys and secrets secure and never share them publicly</p>
				<p>• Test your payment methods thoroughly before going live</p>
				<p>• Some payment methods may require additional configuration on their platforms</p>
				<p>• Cash payments are always available and don't require configuration</p>
			</div>
		</div>
	</div>
{/if}
