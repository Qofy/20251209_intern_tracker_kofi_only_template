// Settings Store - Replaces SettingsContext.jsx
import { writable, derived, get } from 'svelte/store';
import { openDB } from 'idb';

const SETTINGS_KEY = 'app_settings';

const DEFAULT_FEATURES = {
	multiUser: {
		enabled: true,
		label: 'Multi-user Accounts',
		description: 'Invite and manage multiple collaborators per tenant.',
		impact: 'Disabling limits access to a single administrative account.'
	},
	whiteLabelBranding: {
		enabled: true,
		label: 'White Label Branding',
		description: 'Allow tenants to customize colors, domains, and customer-facing branding.',
		impact: 'Disabling reverts all branding to QuoteFlow defaults.'
	},
	personalizedLogo: {
		enabled: true,
		label: 'Personalized Logo',
		description: 'Upload tenant-specific logos for documents and portals.',
		impact: 'Disabling hides all custom logo upload controls.'
	},
	invoices: {
		enabled: true,
		label: 'Invoices',
		description: 'Issue invoices with payment due dates, statuses, and exports.',
		impact: 'Disabling removes invoice creation and listing pages.'
	},
	invoiceTemplates: {
		enabled: true,
		label: 'Invoice Templates',
		description: 'Enable reusable invoice layouts for consistent branding.',
		impact: 'Disabling hides the template editor and selector.'
	},
	quotes: {
		enabled: true,
		label: 'Quotes',
		description: 'Prepare and share quotes with approvals and customer view links.',
		impact: 'Disabling removes quote management screens.'
	},
	products: {
		enabled: true,
		label: 'Products',
		description: 'Manage product catalogues for use in quotes and invoices.',
		impact: 'Disabling hides product listings and selectors.'
	},
	loadProducts: {
		enabled: true,
		label: 'Load Products',
		description: 'Allow syncing external catalogues into the product library.',
		impact: 'Disabling removes product import/update workflows.'
	},
	fahrrad: {
		enabled: true,
		label: 'Fahrrad Stories',
		description: 'Publish Fahrrad editorial experiences with linked merchandise.',
		impact: 'Disabling hides Fahrrad authoring and preview flows.'
	},
	blogs: {
		enabled: true,
		label: 'Blogs',
		description: 'Write and publish blog posts with featured media.',
		impact: 'Disabling removes all blogging interfaces.'
	},
	imageGallery: {
		enabled: true,
		label: 'Image Gallery',
		description: 'Host curated image galleries for marketing assets.',
		impact: 'Disabling hides gallery management and public displays.'
	},
	books: {
		enabled: true,
		label: 'Books',
		description: 'Manage and distribute digital books or catalogues.',
		impact: 'Disabling removes book listings and detail views.'
	},
	userManagement: {
		enabled: true,
		label: 'User Management',
		description: 'Admins can invite, suspend, and role-manage users.',
		impact: 'Disabling hides user list and invitation flows.'
	},
	localStorage: {
		enabled: true,
		label: 'Local Data Cache',
		description: 'Cache data locally (localStorage + IndexedDB) for instant access and offline availability.',
		impact: 'Disabling forces all reads to hit the server (slower, requires internet).'
	},
	indexedDb: {
		enabled: true,
		label: 'IndexedDB Storage',
		description: 'Persist structured datasets in IndexedDB for offline use.',
		impact: 'Disabling clears and prevents IndexedDB writes.'
	},
	aiChat: {
		enabled: true,
		label: 'AI Chat',
		description: 'Expose conversational AI assistants within the workspace.',
		impact: 'Disabling hides chat panels tied to AI providers.'
	},
	aiConnections: {
		enabled: true,
		label: 'AI Connections',
		description: 'Manage multi-provider AI credentials and routing.',
		impact: 'Disabling hides provider configuration sections.'
	},
	onlineSales: {
		enabled: true,
		label: 'Online Sales',
		description: 'Enable e-commerce checkout flows and external storefronts.',
		impact: 'Disabling removes checkout and sales widgets.'
	},
	syncQueue: {
		enabled: true,
		label: 'Offline Operations',
		description: 'Queue changes when offline for automatic retry.',
		impact: 'Disabling will fail operations immediately when offline.'
	},
	advancedValidation: {
		enabled: true,
		label: 'Advanced Validation',
		description: 'Show detailed field-level error messages from the server.',
		impact: 'Disabling will show generic error messages only.'
	}
};

const BASE_PERFORMANCE_DEFAULTS = {
	cacheMaxSize: 10 * 1024 * 1024, // 10MB
	syncRetryDelay: 5000, // 5 seconds
	enableLogging: true
};

function cloneDefaultFeatures() {
	const result = {};
	Object.entries(DEFAULT_FEATURES).forEach(([key, value]) => {
		result[key] = { ...value };
	});
	return result;
}

function createDefaultSettings() {
	return {
		features: cloneDefaultFeatures(),
		performance: { ...BASE_PERFORMANCE_DEFAULTS }
	};
}

function ensureFeatureDefinition(featureName, definition = {}) {
	const defaults = DEFAULT_FEATURES[featureName];
	if (!defaults) {
		return {
			enabled: definition.enabled ?? false,
			label: definition.label || featureName,
			description: definition.description || '',
			impact: definition.impact || ''
		};
	}
	return {
		...defaults,
		...definition,
		enabled: definition.enabled ?? defaults.enabled
	};
}

function mergeFeaturesWithDefaults(incoming = {}) {
	const merged = cloneDefaultFeatures();
	Object.entries(incoming).forEach(([key, value]) => {
		merged[key] = ensureFeatureDefinition(key, value);
	});
	return merged;
}

// Load settings from localStorage
function loadSettings() {
	if (typeof window === 'undefined') return createDefaultSettings();

	const base = createDefaultSettings();
	try {
		const stored = localStorage.getItem(SETTINGS_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return {
				...base,
				...parsed,
				features: mergeFeaturesWithDefaults(parsed.features),
				performance: { ...base.performance, ...(parsed.performance || {}) }
			};
		}
	} catch (error) {
		console.error('Error loading settings:', error);
	}
	return base;
}

// Create settings store
function createSettingsStore() {
	const { subscribe, set, update } = writable(loadSettings());

	// Save to localStorage on change
	if (typeof window !== 'undefined') {
		subscribe((value) => {
			try {
				localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
			} catch (error) {
				console.error('Error saving settings:', error);
			}
		});
	}

	return {
		subscribe,

		// Check if feature is enabled
		isFeatureEnabled: (featureName) => {
			if (!featureName) return false;
			const state = get({ subscribe });
			if (featureName in state.features) {
				return state.features[featureName]?.enabled ?? false;
			}
			return DEFAULT_FEATURES[featureName]?.enabled ?? false;
		},

		// Toggle feature
		toggleFeature: (featureName) => {
			update((prev) => {
				const current = prev.features[featureName];
				const currentValue = current?.enabled ?? DEFAULT_FEATURES[featureName]?.enabled ?? false;
				return {
					...prev,
					features: {
						...prev.features,
						[featureName]: ensureFeatureDefinition(featureName, {
							...current,
							enabled: !currentValue
						})
					}
				};
			});
		},

		// Update setting by path
		updateSetting: (path, value) => {
			update((prev) => {
				const newSettings = { ...prev };
				const keys = path.split('.');
				let current = newSettings;

				for (let i = 0; i < keys.length - 1; i++) {
					current[keys[i]] = { ...current[keys[i]] };
					current = current[keys[i]];
				}

				current[keys[keys.length - 1]] = value;
				return newSettings;
			});
		},

		// Reset to defaults
		resetToDefaults: () => {
			set(createDefaultSettings());
		},

		// Get cache size
		getCacheSize: () => {
			if (typeof window === 'undefined') return 0;
			try {
				let totalSize = 0;
				for (let key in localStorage) {
					if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
						totalSize += localStorage[key].length + key.length;
					}
				}
				return totalSize;
			} catch {
				return 0;
			}
		},

		// Clear cache
		clearCache: async () => {
			if (typeof window === 'undefined') return false;
			try {
				const keysToRemove = [];
				for (let key in localStorage) {
					if (
						key.startsWith('cache_') ||
						key.startsWith('alias_') ||
						key.startsWith('draft_') ||
						key === 'offline_queue' ||
						key === 'validation_errors' ||
						key === 'sync_state'
					) {
						keysToRemove.push(key);
					}
				}
				keysToRemove.forEach((key) => localStorage.removeItem(key));

				try {
					const db = await openDB('app-db', 3);

					if (db.objectStoreNames.contains('products')) {
						const tx1 = db.transaction('products', 'readwrite');
						await tx1.store.clear();
						await tx1.done;
					}

					if (db.objectStoreNames.contains('users')) {
						const tx2 = db.transaction('users', 'readwrite');
						await tx2.store.clear();
						await tx2.done;
					}

					db.close();
				} catch (idbError) {
					console.warn('IndexedDB clear failed (may not exist):', idbError);
				}

				window.dispatchEvent(new CustomEvent('cacheCleared'));
				window.dispatchEvent(new CustomEvent('syncStatus'));

				return true;
			} catch (error) {
				console.error('Error clearing cache:', error);
				return false;
			}
		},

		// Get pending queue size
		getPendingQueueSize: () => {
			if (typeof window === 'undefined') return 0;
			try {
				const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
				return queue.length;
			} catch {
				return 0;
			}
		}
	};
}

export const settings = createSettingsStore();

// Static check for feature enabled (without subscription)
export function isFeatureEnabledStatic(featureName) {
	if (typeof window === 'undefined' || !featureName) return false;
	try {
		const stored = localStorage.getItem(SETTINGS_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			const feature = parsed.features?.[featureName];
			if (typeof feature?.enabled === 'boolean') {
				return feature.enabled;
			}
		}
	} catch {
		// Ignore and fall back to defaults
	}
	return DEFAULT_FEATURES[featureName]?.enabled ?? false;
}
